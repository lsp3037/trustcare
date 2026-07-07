'use client';
import { Wrench, Edit3, Trash2, Sparkles, X, CheckCircle2, AlertCircle, ToggleRight, ToggleLeft, Plus, Search } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-8 h-8 text-blue-500" /> Catálogo de Serviços
          </h1>
          <p className="text-slate-400 mt-1">Gerencie a lista de serviços oferecidos na sua assistência técnica.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Cadastrar Serviço
        </button>
      </div>

      {/* Busca e Abas de Filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Input de Busca */}
        <div className="relative w-full md:max-w-md bg-slate-900/40 p-1 rounded-none">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por serviço ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Abas */}
        <div className="flex bg-slate-900/60 p-1 rounded-none border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-1.5 rounded-none text-xs font-bold transition-all ${
              activeTab === 'todos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveTab('ativos')}
            className={`px-4 py-1.5 rounded-none text-xs font-bold transition-all ${
              activeTab === 'ativos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setActiveTab('inativos')}
            className={`px-4 py-1.5 rounded-none text-xs font-bold transition-all ${
              activeTab === 'inativos' 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900">
          <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400">Carregando catálogo de serviços...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-none text-center max-w-xl mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-550 mx-auto" />
          <h3 className="font-bold text-white text-lg">Erro ao carregar dados</h3>
          <p className="text-sm text-slate-400">{errorMsg}</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900 text-center px-4">
          <Wrench className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-350">Nenhum serviço encontrado</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            {searchTerm ? 'Nenhum resultado corresponde à sua busca.' : 'Cadastre serviços padrão para iniciar o catálogo.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-950/45">
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
                        <div className={`p-1.5 rounded-none shrink-0 ${service.ativo ? 'bg-blue-500/10 text-blue-450' : 'bg-slate-850 text-slate-500'}`}>
                          <Wrench className="w-4 h-4" />
                        </div>
                        <span className={service.ativo ? '' : 'text-slate-500'}>{service.nome}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400 max-w-xs truncate">
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
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450 hover:bg-emerald-500/20' 
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-800'
                        }`}
                        title={service.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                      >
                        {service.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(service)}
                          className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 p-1.5 rounded-none transition-colors cursor-pointer"
                          title="Editar serviço"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 p-1.5 rounded-none transition-colors cursor-pointer"
                          title="Excluir serviço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl relative flex flex-col transition-all duration-300 transform translate-x-0 animate-slideOver">
              {/* Header do Drawer */}
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 rounded-none text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {editingService ? 'Editar Serviço' : 'Cadastrar Serviço'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {editingService ? 'Modifique os detalhes do serviço.' : 'Defina os detalhes do serviço padrão.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-none transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo / Form do Drawer */}
              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-6 space-y-5 flex-1">
                  {formSuccess && (
                    <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="font-semibold text-sm">
                        Serviço salvo com sucesso!
                      </p>
                    </div>
                  )}

                  {formError && (
                    <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center gap-2.5 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="font-semibold">{formError}</p>
                    </div>
                  )}

                  {/* Nome do Serviço */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Nome do Serviço
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Formatação de PC e Backup"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                      disabled={submitting || formSuccess}
                    />
                  </div>

                  {/* Preço Padrão */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Preço Padrão (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 150.00"
                      value={precoPadrao}
                      onChange={(e) => setPrecoPadrao(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                      required
                      disabled={submitting || formSuccess}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Descrição do Serviço
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Descreva as etapas inclusas neste serviço padrão..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      disabled={submitting || formSuccess}
                    />
                  </div>

                  {/* Status Ativo/Inativo */}
                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-none">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Status do Cadastro
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Inativo impede a seleção em novas Ordens de Serviço.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAtivo(!ativo)}
                      disabled={submitting || formSuccess}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/20 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-none text-xs font-semibold text-slate-350 hover:text-white transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || formSuccess}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-none text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-55"
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
