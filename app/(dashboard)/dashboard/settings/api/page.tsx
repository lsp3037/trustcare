'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Plus, Copy, Check, AlertTriangle, ShieldAlert, Clock, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/lib/context/UserContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button, Badge, useConfirm } from '@/components/ui';

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ApiKeysSettingsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { role, loading: userLoading } = useUser();

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal de criação
  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(true);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/settings/api-keys');
      if (!res.ok) {
        throw new Error('Falha ao carregar chaves de API.');
      }
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar chaves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && role === 'admin') {
      fetchKeys();
    }
  }, [userLoading, role]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setCreating(true);
      setErrorMsg('');
      const scopes: string[] = [];
      if (canRead) scopes.push('orders:read');
      if (canWrite) scopes.push('orders:write');

      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar chave.');
      }

      setGeneratedKey(data.rawKey);
      fetchKeys();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar chave de API.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Revogar Chave de API',
      description: `Tem certeza que deseja revogar a chave "${name}"? Todas as integrações externas que a utilizam perderão o acesso imediatamente. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Revogar Chave',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao revogar chave.');
      }
      fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Erro ao revogar chave.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (userLoading || (loading && keys.length === 0)) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-text-muted text-sm mb-1">
            <Link href="/dashboard/settings/profile" className="hover:text-text flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Configurações
            </Link>
            <span>/</span>
            <span className="text-text font-medium">Chaves de API</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <Key className="w-6 h-6 text-brand-primary" /> Chaves de API (v1)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Gerencie credenciais para integrar seu ERP ou sistemas externos com a API REST da TrustCare.
          </p>
        </div>

        <Button
          onClick={() => {
            setNewKeyName('');
            setGeneratedKey(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Chave de API
        </Button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-center gap-3 text-status-danger text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Docs Quick Reference */}
      <div className="p-5 rounded-2xl bg-surface-raised/40 border border-glass-divider space-y-3">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Key className="w-4 h-4 text-brand-primary" /> Como utilizar a API v1
        </h2>
        <p className="text-xs text-text-muted leading-relaxed">
          Envie o cabeçalho <code className="px-1.5 py-0.5 rounded bg-surface border border-glass-divider font-mono text-brand-primary">x-api-key: tc_live_...</code> em todas as requisições para os endpoints sob <code className="px-1.5 py-0.5 rounded bg-surface border border-glass-divider font-mono">/api/v1/orders</code>.
        </p>
      </div>

      {/* Lista de Chaves */}
      <div className="bg-surface-raised rounded-2xl border border-glass-divider shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-glass-divider">
          <h2 className="font-semibold text-text">Chaves de Acesso Cadastradas</h2>
        </div>

        {keys.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <ShieldAlert className="w-10 h-10 mx-auto text-text-muted/40" />
            <p className="text-sm">Nenhuma chave de API gerada até o momento.</p>
            <p className="text-xs">Crie uma chave para permitir integrações externas com suas Ordens de Serviço.</p>
          </div>
        ) : (
          <div className="divide-y divide-glass-divider overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-raised/70 text-xs text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Nome / Identificador</th>
                  <th className="px-6 py-3 font-medium">Prefixo</th>
                  <th className="px-6 py-3 font-medium">Escopos</th>
                  <th className="px-6 py-3 font-medium">Criada em</th>
                  <th className="px-6 py-3 font-medium">Último Uso</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-divider">
                {keys.map((k) => {
                  const isRevoked = !!k.revoked_at;
                  return (
                    <tr key={k.id} className="hover:bg-surface-raised/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-text">{k.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-text-muted">{k.prefix}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-glass-divider text-text-muted">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {new Date(k.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        {k.last_used_at ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-text-muted/60" />
                            {new Date(k.last_used_at).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          'Nunca utilizada'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isRevoked ? (
                          <Badge tone="danger">Revogada</Badge>
                        ) : (
                          <Badge tone="success">Ativa</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isRevoked && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevokeKey(k.id, k.name)}
                            className="flex items-center gap-1 ml-auto text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Revogar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface-raised rounded-2xl border border-glass-divider shadow-xl overflow-hidden p-6 space-y-5">
            {!generatedKey ? (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Gerar Nova Chave de API</h3>
                    <p className="text-xs text-text-muted">Defina uma identificação amigável e permissões de acesso.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text">Identificação da Chave</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Ex: Integração ERP Totvs, Sistema Legado..."
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-glass-divider text-text text-sm focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text">Permissões (Escopos)</label>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2.5 text-xs text-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canRead}
                        onChange={(e) => setCanRead(e.target.checked)}
                        className="rounded border-glass-divider text-brand-primary focus:ring-0"
                      />
                      <span>Consultar Ordens de Serviço (<code className="font-mono text-text-muted">orders:read</code>)</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={canWrite}
                        onChange={(e) => setCanWrite(e.target.checked)}
                        className="rounded border-glass-divider text-brand-primary focus:ring-0"
                      />
                      <span>Emitir Novas Ordens de Serviço (<code className="font-mono text-text-muted">orders:write</code>)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-glass-divider">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating || (!canRead && !canWrite)}>
                    {creating ? 'Gerando...' : 'Gerar Chave'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Chave Gerada com Sucesso</h3>
                    <p className="text-xs text-text-muted">Copie a chave abaixo imediatamente.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-status-warning/10 border border-status-warning/20 text-status-warning text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Guarde esta chave em local seguro!
                  </p>
                  <p>
                    Por motivos de segurança, nós armazenamos apenas o hash SHA-256 e esta chave em texto puro <strong>nunca mais será exibida</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text">Sua Chave de API</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedKey}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-glass-divider text-text font-mono text-xs select-all focus:outline-none"
                    />
                    <Button
                      type="button"
                      onClick={() => copyToClipboard(generatedKey)}
                      className="flex items-center gap-1.5 flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                </div>

                <div className="pt-3 border-t border-glass-divider flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setGeneratedKey(null);
                      setModalOpen(false);
                    }}
                  >
                    Concluído
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
