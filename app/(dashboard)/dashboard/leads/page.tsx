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
  Check
} from 'lucide-react';

function createUniqueId(prefix: string): string {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

interface Lead {
  id: string;
  nome_cliente: string;
  telefone: string;
  equipamento_interesse: string;
  origem: 'WhatsApp' | 'Instagram Ads' | 'Indicação' | 'Telefone' | 'Outro';
  status_funil: 'Novo Contato' | 'Em Negociação' | 'Aguardando Equipamento' | 'Ganho/Convertido' | 'Perdido';
  valor_estimado: number;
  motivo_perda?: string;
  created_at: string;
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
  const [origem, setOrigem] = useState<'WhatsApp' | 'Instagram Ads' | 'Indicação' | 'Telefone' | 'Outro'>('WhatsApp');
  const [valorEstimado, setValorEstimado] = useState('0.00');
  const [statusFunil, setStatusFunil] = useState<Lead['status_funil']>('Novo Contato');

  useEffect(() => {
    const stored = localStorage.getItem('mock-leads');
    let loadedLeads: Lead[] = [];
    if (stored) {
      loadedLeads = JSON.parse(stored);
    } else {
      loadedLeads = [
        { id: 'l1', nome_cliente: 'Ana Paula Souza', telefone: '(11) 98888-7777', equipamento_interesse: 'MacBook Pro M2 - Upgrade de SSD', origem: 'WhatsApp', status_funil: 'Novo Contato', valor_estimado: 1200.00, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
        { id: 'l2', nome_cliente: 'Marcos Vinícius', telefone: '(21) 97777-6666', equipamento_interesse: 'Console PS5 - Limpeza e Superaquecimento', origem: 'Instagram Ads', status_funil: 'Em Negociação', valor_estimado: 450.00, created_at: new Date(Date.now() - 3600000 * 20).toISOString() },
        { id: 'l3', nome_cliente: 'Roberto da Silva', telefone: '(19) 99999-8888', equipamento_interesse: 'Notebook Dell Inspiron - Reparo de Carcaça', origem: 'Indicação', status_funil: 'Aguardando Equipamento', valor_estimado: 350.00, created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
        { id: 'l4', nome_cliente: 'Lúcia Ferreira', telefone: '(31) 96666-5555', equipamento_interesse: 'iPhone 13 - Troca de Tela', origem: 'Telefone', status_funil: 'Ganho/Convertido', valor_estimado: 600.00, created_at: new Date(Date.now() - 3600000 * 72).toISOString() },
        { id: 'l5', nome_cliente: 'Julio Cesar Santos', telefone: '(11) 97777-8888', equipamento_interesse: 'Placa Mãe PC Desktop - Reparo de Trilhas', origem: 'Outro', status_funil: 'Perdido', valor_estimado: 750.00, motivo_perda: 'Preço muito alto', created_at: new Date(Date.now() - 3600000 * 96).toISOString() }
      ];
      localStorage.setItem('mock-leads', JSON.stringify(loadedLeads));
    }
    
    const timer = setTimeout(() => {
      setLeads(loadedLeads);
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save leads helper
  const saveLeadsToStorage = (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
    localStorage.setItem('mock-leads', JSON.stringify(updatedLeads));
  };

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

  const handleDrop = (e: React.DragEvent, targetColumn: Lead['status_funil']) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status_funil === targetColumn) return;

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

  const updateLeadStatus = (leadId: string, newStatus: Lead['status_funil'], motivoPerda?: string) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          status_funil: newStatus,
          motivo_perda: newStatus === 'Perdido' ? motivoPerda : undefined,
          updated_at: new Date().toISOString()
        };
      }
      return l;
    });
    saveLeadsToStorage(updated);
    
    // Update active details modal if open
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        status_funil: newStatus,
        motivo_perda: newStatus === 'Perdido' ? motivoPerda : undefined
      });
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
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim()) return;

    const newLead: Lead = {
      id: createUniqueId('lead'),
      nome_cliente: nomeCliente.trim(),
      telefone: telefone.trim(),
      equipamento_interesse: equipamentoInteresse.trim(),
      origem,
      status_funil: statusFunil,
      valor_estimado: parseFloat(valorEstimado) || 0.00,
      created_at: new Date().toISOString()
    };

    saveLeadsToStorage([newLead, ...leads]);
    setIsCreating(false);
    resetForm();
  };

  // Edit Lead
  const handleUpdateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !nomeCliente.trim()) return;

    const updated = leads.map((l) => {
      if (l.id === selectedLead.id) {
        return {
          ...l,
          nome_cliente: nomeCliente.trim(),
          telefone: telefone.trim(),
          equipamento_interesse: equipamentoInteresse.trim(),
          origem,
          valor_estimado: parseFloat(valorEstimado) || 0.00,
          status_funil: statusFunil
        };
      }
      return l;
    });

    saveLeadsToStorage(updated);
    setSelectedLead({
      ...selectedLead,
      nome_cliente: nomeCliente.trim(),
      telefone: telefone.trim(),
      equipamento_interesse: equipamentoInteresse.trim(),
      origem,
      valor_estimado: parseFloat(valorEstimado) || 0.00,
      status_funil: statusFunil
    });
    setIsEditing(false);
  };

  // Delete Lead
  const handleDeleteLead = (leadId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este Lead?')) return;
    const updated = leads.filter((l) => l.id !== leadId);
    saveLeadsToStorage(updated);
    setSelectedLead(null);
    setIsEditing(false);
  };

  // Reset fields
  const resetForm = () => {
    setNomeCliente('');
    setTelefone('');
    setEquipamentoInteresse('');
    setOrigem('WhatsApp');
    setValorEstimado('0.00');
    setStatusFunil('Novo Contato');
  };

  // Convert to O.S. (Duplicate Verification Flow)
  const handleConvertToOS = () => {
    if (!selectedLead) return;

    // Load mock clients list
    const storedClientsRaw = localStorage.getItem('mock-clients');
    const storedClients: Client[] = storedClientsRaw ? JSON.parse(storedClientsRaw) : [];

    // Search duplicate by name or phone
    const cleanedPhone = selectedLead.telefone.replace(/\D/g, '');
    const duplicate = storedClients.find((c) => {
      const matchName = c.name.toLowerCase().trim() === selectedLead.nome_cliente.toLowerCase().trim();
      const matchPhone = cleanedPhone && c.phone.replace(/\D/g, '') === cleanedPhone;
      return matchName || matchPhone;
    });

    if (duplicate) {
      setDuplicateClient(duplicate);
      setShowDuplicateModal(true);
    } else {
      // Direct Conversion
      proceedWithNewClientCreation();
    }
  };

  // Scenario 1: Create a new client and redirect
  const proceedWithNewClientCreation = () => {
    if (!selectedLead) return;

    const storedClientsRaw = localStorage.getItem('mock-clients');
    const storedClients: Client[] = storedClientsRaw ? JSON.parse(storedClientsRaw) : [];

    const nextNumber = Math.max(...storedClients.map((c) => c.client_number || 1000), 1000) + 1;
    const newClientId = createUniqueId('mock-client');
    const newClient: Client = {
      id: newClientId,
      client_number: nextNumber,
      type: 'PF',
      name: selectedLead.nome_cliente,
      document: '',
      phone: selectedLead.telefone,
      email: ''
    };

    // Save client
    const updatedClients = [...storedClients, newClient];
    localStorage.setItem('mock-clients', JSON.stringify(updatedClients));

    // Convert Lead status to Won/Converted
    updateLeadStatus(selectedLead.id, 'Ganho/Convertido');

    // Close Modals
    setShowDuplicateModal(false);
    setSelectedLead(null);

    // Redirect to New O.S. Form with prefilled parameters
    router.push(`/dashboard/orders?new=true&client_id=${newClientId}&equipment=${encodeURIComponent(selectedLead.equipamento_interesse)}`);
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
    router.push(`/dashboard/orders?new=true&client_id=${duplicateClient.id}&equipment=${encodeURIComponent(selectedLead.equipamento_interesse)}`);
  };

  // Color badges helper
  const getOriginBadgeStyle = (orig: Lead['origem']) => {
    switch (orig) {
      case 'WhatsApp': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Instagram Ads': return 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20';
      case 'Indicação': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Telefone': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // Sum total value of active leads per column
  const getColumnTotals = (colId: Lead['status_funil']) => {
    const filtered = leads.filter((l) => l.status_funil === colId);
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-8 h-8 text-emerald-500" /> Funil de CRM & Leads
          </h1>
          <p className="text-slate-400 mt-1">Gerencie e qualifique seus prospects antes de abrirem uma O.S.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {/* Warning/Instructions Info Bar */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3.5 text-slate-350 text-xs">
        <Info className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold text-white block">Ambiente de Teste CRM Ativado (LocalStorage)</span>
          Arraste e solte os cards entre as colunas para atualizar as fases do funil. Ao converter um lead, o sistema verificará duplicados e pré-preencherá a tela de abertura de O.S.
        </div>
      </div>

      {/* Kanban Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-450">Carregando funil de vendas...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4 scrollbar-thin select-none">
          {COLUMNS.map((col) => {
            const { count, sum } = getColumnTotals(col.id);
            const filteredLeads = leads.filter((l) => l.status_funil === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, col.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex-1 min-w-[280px] lg:max-w-[320px] bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[600px] transition-all duration-200 ${
                  isOver ? 'border-dashed border-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-500/5' : ''
                }`}
              >
                {/* Column Header */}
                <div className="mb-4 pb-3 border-b border-slate-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.id === 'Novo Contato' ? 'bg-sky-400 animate-pulse' : col.id === 'Em Negociação' ? 'bg-amber-500' : col.id === 'Aguardando Equipamento' ? 'bg-indigo-400' : col.id === 'Ganho/Convertido' ? 'bg-emerald-450' : 'bg-rose-500'}`} />
                      {col.title}
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-slate-400">
                      {count}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total: R$ {sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-1">
                  {filteredLeads.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-800/50 rounded-xl flex items-center justify-center text-center p-4">
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
                        className={`bg-slate-900 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-emerald-500/30 transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-[1.01] flex flex-col justify-between ${
                          draggedLeadId === lead.id ? 'opacity-40 border-dashed border-emerald-500/20' : ''
                        }`}
                      >
                        <div>
                          {/* Origem badge */}
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getOriginBadgeStyle(lead.origem)}`}>
                              {lead.origem}
                            </span>
                            <span className="text-[9px] text-slate-550 font-semibold font-mono">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-sm tracking-tight leading-tight truncate hover:text-emerald-400 transition-colors">
                            {lead.nome_cliente}
                          </h4>
                          
                          <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5 truncate">
                            <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {lead.equipamento_interesse}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/55 flex justify-between items-center">
                          <span className="text-xs text-emerald-450 font-extrabold font-mono flex items-center">
                            <DollarSign className="w-3 h-3 text-emerald-500" />
                            {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          
                          {lead.telefone && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-650" />
                              {lead.telefone}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsCreating(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Novo Lead de Pré-Vendas
            </h3>
            <p className="text-xs text-slate-400 mb-6">Qualifique as necessidades do cliente antes de gerar o chamado técnico.</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nome do Cliente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana Paula Souza"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefone de Contato</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ex: (11) 98888-7777"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Equipamento & Serviço Desejado</label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: MacBook Pro - Troca de Bateria"
                    value={equipamentoInteresse}
                    onChange={(e) => setEquipamentoInteresse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Origem do Lead</label>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value as Lead['origem'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram Ads">Instagram Ads</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valor Estimado (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Etapa Inicial no Funil</label>
                <select
                  value={statusFunil}
                  onChange={(e) => setStatusFunil(e.target.value as Lead['status_funil'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="Novo Contato">Novo Contato</option>
                  <option value="Em Negociação">Em Negociação</option>
                  <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                  <option value="Ganho/Convertido">Ganho/Convertido (Direto)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2 px-6 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar & Editar Detalhes do Lead */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedLead(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {!isEditing ? (
              // Modo Visualização
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${getOriginBadgeStyle(selectedLead.origem)}`}>
                      {selectedLead.origem}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-850">
                      Fase: {selectedLead.status_funil}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white">{selectedLead.nome_cliente}</h3>
                  <p className="text-xs text-slate-500 mt-1">Cadastrado em {new Date(selectedLead.created_at).toLocaleString('pt-BR')}</p>
                </div>

                <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <Wrench className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Equipamento / Interesse</p>
                      <p className="text-sm font-semibold text-slate-200">{selectedLead.equipamento_interesse}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900/60">
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Telefone</p>
                        <p className="text-sm font-semibold text-slate-200">{selectedLead.telefone || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valor Estimado</p>
                        <p className="text-sm font-extrabold text-emerald-400 font-mono">
                          R$ {selectedLead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedLead.status_funil === 'Perdido' && selectedLead.motivo_perda && (
                    <div className="pt-3 mt-3 border-t border-rose-500/10 bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                      <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider mb-1">Motivo do Descarte (Perdido)</p>
                      <p className="text-xs text-rose-300 italic">&ldquo;{selectedLead.motivo_perda}&rdquo;</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-850">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setNomeCliente(selectedLead.nome_cliente);
                        setTelefone(selectedLead.telefone);
                        setEquipamentoInteresse(selectedLead.equipamento_interesse);
                        setOrigem(selectedLead.origem);
                        setValorEstimado(selectedLead.valor_estimado.toString());
                        setStatusFunil(selectedLead.status_funil);
                        setIsEditing(true);
                      }}
                      className="flex-1 sm:flex-initial bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Editar Lead
                    </button>
                    <button
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-400 p-2.5 rounded-lg hover:text-rose-300 transition-colors"
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Converter em OS Flow Trigger (Only if not already Won/Lost) */}
                  {selectedLead.status_funil !== 'Ganho/Convertido' && (
                    <button
                      onClick={handleConvertToOS}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold py-2.5 px-6 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer"
                    >
                      Convertido: Gerar O.S. <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Modo Edição
              <form onSubmit={handleUpdateLead} className="space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">Editar Lead</h3>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Equipamento / Interesse</label>
                  <input
                    type="text"
                    required
                    value={equipamentoInteresse}
                    onChange={(e) => setEquipamentoInteresse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Origem</label>
                    <select
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value as Lead['origem'])}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Instagram Ads">Instagram Ads</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Telefone">Telefone</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valor Estimado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status do Funil</label>
                  <select
                    value={statusFunil}
                    onChange={(e) => setStatusFunil(e.target.value as Lead['status_funil'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <option value="Novo Contato">Novo Contato</option>
                    <option value="Em Negociação">Em Negociação</option>
                    <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                    <option value="Ganho/Convertido">Ganho/Convertido</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2 px-6 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Atualizar Dados
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MINI-MODAL: Confirmação de Justificativa de Perda (Motivo de Perda) */}
      {showLossReasonModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-5 shadow-2xl">
            <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" /> Justificar Perda de Lead
            </h4>
            <p className="text-xs text-slate-400 mb-4">Selecione ou digite o motivo pelo qual este lead foi cancelado/descartado:</p>

            <form onSubmit={handleLossReasonSubmit} className="space-y-4">
              <div className="space-y-2">
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowLossReasonModal(false);
                    setLeadToLoseId(null);
                    // Re-sync original list to trigger full visual cancellation
                    setLeads([...leads]); 
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-1.5 px-3 rounded text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-1.5 px-4 rounded text-xs transition-colors cursor-pointer"
                >
                  Confirmar Perda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINI-MODAL: Confirmação de Duplicado (Opção B) */}
      {showDuplicateModal && duplicateClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-500" /> Vínculo de Cliente Encontrado
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Encontramos um cadastro de cliente que coincide com os dados de contato do Lead:
            </p>

            <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-1 mb-6 text-xs text-slate-350">
              <p><strong>Nome:</strong> {duplicateClient.name}</p>
              {duplicateClient.phone && <p><strong>Telefone:</strong> {duplicateClient.phone}</p>}
              {duplicateClient.email && <p><strong>Email:</strong> {duplicateClient.email}</p>}
              <p><strong>Código Interno:</strong> #{duplicateClient.client_number}</p>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Como você deseja vincular este novo chamado?
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleUseExistingClient}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" /> Vincular ao Cliente Existente (Recomendado)
              </button>
              <button
                type="button"
                onClick={proceedWithNewClientCreation}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Criar Novo Cadastro para o Lead
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full text-slate-500 hover:text-slate-400 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
