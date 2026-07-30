'use client';
import { Wrench, Edit3, Trash2, Sparkles, X, CheckCircle2, AlertCircle, ToggleRight, ToggleLeft, Plus, Search, MoreHorizontal } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';

interface Service {
  id: string;
  company_id: string;
  nome: string;
  descricao: string;
  preco_padrao: number;
  ativo: boolean;
  created_at: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Estados do formulário (Modal lateral / Drawer)
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoPadrao, setPrecoPadrao] = useState('0.00');
  const [ativo, setAtivo] = useState(true);

  // Estados de submissão/feedback
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('nome');

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar serviços:', err);
      setErrorMsg(err.message || 'Falha ao carregar catálogo de serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenCreate = () => {
    setEditingService(null);
    setNome('');
    setDescricao('');
    setPrecoPadrao('0.00');
    setAtivo(true);
    setFormError('');
    setFormSuccess(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setNome(service.nome);
    setDescricao(service.descricao || '');
    setPrecoPadrao(Number(service.preco_padrao || 0).toFixed(2));
    setAtivo(service.ativo);
    setFormError('');
    setFormSuccess(false);
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      if (!nome.trim()) throw new Error('O nome do serviço é obrigatório.');
      const preco = parseFloat(precoPadrao);
      if (isNaN(preco) || preco < 0) throw new Error('O preço padrão deve ser um número maior ou igual a zero.');

      // Obtém empresa do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Tenant / Empresa não encontrada para este perfil.');

      const serviceData = {
        company_id: profile.company_id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        preco_padrao: preco,
        ativo
      };

      if (editingService) {
        // Atualiza serviço
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
      } else {
        // Insere novo serviço
        const { error } = await supabase
          .from('services')
          .insert(serviceData);

        if (error) throw error;
      }

      setFormSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        fetchServices();
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err);
      setFormError(err.message || 'Erro ao persistir informações do serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAtivo = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ ativo: !service.ativo })
        .eq('id', service.id);

      if (error) throw error;

      // Atualiza localmente
      setServices(services.map(s => s.id === service.id ? { ...s, ativo: !s.ativo } : s));
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do serviço.');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir permanentemente este serviço do catálogo? Se houver O.S. vinculada a ele, a exclusão falhará por integridade referencial.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setServices(services.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar serviço:', err);
      alert('Não foi possível excluir o serviço. Ele pode estar vinculado a ordens de serviço existentes. Considere inativá-lo.');
    }
  };

  // Filtragem e busca de serviços
  const filteredServices = services.filter(s => {
    const matchesSearch = 
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.descricao && s.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'ativos') return matchesSearch && s.ativo;
    if (activeTab === 'inativos') return matchesSearch && !s.ativo;
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text flex items-center gap-2.5">
            <Wrench className="w-8 h-8 text-blue-500" /> Catálogo de Serviços
          </h1>
          <p className="text-small text-text-muted mt-1">Gerencie a lista de serviços oferecidos na sua assistência técnica.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Cadastrar Serviço
        </button>
      </div>

      {/* Busca e Abas de Filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Input de Busca */}
        <div className="relative w-full md:max-w-md bg-surface-raised p-1 rounded-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
          <input
            type="text"
            placeholder="Buscar por serviço ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-11 pr-4 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Abas */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-border self-start">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'todos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-text-muted hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveTab('ativos')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ativos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-text-muted hover:text-slate-200'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setActiveTab('inativos')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inativos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-text-muted hover:text-slate-200'
            }`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-raised border border-border rounded-2xl">
          <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-sm text-text-muted">Carregando catálogo de serviços...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center max-w-xl mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-h3 text-text">Erro ao carregar dados</h3>
          <p className="text-sm text-text-muted">{errorMsg}</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-surface-raised border border-border rounded-2xl">
          <EmptyState
            icon={<Wrench />}
            title="Nenhum serviço encontrado"
            description={searchTerm ? 'Nenhum resultado corresponde à sua busca.' : 'Cadastre serviços padrão para iniciar o catálogo.'}
          />
        </div>
      ) : (
        <div className="bg-surface-raised border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted font-semibold text-xs uppercase tracking-wider bg-surface-overlay">
                  <th className="py-4 px-6">Serviço</th>
                  <th className="py-4 px-6">Descrição</th>
                  <th className="py-4 px-6 text-right">Preço Padrão</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full backdrop-blur-md border border-white/5 shrink-0 ${service.ativo ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-850 text-text-subtle'}`}>
                          <Wrench className="w-4 h-4" />
                        </div>
                        <span className={service.ativo ? '' : 'text-text-subtle'}>{service.nome}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-text-muted max-w-xs truncate">
                      {service.descricao || '—'}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-slate-200">
                      R$ {Number(service.preco_padrao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleAtivo(service)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          service.ativo 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-surface-sunken border-border text-text-subtle hover:border-border'
                        }`}
                        title={service.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                      >
                        {service.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center relative">
                      <button
                        type="button"
                        aria-label={`Ações do serviço ${service.nome}`}
                        aria-expanded={activeDropdownId === service.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === service.id ? null : service.id);
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeDropdownId === service.id && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-44 bg-surface-raised border border-border rounded-xl shadow-xl z-50 p-1.5 text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              handleOpenEdit(service);
                            }}
                            className="w-full text-left px-3 py-2 text-small font-medium text-text hover:bg-surface-sunken hover:text-brand rounded-lg transition-colors cursor-pointer"
                          >
                            Editar Serviço
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              handleDeleteService(service.id);
                            }}
                            className="w-full text-left px-3 py-2 text-small font-medium text-danger hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            Excluir Serviço
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer Lateral (Slide-over) para Cadastro / Edição */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay escuro */}
          <div 
            className="absolute inset-0 bg-surface-sunken/80 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-border shadow-2xl relative flex flex-col transition-all duration-300 transform translate-x-0 animate-slideOver">
              {/* Header do Drawer */}
              <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 rounded-xl text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-h3 text-text">
                      {editingService ? 'Editar Serviço' : 'Cadastrar Serviço'}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {editingService ? 'Modifique os detalhes do serviço.' : 'Defina os detalhes do serviço padrão.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-text-muted hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo / Form do Drawer */}
              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-6 space-y-5 flex-1">
                  {formSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="font-semibold text-sm">
                        Serviço salvo com sucesso!
                      </p>
                    </div>
                  )}

                  {formError && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 flex items-center gap-2.5 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="font-semibold">{formError}</p>
                    </div>
                  )}

                  {/* Nome do Serviço */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Formatação de PC e Backup"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2.5 px-3 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                      disabled={submitting || formSuccess}
                    />
                  </div>

                  {/* Preço Padrão */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Preço Padrão (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 150.00"
                      value={precoPadrao}
                      onChange={(e) => setPrecoPadrao(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2.5 px-3 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                      required
                      disabled={submitting || formSuccess}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Descrição do Serviço
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descreva as etapas inclusas neste serviço padrão..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2.5 px-3 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      disabled={submitting || formSuccess}
                    />
                  </div>

                  {/* Status Ativo/Inativo */}
                  <div className="flex items-center justify-between p-4 bg-surface-sunken/40 border border-border rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Status do Cadastro
                      </p>
                      <p className="text-[10px] text-text-subtle">
                        Inativo impede a seleção em novas Ordens de Serviço.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAtivo(!ativo)}
                      disabled={submitting || formSuccess}
                      className="text-text-muted hover:text-white transition-colors cursor-pointer"
                    >
                      {ativo ? (
                        <ToggleRight className="w-10 h-10 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-700" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer do Drawer */}
                <div className="px-6 py-4 border-t border-border bg-surface-sunken/20 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-border hover:bg-slate-800 rounded-xl text-xs font-semibold text-text hover:text-white transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || formSuccess}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-55"
                  >
                    {submitting ? (
                      <LoadingSpinner className="w-4 h-4 animate-spin" />
                    ) : (
                      'Salvar Serviço'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
