'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Plus, 
  Wrench, 
  Phone, 
  DollarSign, 
  AlertCircle, 
  Trash2, 
  Building, 
  User, 
  X, 
  ArrowRight,
  Info,
  Check,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import { Button, buttonClasses } from '@/components/ui';

interface Lead {
  id: string;
  company_id?: string;
  name: string;
  phone: string;
  equipment_info: string;
  problem_description?: string;
  origem: 'WhatsApp' | 'Instagram Ads' | 'Indicação' | 'Telefone' | 'Outro';
  status: 'Novo Contato' | 'Em Negociação' | 'Aguardando Equipamento' | 'Ganho/Convertido' | 'Perdido';
  valor_estimado: number;
  motivo_perda?: string;
  created_at: string;
  updated_at?: string;
}

interface Client {
  id: string;
  client_number: number;
  type: string;
  name: string;
  document: string;
  phone: string;
  email: string;
}

const COLUMNS = [
  { id: 'Novo Contato', title: 'Novo Contato', headerColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'Em Negociação', title: 'Em Negociação', headerColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'Aguardando Equipamento', title: 'Aguardando Equipamento', headerColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'Ganho/Convertido', title: 'Ganho/Convertido', headerColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Perdido', title: 'Perdido', headerColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
] as const;

export default function LeadsFunnelPage() {
  const router = useRouter();
  const { company } = useCompany();
  
  // State variables
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Modal control states
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [leadToLoseId, setLeadToLoseId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState('');
  
  // Duplicate client check states
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Form states
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [equipamentoInteresse, setEquipamentoInteresse] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [origem, setOrigem] = useState<'WhatsApp' | 'Instagram Ads' | 'Indicação' | 'Telefone' | 'Outro'>('WhatsApp');
  const [valorEstimado, setValorEstimado] = useState('0.00');
  const [statusFunil, setStatusFunil] = useState<Lead['status']>('Novo Contato');

  const fetchLeads = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data as Lead[] || []);
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchLeads();
    }
  }, [company?.id]);


  // Drag & Drop native handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: Lead['status']) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetColumn) return;

    // Handle Loss transition
    if (targetColumn === 'Perdido') {
      setLeadToLoseId(leadId);
      setLossReason('');
      setShowLossReasonModal(true);
      return;
    }

    // Default status transition
    updateLeadStatus(leadId, targetColumn);
  };

  const updateLeadStatus = async (leadId: string, newStatus: Lead['status'], motivoPerda?: string) => {
    // Optimistic UI update
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          status: newStatus,
          motivo_perda: newStatus === 'Perdido' ? motivoPerda : undefined,
          updated_at: new Date().toISOString()
        };
      }
      return l;
    });
    setLeads(updated);
    
    // Update active details modal if open
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        status: newStatus,
        motivo_perda: newStatus === 'Perdido' ? motivoPerda : undefined
      });
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          motivo_perda: newStatus === 'Perdido' ? motivoPerda : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao atualizar status do lead:', err);
      alert(`Não foi possível atualizar o lead: ${(err as Error).message}`);
      fetchLeads();
    }
  };

  // Submit loss reason
  const handleLossReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadToLoseId || !lossReason.trim()) return;

    updateLeadStatus(leadToLoseId, 'Perdido', lossReason.trim());
    setShowLossReasonModal(false);
    setLeadToLoseId(null);
    setLossReason('');
  };

  // Add Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim()) return;

    const newLeadData = {
      company_id: company?.id,
      name: nomeCliente.trim(),
      phone: telefone.trim(),
      equipment_info: equipamentoInteresse.trim(),
      problem_description: problemDescription.trim(),
      origem,
      status: statusFunil,
      valor_estimado: parseFloat(valorEstimado) || 0.00
    };

    try {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase
        .from('leads')
        .insert(newLeadData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setLeads([data as Lead, ...leads]);
        setIsCreating(false);
        resetForm();
      }
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      alert(`Não foi possível salvar o lead: ${(err as Error).message}`);
    }
  };

  // Edit Lead
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !nomeCliente.trim()) return;

    const updateData = {
      name: nomeCliente.trim(),
      phone: telefone.trim(),
      equipment_info: equipamentoInteresse.trim(),
      problem_description: problemDescription.trim(),
      origem,
      valor_estimado: parseFloat(valorEstimado) || 0.00,
      status: statusFunil,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) throw error;

      const updatedLead = { ...selectedLead, ...updateData };
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao atualizar lead:', err);
      alert(`Não foi possível atualizar o lead: ${(err as Error).message}`);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este Lead?')) return;
    
    // Optimistic UI update
    setLeads(prev => prev.filter((l) => l.id !== leadId));
    setSelectedLead(null);
    setIsEditing(false);

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao deletar lead:', err);
      alert(`Não foi possível excluir o lead: ${(err as Error).message}`);
      fetchLeads();
    }
  };

  // Reset fields
  const resetForm = () => {
    setNomeCliente('');
    setTelefone('');
    setEquipamentoInteresse('');
    setProblemDescription('');
    setOrigem('WhatsApp');
    setValorEstimado('0.00');
    setStatusFunil('Novo Contato');
  };

  // Convert to O.S. (Duplicate Verification Flow)
  const handleConvertToOS = async () => {
    if (!selectedLead || !company?.id) return;

    // Procura cliente já existente por nome ou telefone no tenant atual
    const cleanedPhone = selectedLead.phone.replace(/\D/g, '');

    try {
      const { data: existingClients, error } = await supabase
        .from('clients')
        .select('id, client_number, type, name, document, phone, email')
        .eq('company_id', company.id);

      if (error) throw error;

      const duplicate = (existingClients || []).find((c) => {
        const matchName = c.name?.toLowerCase().trim() === selectedLead.name.toLowerCase().trim();
        const matchPhone = cleanedPhone && c.phone?.replace(/\D/g, '') === cleanedPhone;
        return matchName || matchPhone;
      });

      if (duplicate) {
        setDuplicateClient(duplicate as Client);
        setShowDuplicateModal(true);
      } else {
        await proceedWithNewClientCreation();
      }
    } catch (err) {
      console.error('Erro ao verificar clientes duplicados:', err);
      alert(`Não foi possível converter o lead: ${(err as Error).message}`);
    }
  };

  // Scenario 1: Create a new client and redirect
  const proceedWithNewClientCreation = async () => {
    if (!selectedLead || !company?.id) return;

    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          company_id: company.id,
          type: 'PF',
          name: selectedLead.name,
          document: '',
          phone: selectedLead.phone,
          email: ''
        })
        .select('id')
        .single();

      if (error) throw error;

      await updateLeadStatus(selectedLead.id, 'Ganho/Convertido');

      const equipment = selectedLead.equipment_info;
      setShowDuplicateModal(false);
      setSelectedLead(null);

      router.push(`/dashboard/orders?new=true&client_id=${newClient.id}&equipment=${encodeURIComponent(equipment)}`);
    } catch (err) {
      console.error('Erro ao criar cliente a partir do lead:', err);
      alert(`Não foi possível criar o cliente: ${(err as Error).message}`);
    }
  };

  // Scenario 2: Use existing matching client and redirect
  const handleUseExistingClient = () => {
    if (!selectedLead || !duplicateClient) return;

    // Convert Lead status to Won/Converted
    updateLeadStatus(selectedLead.id, 'Ganho/Convertido');

    // Close Modals
    setShowDuplicateModal(false);
    setSelectedLead(null);

    // Redirect with existing client id
    router.push(`/dashboard/orders?new=true&client_id=${duplicateClient.id}&equipment=${encodeURIComponent(selectedLead.equipment_info)}`);
  };

  // Color badges helper
  const getOriginBadgeStyle = (orig: Lead['origem']) => {
    switch (orig) {
      case 'WhatsApp': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Instagram Ads': return 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20';
      case 'Indicação': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Telefone': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      default: return 'bg-slate-500/10 text-text-muted border border-slate-500/20';
    }
  };

  // Sum total value of active leads per column
  const getColumnTotals = (colId: Lead['status']) => {
    const filtered = leads.filter((l) => l.status === colId);
    const sum = filtered.reduce((total, lead) => total + lead.valor_estimado, 0);
    return {
      count: filtered.length,
      sum
    };
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text flex items-center gap-2.5">
            <TrendingUp className="w-8 h-8 text-emerald-500" /> Funil de CRM & Leads
          </h1>
          <p className="text-small text-text-muted mt-1">Gerencie e qualifique seus prospects antes de abrirem uma O.S.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Novo Lead
        </Button>
      </div>

      {/* Warning/Instructions Info Bar */}
      <div className="p-4 bg-slate-900/50 border border-border rounded-xl flex items-center gap-3.5 text-text text-xs">
        <Info className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold text-white block">CRM Conectado ao Supabase (com sincronização offline local)</span>
          Arraste e solte os cards entre as colunas para atualizar as fases do funil. Ao converter um lead, o sistema verificará duplicados e pré-preencherá a tela de abertura de O.S.
        </div>
      </div>

      {/* Kanban Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-raised border border-border rounded-2xl">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-text-muted">Carregando funil de vendas...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4 scrollbar-thin select-none">
          {COLUMNS.map((col) => {
            const { count, sum } = getColumnTotals(col.id);
            const filteredLeads = leads.filter((l) => l.status === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, col.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex-1 min-w-[280px] lg:max-w-[320px] bg-slate-900/30 border border-border/80 rounded-xl p-4 flex flex-col min-h-[600px] transition-all duration-200 ${
                  isOver ? 'border-dashed border-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-500/5' : ''
                }`}
              >
                {/* Column Header */}
                <div className="mb-4 pb-3 border-b border-border/60">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-bold text-text flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.id === 'Novo Contato' ? 'bg-sky-400 animate-pulse' : col.id === 'Em Negociação' ? 'bg-amber-500' : col.id === 'Aguardando Equipamento' ? 'bg-indigo-400' : col.id === 'Ganho/Convertido' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                      {col.title}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-border text-text-muted">
                      {count}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-subtle font-mono">
                    Total: R$ {sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-1">
                  {filteredLeads.length === 0 ? (
                    <div className="h-28 border border-dashed border-border/50 rounded-xl flex items-center justify-center text-center p-4">
                      <p className="text-[11px] text-slate-600">Arraste um lead para esta etapa</p>
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsEditing(false);
                        }}
                        className={`bg-slate-900 border border-border/80 rounded-xl p-4 shadow-sm hover:border-emerald-500/30 transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-[1.01] flex flex-col justify-between ${
                          draggedLeadId === lead.id ? 'opacity-40 border-dashed border-emerald-500/20' : ''
                        }`}
                      >
                        <div>
                          {/* Origem badge */}
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getOriginBadgeStyle(lead.origem)}`}>
                              {lead.origem}
                            </span>
                            <span className="text-[9px] text-text-subtle font-semibold font-mono">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm tracking-tight leading-tight truncate hover:text-emerald-400 transition-colors">
                            {lead.name}
                          </h4>
                          
                          <p className="text-xs text-text-muted font-semibold mt-1 flex items-center gap-1.5 truncate">
                            <Wrench className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                            {lead.equipment_info}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/55 flex justify-between items-center">
                          <span className="text-xs text-emerald-400 font-extrabold font-mono flex items-center">
                            <DollarSign className="w-3 h-3 text-emerald-500" />
                            {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          
                          {lead.phone && (
                            <span className="text-[10px] text-text-subtle flex items-center gap-1">
                              <Phone className="w-3 h-3 text-text-subtle" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Criar Novo Lead */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-sunken/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-border rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <Button
              onClick={() => setIsCreating(false)}
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 px-1.5"
              aria-label="Fechar"
            >
              <X className="w-4.5 h-4.5" />
            </Button>

            <h3 className="text-h3 text-text mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Novo Lead de CRM
            </h3>
            <p className="text-xs text-text-muted mb-6">Qualifique as necessidades do cliente antes de gerar o chamado técnico.</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Nome do Cliente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana Paula Souza"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Telefone de Contato</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                  <input
                    type="text"
                    placeholder="Ex: (11) 98888-7777"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Equipamento & Serviço Desejado</label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: MacBook Pro - Troca de Bateria"
                    value={equipamentoInteresse}
                    onChange={(e) => setEquipamentoInteresse(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Descrição do Problema (Opcional)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-text-subtle" />
                  <textarea
                    placeholder="Ex: O aparelho está esquentando e desligando sozinho..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Origem do Lead</label>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value as Lead['origem'])}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram Ads">Instagram Ads</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Valor Estimado (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-9 pr-4 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Etapa Inicial no Funil</label>
                <select
                  value={statusFunil}
                  onChange={(e) => setStatusFunil(e.target.value as Lead['status'])}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="Novo Contato">Novo Contato</option>
                  <option value="Em Negociação">Em Negociação</option>
                  <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                  <option value="Ganho/Convertido">Ganho/Convertido (Direto)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm">
                  Salvar Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar & Editar Detalhes do Lead */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-sunken/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
            <Button
              onClick={() => setSelectedLead(null)}
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 px-1.5"
              aria-label="Fechar"
            >
              <X className="w-4.5 h-4.5" />
            </Button>

            {!isEditing ? (
              // Modo Visualização
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${getOriginBadgeStyle(selectedLead.origem)}`}>
                      {selectedLead.origem}
                    </span>
                    <span className="text-[10px] font-bold bg-surface-sunken text-text-muted px-2 py-0.5 rounded border border-border">
                      Fase: {selectedLead.status}
                    </span>
                  </div>
                  
                  <h3 className="text-h3 text-text">{selectedLead.name}</h3>
                  <p className="text-xs text-text-subtle mt-1">Cadastrado em {new Date(selectedLead.created_at).toLocaleString('pt-BR')}</p>
                </div>

                <div className="bg-surface-sunken/60 p-4 border border-border rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <Wrench className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-text-subtle uppercase font-bold tracking-wider">Equipamento / Interesse</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedLead.equipment_info}</p>
                    </div>
                  </div>

                  {selectedLead.problem_description && (
                    <div className="flex items-start gap-3 pt-2 border-t border-slate-900/60">
                      <FileText className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-text-subtle uppercase font-bold tracking-wider">Descrição do Problema</p>
                        <p className="text-sm text-slate-200 leading-relaxed">{selectedLead.problem_description}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900/60">
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-text-subtle uppercase font-bold tracking-wider">Telefone</p>
                        <p className="text-sm font-semibold text-slate-200">{selectedLead.phone || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-text-subtle uppercase font-bold tracking-wider">Valor Estimado</p>
                        <p className="text-sm font-extrabold text-emerald-400 font-mono">
                          R$ {selectedLead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedLead.status === 'Perdido' && selectedLead.motivo_perda && (
                    <div className="pt-3 mt-3 border-t border-rose-500/10 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                      <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider mb-1">Motivo do Descarte (Perdido)</p>
                      <p className="text-xs text-rose-300 italic">&ldquo;{selectedLead.motivo_perda}&rdquo;</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      onClick={() => {
                        setNomeCliente(selectedLead.name);
                        setTelefone(selectedLead.phone);
                        setEquipamentoInteresse(selectedLead.equipment_info);
                        setProblemDescription(selectedLead.problem_description || '');
                        setOrigem(selectedLead.origem);
                        setValorEstimado(selectedLead.valor_estimado.toString());
                        setStatusFunil(selectedLead.status);
                        setIsEditing(true);
                      }}
                    >
                      Editar Lead
                    </Button>
                    {selectedLead.phone && (
                      <a
                        href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '').startsWith('55') ? selectedLead.phone.replace(/\D/g, '') : '55' + selectedLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${selectedLead.name}, tudo bem? Sou da equipe da TrustCare. Gostaria de conversar sobre o seu ${selectedLead.equipment_info}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses({ size: 'sm' })}
                      >
                        <Phone className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      className="px-2.5"
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  </div>

                  {/* Converter em OS Flow Trigger (Only if not already Won/Lost) */}
                  {selectedLead.status !== 'Ganho/Convertido' && (
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={handleConvertToOS}
                    >
                      Convertido: Gerar O.S. <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              // Modo Edição
              <form onSubmit={handleUpdateLead} className="space-y-4">
                <h3 className="text-h3 text-text mb-4">Editar Lead</h3>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Telefone</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Equipamento / Interesse</label>
                  <input
                    type="text"
                    required
                    value={equipamentoInteresse}
                    onChange={(e) => setEquipamentoInteresse(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Descrição do Problema (Opcional)</label>
                  <textarea
                    placeholder="Descrição detalhada..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Origem</label>
                    <select
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value as Lead['origem'])}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Instagram Ads">Instagram Ads</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Telefone">Telefone</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Status do Funil</label>
                  <select
                    value={statusFunil}
                    onChange={(e) => setStatusFunil(e.target.value as Lead['status'])}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="Novo Contato">Novo Contato</option>
                    <option value="Em Negociação">Em Negociação</option>
                    <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                    <option value="Ganho/Convertido">Ganho/Convertido</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                    Voltar
                  </Button>
                  <Button type="submit" size="sm">
                    Atualizar Dados
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MINI-MODAL: Confirmação de Justificativa de Perda (Motivo de Perda) */}
      {showLossReasonModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-sunken/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-border rounded-xl w-full max-w-sm p-5 shadow-2xl">
            <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Justificar Perda de Lead
            </h4>
            <p className="text-xs text-text-muted mb-4">Selecione ou digite o motivo pelo qual este lead foi cancelado/descartado:</p>

            <form onSubmit={handleLossReasonSubmit} className="space-y-4">
              <div className="space-y-2">
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                  required
                >
                  <option value="">Selecione um motivo...</option>
                  <option value="Preço muito alto">Preço muito alto</option>
                  <option value="Prazo de entrega longo">Prazo de entrega longo</option>
                  <option value="Sem peças em estoque">Sem peças em estoque</option>
                  <option value="Desistiu do reparo / Não compensa">Desistiu do reparo / Não compensa</option>
                  <option value="Sem contato com o cliente (Ghosting)">Sem contato com o cliente (Ghosting)</option>
                  <option value="Outro">Outro (digite abaixo)</option>
                </select>

                {lossReason === 'Outro' && (
                  <input
                    type="text"
                    placeholder="Digite o motivo customizado..."
                    required
                    onChange={(e) => setLossReason(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowLossReasonModal(false);
                    setLeadToLoseId(null);
                    // Re-sync original list to trigger full visual cancellation
                    setLeads([...leads]);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="danger" size="sm">
                  Confirmar Perda
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINI-MODAL: Confirmação de Duplicado (Opção B) */}
      {showDuplicateModal && duplicateClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-sunken/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-500" /> Vínculo de Cliente Encontrado
            </h4>
            <p className="text-xs text-text-muted mb-4">
              Encontramos um cadastro de cliente que coincide com os dados de contato do Lead:
            </p>

            <div className="bg-surface-sunken p-4 border border-border rounded-xl space-y-1 mb-6 text-xs text-text">
              <p><strong>Nome:</strong> {duplicateClient.name}</p>
              {duplicateClient.phone && <p><strong>Telefone:</strong> {duplicateClient.phone}</p>}
              {duplicateClient.email && <p><strong>Email:</strong> {duplicateClient.email}</p>}
              <p><strong>Código Interno:</strong> #{duplicateClient.client_number}</p>
            </div>

            <p className="text-xs text-text-muted mb-6">
              Como você deseja vincular este novo chamado?
            </p>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                fullWidth
                icon={<Check className="w-4 h-4" />}
                onClick={handleUseExistingClient}
              >
                Vincular ao Cliente Existente (Recomendado)
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={proceedWithNewClientCreation}
              >
                Criar Novo Cadastro para o Lead
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                className="text-[11px] uppercase tracking-wider"
                onClick={() => setShowDuplicateModal(false)}
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
