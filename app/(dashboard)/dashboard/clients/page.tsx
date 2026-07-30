'use client';
import { QrCode, Building, User, FileText, Phone, Mail, Laptop, Trash2, FolderPlus, MoreHorizontal, Users, Plus, CheckCircle2, Search, AlertCircle, X } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button, Badge, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/context/UserContext';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { formatDocument, validateDocument } from '@/lib/utils/documentValidation';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, role, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  
  // Estados para formulário de Novo Cliente
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('PF');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Estados adicionais para fluxo de Equipamento integrado
  const [createdClient, setCreatedClient] = useState<any | null>(null);
  const [addedEquipments, setAddedEquipments] = useState<any[]>([]);
  const [eqName, setEqName] = useState('');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [addingEq, setAddingEq] = useState(false);
  const [eqError, setEqError] = useState('');
  const [eqSuccess, setEqSuccess] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      const processed = (data || []).map((c: any, index: number) => ({
        ...c,
        client_number: c.client_number || (1001 + index)
      }));
      setClients(processed);
    } catch (err) {
      console.warn('Erro ao carregar clientes do Supabase, usando fallback local:', err);
      loadLocalClients();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalClients = () => {
    const localClients = localStorage.getItem('mock-clients');
    if (localClients) {
      const parsed = JSON.parse(localClients);
      const processed = parsed.map((c: any, index: number) => ({
        ...c,
        client_number: c.client_number || (1001 + index)
      }));
      setClients(processed);
    } else {
      const initialMock = [
        { id: 'c1', client_number: 1001, type: 'PJ', name: 'Tech Solutions Ltda', document: '12.345.678/0001-90', phone: '(11) 98765-4321', email: 'contato@techsolutions.com' },
        { id: 'c2', client_number: 1002, type: 'PF', name: 'Carlos Henrique Souza', document: '123.456.789-00', phone: '(21) 99999-8888', email: 'carlos.souza@gmail.com' },
        { id: 'c3', client_number: 1003, type: 'PJ', name: 'Clínica Sorriso Perfeito', document: '98.765.432/0001-21', phone: '(11) 5555-4444', email: 'financeiro@sorrisoperfeito.com.br' },
        { id: 'c4', client_number: 1004, type: 'PF', name: 'Juliana Mendes', document: '987.654.321-11', phone: '(31) 98888-7777', email: 'juliana.mendes@outlook.com' },
      ];
      localStorage.setItem('mock-clients', JSON.stringify(initialMock));
      setClients(initialMock);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (document && !validateDocument(document)) {
      setFormError('CPF ou CNPJ inválido. Por favor, verifique os dígitos.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          companyId = profile.company_id;
        }
      }

      const newClientData = {
        company_id: companyId,
        type,
        name,
        document,
        phone,
        email,
      };

      const { data: insertedClient, error } = await supabase
        .from('clients')
        .insert(newClientData)
        .select()
        .single();

      let finalClient = insertedClient;

      if (error) {
        console.warn('Falha Supabase, salvando mock local:', error.message);
        
        // Salva mock com número sequencial
        const currentMock = [...clients];
        const nextNumber = Math.max(...currentMock.map(c => c.client_number || 1000), 1000) + 1;
        const mockId = `mock-client-${Date.now()}`;
        finalClient = {
          id: mockId,
          client_number: nextNumber,
          ...newClientData
        };
        currentMock.push(finalClient);
        localStorage.setItem('mock-clients', JSON.stringify(currentMock));
      }

      setCreatedClient(finalClient);
      setFormSuccess(true);
      fetchClients();

    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdClient) return;

    setAddingEq(true);
    setEqError('');
    setEqSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
        if (profile?.company_id) companyId = profile.company_id;
      }

      const newEq = {
        company_id: companyId,
        client_id: createdClient.id,
        name: eqName,
        brand: eqBrand,
        model: eqModel,
        serial_number: eqSerial,
      };

      const { data: insertedEq, error } = await supabase
        .from('client_equipments')
        .insert(newEq)
        .select()
        .single();

      let finalEq = insertedEq;

      if (error) {
        console.warn('Falha Supabase, inserindo equipamento mock local:', error.message);
        
        const mockEqs = localStorage.getItem('mock-equipments');
        const allEqs = mockEqs ? JSON.parse(mockEqs) : [
          { id: 'eq1', client_id: 'c1', name: 'Notebook Dell Latitude 3420', brand: 'Dell', model: 'Latitude 3420', serial_number: 'PE091728' },
          { id: 'eq2', client_id: 'c2', name: 'Desktop Gamer Custom', brand: 'Custom', model: 'Custom Intel i7', serial_number: 'N/A' },
          { id: 'eq3', client_id: 'c3', name: 'Servidor HP ProLiant DL360 Gen10', brand: 'HP', model: 'ProLiant DL360 Gen10', serial_number: 'SGH817A29B' },
          { id: 'eq4', client_id: 'c4', name: 'MacBook Air M1', brand: 'Apple', model: 'MacBook Air M1 2020', serial_number: 'FVFDR899Q6L5' },
        ];
        
        finalEq = {
          id: `mock-eq-${Date.now()}`,
          ...newEq
        };
        allEqs.push(finalEq);
        localStorage.setItem('mock-equipments', JSON.stringify(allEqs));
      }

      setAddedEquipments((prev) => [...prev, finalEq || newEq]);
      setEqSuccess(true);
      setEqName('');
      setEqBrand('');
      setEqModel('');
      setEqSerial('');
      
      setTimeout(() => {
        setEqSuccess(false);
      }, 3000);

    } catch (err: any) {
      setEqError(err.message || 'Erro ao adicionar equipamento.');
    } finally {
      setAddingEq(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreating(false);
    setCreatedClient(null);
    setAddedEquipments([]);
    setName('');
    setDocument('');
    setPhone('');
    setEmail('');
    setType('PF');
    setFormSuccess(false);
    setFormError('');
    setEqName('');
    setEqBrand('');
    setEqModel('');
    setEqSerial('');
    setEqSuccess(false);
    setEqError('');
    fetchClients();
  };

  const handleDeleteClient = async (id: string) => {
    const confirmDelete = window.confirm('Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      alert('Cliente excluído com sucesso!');
    } catch (err: any) {
      if (err.code === '23503' || err.message?.includes('foreign key constraint') || err.message?.includes('violates foreign key')) {
        alert('Não é possível excluir este cliente porque ele possui histórico de Ordens de Serviço vinculadas.');
        return;
      }

      console.warn('Erro ao excluir cliente no Supabase, tentando excluir localmente:', err.message);
      
      const localClients = localStorage.getItem('mock-clients');
      if (localClients) {
        const parsed = JSON.parse(localClients);
        const filtered = parsed.filter((c: any) => c.id !== id);
        localStorage.setItem('mock-clients', JSON.stringify(filtered));
        setClients(prev => prev.filter(c => c.id !== id));
        alert('Cliente excluído com sucesso (local)!');
      } else {
        alert(`Erro ao excluir cliente: ${err.message || 'Erro desconhecido'}`);
      }
    }
  };

  const filteredClients = clients.filter((client) => {
    return (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.document && client.document.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text flex items-center gap-2.5">
            <Users className="w-8 h-8 text-blue-500" /> Clientes
          </h1>
          <p className="text-small text-text-muted mt-1">Gerencie a base de contatos e clientes da sua empresa.</p>
        </div>
        {!isCreating && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsCreating(true)}>
            Novo Cliente
          </Button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-surface-raised border border-border shadow-sm rounded-xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-h2 text-text">Adicionar Novo Cliente</h2>
              <p className="text-xs text-text-muted mt-0.5">Cadastre uma pessoa física ou jurídica.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCloseModal}>
              Cancelar
            </Button>
          </div>

          <form onSubmit={handleCreateClient} className="space-y-5">
            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Cliente cadastrado com sucesso!</p>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input
                      type="radio"
                      name="client-type"
                      checked={type === 'PF'}
                      onChange={() => setType('PF')}
                      disabled={submitting || createdClient !== null}
                      className="accent-blue-500 h-4 w-4 bg-surface-sunken border border-border disabled:opacity-50"
                    />
                    Pessoa Física (PF)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input
                      type="radio"
                      name="client-type"
                      checked={type === 'PJ'}
                      onChange={() => setType('PJ')}
                      disabled={submitting || createdClient !== null}
                      className="accent-blue-500 h-4 w-4 bg-surface-sunken border border-border disabled:opacity-50"
                    />
                    Pessoa Jurídica (PJ)
                  </label>
                </div>
              </div>

              {/* Documento (CPF/CNPJ) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  {type === 'PF' ? 'CPF' : 'CNPJ'}
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                  <input
                    type="text"
                    placeholder={type === 'PF' ? 'Ex: 123.456.789-00' : 'Ex: 12.345.678/0001-90'}
                    value={document}
                    onChange={(e) => setDocument(formatDocument(e.target.value))}
                    maxLength={18}
                    disabled={submitting || createdClient !== null}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Nome / Razão Social */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {type === 'PF' ? 'Nome Completo' : 'Razão Social'}
              </label>
              <div className="relative">
                {type === 'PF' ? (
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                ) : (
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                )}
                <input
                  type="text"
                  placeholder={type === 'PF' ? 'Ex: Carlos Henrique de Souza' : 'Ex: Tech Solutions Ltda'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting || createdClient !== null}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting || createdClient !== null}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                  <input
                    type="email"
                    placeholder="Ex: cliente@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || createdClient !== null}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Ações */}
            {!createdClient && (
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="submit" loading={submitting} disabled={formSuccess}>
                  Salvar Cliente
                </Button>
              </div>
            )}
          </form>

          {/* Seção de Equipamentos (exibida após o cliente ser salvo com sucesso) */}
          {createdClient && (
            <div className="mt-8 pt-8 border-t border-border space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 text-text flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-400" /> Equipamentos do Cliente
                </h3>
                <Badge tone="info">
                  {addedEquipments.length} {addedEquipments.length === 1 ? 'equipamento adicionado' : 'equipamentos adicionados'}
                </Badge>
              </div>

              {/* Lista de equipamentos adicionados na sessão */}
              {addedEquipments.length > 0 && (
                <div className="bg-surface-overlay rounded-xl border border-border/80 overflow-hidden shadow-md">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-text-muted font-semibold uppercase tracking-wider bg-surface-sunken/30">
                        <th className="py-2.5 px-3">Equipamento</th>
                        <th className="py-2.5 px-3">Marca</th>
                        <th className="py-2.5 px-3">Modelo</th>
                        <th className="py-2.5 px-3 text-right">Serial</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {addedEquipments.map((eq, idx) => (
                        <tr key={eq.id || idx} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{eq.name}</td>
                          <td className="py-2.5 px-3 text-text-muted">{eq.brand || '—'}</td>
                          <td className="py-2.5 px-3 text-text-muted">{eq.model || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-text">{eq.serial_number || '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-auto py-1 px-2 text-[10px]"
                              icon={<Plus className="w-3 h-3" />}
                              onClick={() => {
                                setIsCreating(false);
                                router.push(`/dashboard/orders?new=true&client_id=${createdClient?.id}&equipment_id=${eq.id}`);
                              }}
                            >
                              Abrir O.S.
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formulário de novo equipamento */}
              <form onSubmit={handleCreateEquipment} className="space-y-4 bg-surface-overlay p-5 rounded-xl border border-border/80">
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">Novo Equipamento</h4>

                {eqSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Equipamento adicionado com sucesso!
                  </div>
                )}
                {eqError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                    {eqError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Identificação / Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Notebook do Cliente"
                      value={eqName}
                      onChange={(e) => setEqName(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Marca</label>
                    <input
                      type="text"
                      placeholder="Ex: Lenovo"
                      value={eqBrand}
                      onChange={(e) => setEqBrand(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Modelo</label>
                    <input
                      type="text"
                      placeholder="Ex: ThinkPad E14"
                      value={eqModel}
                      onChange={(e) => setEqModel(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Nº de Série / Tag</label>
                    <div className="relative">
                      <QrCode className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" />
                      <input
                        type="text"
                        placeholder="Ex: PF1A2B3C"
                        value={eqSerial}
                        onChange={(e) => setEqSerial(e.target.value)}
                        className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-3 pr-10 text-xs text-text focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    loading={addingEq}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Adicionar Equipamento
                  </Button>
                </div>
              </form>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={handleCloseModal}>
                  Concluir Cadastro
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    const lastEqId = addedEquipments.length > 0 ? addedEquipments[addedEquipments.length - 1].id : '';
                    setIsCreating(false);
                    router.push(`/dashboard/orders?new=true&client_id=${createdClient?.id}${lastEqId ? `&equipment_id=${lastEqId}` : ''}`);
                  }}
                >
                  Concluir e Criar O.S.
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Campo de Busca */}
          <div className="relative w-full md:max-w-md bg-surface-raised p-1 rounded-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-11 pr-4 text-sm text-text placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Listagem de Clientes */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-raised border border-border rounded-2xl">
              <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-text-muted">Carregando clientes...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-surface-raised border border-border rounded-2xl">
              <EmptyState
                icon={<AlertCircle />}
                title="Nenhum cliente encontrado"
                description="Tente ajustar seus termos de pesquisa."
              />
            </div>
          ) : (
            <div className="bg-surface-raised border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-semibold text-xs uppercase tracking-wider bg-surface-overlay">
                      <th className="py-4 px-6 text-center">ID</th>
                      <th className="py-4 px-6">Nome</th>
                      <th className="py-4 px-6">Tipo</th>
                      <th className="py-4 px-6">Documento</th>
                      <th className="py-4 px-6">Contato</th>
                      <th className="py-4 px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 text-center font-semibold text-text-muted text-xs font-mono">
                          #{client.client_number || client.id.toString().slice(0, 4)}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-200">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full backdrop-blur-md border border-white/5 shrink-0 ${client.type === 'PJ' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {client.type === 'PJ' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <Link href={`/dashboard/clients/${client.id}`} className="truncate max-w-[200px] md:max-w-xs hover:text-blue-400 hover:underline transition-colors">
                              {client.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge tone={client.type === 'PJ' ? 'brand' : 'info'} className="tracking-wide">
                            {client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-text font-mono text-xs">{client.document || '—'}</td>
                        <td className="py-4 px-6 space-y-1 text-text-muted text-xs">
                          {client.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-text-subtle" />
                              <span>{client.phone}</span>
                              <WhatsAppButton 
                                phone={client.phone} 
                                className="p-1.5 rounded-full backdrop-blur-md border border-white/5 shrink-0 bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                              />
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-text-subtle" />
                              <span className="hover:text-blue-400 cursor-pointer">{client.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center relative">
                          <button
                            type="button"
                            aria-label={`Ações do cliente ${client.name}`}
                            aria-expanded={activeDropdownId === client.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === client.id ? null : client.id);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeDropdownId === client.id && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-44 bg-surface-raised border border-border rounded-xl shadow-xl z-50 p-1.5 text-left">
                              <Link
                                href={`/dashboard/clients/${client.id}`}
                                className="block w-full text-left px-3 py-2 text-small font-medium text-text hover:bg-surface-sunken hover:text-brand rounded-lg transition-colors cursor-pointer"
                              >
                                Ver Detalhes
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(null);
                                  handleDeleteClient(client.id);
                                }}
                                className="w-full text-left px-3 py-2 text-small font-medium text-danger hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                Excluir Cliente
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
        </>
      )}
    </div>
  );
}
