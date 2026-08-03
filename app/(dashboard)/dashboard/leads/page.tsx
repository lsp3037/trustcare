'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Plus,
  Wrench,
  Phone,
  DollarSign,
  Trash2,
  ArrowRight,
  Info,
  Check,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  useConfirm,
  useToast,
} from '@/components/ui';
import { getStatusDot, LEAD_STATUS_FLOW } from '@/lib/design/status';
import { getOriginClasses, LEAD_ORIGINS } from '@/lib/design/lead-origin';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/utils/phone';

function createUniqueId(prefix: string): string {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

const brl = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

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

/** Etapas em que faz sentido criar um lead — "Perdido" não é ponto de partida. */
const STATUS_INICIAL = LEAD_STATUS_FLOW.filter((s) => s !== 'Perdido');

const MOTIVOS_DE_PERDA = [
  'Preço muito alto',
  'Prazo de entrega longo',
  'Sem peças em estoque',
  'Desistiu do reparo / Não compensa',
  'Sem contato com o cliente (Ghosting)',
  'Outro',
];

export default function LeadsFunnelPage() {
  const router = useRouter();
  const { company } = useCompany();
  const toast = useToast();
  const confirm = useConfirm();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Controle dos diálogos
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [leadToLoseId, setLeadToLoseId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState('');
  const [lossReasonCustom, setLossReasonCustom] = useState('');

  // Verificação de cliente duplicado
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Formulário
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [equipamentoInteresse, setEquipamentoInteresse] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [origem, setOrigem] = useState<Lead['origem']>('WhatsApp');
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

      setLeads((data as Lead[]) || []);
    } catch (err) {
      console.warn('Erro ao carregar leads do Supabase, buscando mock local:', err);
      loadLocalLeads();
      toast.warning('Exibindo dados salvos neste dispositivo', {
        description: 'Não foi possível falar com o servidor. O funil pode estar desatualizado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocalLeads = () => {
    const stored = localStorage.getItem('mock-leads');
    let loadedLeads: Lead[] = [];
    if (stored) {
      loadedLeads = JSON.parse(stored);
    } else {
      loadedLeads = [
        { id: 'l1', name: 'Ana Paula Souza', phone: '(11) 98888-7777', equipment_info: 'MacBook Pro M2 - Upgrade de SSD', problem_description: 'Upgrade para maior capacidade', origem: 'WhatsApp', status: 'Novo Contato', valor_estimado: 1200.00, created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
        { id: 'l2', name: 'Marcos Vinícius', phone: '(21) 97777-6666', equipment_info: 'Console PS5 - Limpeza e Superaquecimento', problem_description: 'Desliga sozinho ao jogar', origem: 'Instagram Ads', status: 'Em Negociação', valor_estimado: 450.00, created_at: new Date(Date.now() - 3600000 * 20).toISOString() },
        { id: 'l3', name: 'Roberto da Silva', phone: '(19) 99999-8888', equipment_info: 'Notebook Dell Inspiron - Reparo de Carcaça', problem_description: 'Dobradiça quebrada', origem: 'Indicação', status: 'Aguardando Equipamento', valor_estimado: 350.00, created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
        { id: 'l4', name: 'Lúcia Ferreira', phone: '(31) 96666-5555', equipment_info: 'iPhone 13 - Troca de Tela', problem_description: 'Vidro quebrado e touch falhando', origem: 'Telefone', status: 'Ganho/Convertido', valor_estimado: 600.00, created_at: new Date(Date.now() - 3600000 * 72).toISOString() },
        { id: 'l5', name: 'Julio Cesar Santos', phone: '(11) 97777-8888', equipment_info: 'Placa Mãe PC Desktop - Reparo de Trilhas', problem_description: 'Curto circuito na linha de entrada', origem: 'Outro', status: 'Perdido', valor_estimado: 750.00, motivo_perda: 'Preço muito alto', created_at: new Date(Date.now() - 3600000 * 96).toISOString() },
      ];
      localStorage.setItem('mock-leads', JSON.stringify(loadedLeads));
    }
    setLeads(loadedLeads);
  };

  useEffect(() => {
    if (company?.id) {
      fetchLeads();
    } else {
      loadLocalLeads();
      setLoading(false);
    }
  }, [company?.id]);

  const saveLeadsToStorage = (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
    localStorage.setItem('mock-leads', JSON.stringify(updatedLeads));
  };

  /* ─── Arrastar e soltar ─── */

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

    // Perder um lead exige justificativa — a transição passa pelo diálogo.
    if (targetColumn === 'Perdido') {
      setLeadToLoseId(leadId);
      setLossReason('');
      setLossReasonCustom('');
      setShowLossReasonModal(true);
      return;
    }

    updateLeadStatus(leadId, targetColumn);
  };

  const updateLeadStatus = async (
    leadId: string,
    newStatus: Lead['status'],
    motivoPerda?: string,
  ) => {
    // Atualização otimista
    const updated = leads.map((l) =>
      l.id === leadId
        ? {
            ...l,
            status: newStatus,
            motivo_perda: newStatus === 'Perdido' ? motivoPerda : undefined,
            updated_at: new Date().toISOString(),
          }
        : l,
    );
    setLeads(updated);

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        status: newStatus,
        motivo_perda: newStatus === 'Perdido' ? motivoPerda : undefined,
      });
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          motivo_perda: newStatus === 'Perdido' ? motivoPerda : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      const localLeadsStr = localStorage.getItem('mock-leads') || '[]';
      const parsedLeads = JSON.parse(localLeadsStr);
      const updatedLocal = parsedLeads.map((l: any) =>
        l.id === leadId
          ? { ...l, status: newStatus, motivo_perda: newStatus === 'Perdido' ? motivoPerda : null, updated_at: new Date().toISOString() }
          : l,
      );
      localStorage.setItem('mock-leads', JSON.stringify(updatedLocal));
    } catch (err) {
      console.warn('Erro ao atualizar status do lead no Supabase, aplicando localmente:', err);
      saveLeadsToStorage(updated);
      // Antes isto era silencioso: o card mudava de coluna na tela e nada
      // chegava ao servidor.
      toast.warning('Mudança salva apenas neste dispositivo', {
        description: 'Sem conexão com o servidor. O funil não foi sincronizado.',
      });
    }
  };

  const handleLossReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const motivo = lossReason === 'Outro' ? lossReasonCustom.trim() : lossReason;
    if (!leadToLoseId || !motivo) return;

    updateLeadStatus(leadToLoseId, 'Perdido', motivo);
    setShowLossReasonModal(false);
    setLeadToLoseId(null);
    setLossReason('');
    setLossReasonCustom('');
    toast.info('Lead movido para Perdido', { description: `Motivo: ${motivo}` });
  };

  const cancelLossReason = () => {
    setShowLossReasonModal(false);
    setLeadToLoseId(null);
    // Re-sincroniza a lista para desfazer visualmente o arrasto.
    setLeads([...leads]);
  };

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
      valor_estimado: parseFloat(valorEstimado) || 0.0,
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

        const localLeadsStr = localStorage.getItem('mock-leads') || '[]';
        const parsedLeads = JSON.parse(localLeadsStr);
        parsedLeads.unshift(data);
        localStorage.setItem('mock-leads', JSON.stringify(parsedLeads));

        setIsCreating(false);
        resetForm();
        toast.success(`Lead "${newLeadData.name}" criado`);
      }
    } catch (err) {
      console.warn('Erro Supabase ao salvar lead, salvando mock local:', err);

      const localLeadsStr = localStorage.getItem('mock-leads') || '[]';
      const parsedLeads = JSON.parse(localLeadsStr);

      const localNewLead: Lead = {
        id: `mock-lead-${Date.now()}`,
        ...newLeadData,
        created_at: new Date().toISOString(),
      };

      parsedLeads.unshift(localNewLead);
      localStorage.setItem('mock-leads', JSON.stringify(parsedLeads));

      setLeads([localNewLead, ...leads]);
      setIsCreating(false);
      resetForm();
      toast.warning('Lead salvo apenas neste dispositivo', {
        description: 'Sem conexão com o servidor. Ele não aparecerá para o resto da equipe.',
      });
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !nomeCliente.trim()) return;

    const updateData = {
      name: nomeCliente.trim(),
      phone: telefone.trim(),
      equipment_info: equipamentoInteresse.trim(),
      problem_description: problemDescription.trim(),
      origem,
      valor_estimado: parseFloat(valorEstimado) || 0.0,
      status: statusFunil,
      updated_at: new Date().toISOString(),
    };

    const applyLocally = () => {
      const updatedLead = { ...selectedLead, ...updateData };
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));

      const localLeadsStr = localStorage.getItem('mock-leads') || '[]';
      const parsedLeads = JSON.parse(localLeadsStr);
      const updated = parsedLeads.map((l: any) =>
        l.id === selectedLead.id ? { ...l, ...updateData } : l,
      );
      localStorage.setItem('mock-leads', JSON.stringify(updated));

      setSelectedLead(updatedLead);
      setIsEditing(false);
    };

    try {
      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) throw error;

      applyLocally();
      toast.success('Lead atualizado');
    } catch (err) {
      console.warn('Erro ao atualizar lead no Supabase, aplicando localmente:', err);
      applyLocally();
      toast.warning('Alteração salva apenas neste dispositivo', {
        description: 'Sem conexão com o servidor.',
      });
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    const confirmed = await confirm({
      title: `Excluir o lead "${lead.name}"?`,
      description:
        'O histórico de contato e o valor estimado são perdidos. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir lead',
      destructive: true,
    });
    if (!confirmed) return;

    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setSelectedLead(null);
    setIsEditing(false);

    const removeLocally = () => {
      const localLeadsStr = localStorage.getItem('mock-leads') || '[]';
      const parsedLeads = JSON.parse(localLeadsStr);
      localStorage.setItem(
        'mock-leads',
        JSON.stringify(parsedLeads.filter((l: any) => l.id !== lead.id)),
      );
    };

    try {
      const { error } = await supabase.from('leads').delete().eq('id', lead.id);
      if (error) throw error;

      removeLocally();
      toast.success(`Lead "${lead.name}" excluído`);
    } catch (err) {
      console.warn('Erro ao deletar lead no Supabase, aplicando localmente:', err);
      removeLocally();
      toast.warning('Exclusão aplicada apenas neste dispositivo', {
        description: 'O lead continua no servidor até a próxima sincronização.',
      });
    }
  };

  const resetForm = () => {
    setNomeCliente('');
    setTelefone('');
    setEquipamentoInteresse('');
    setProblemDescription('');
    setOrigem('WhatsApp');
    setValorEstimado('0.00');
    setStatusFunil('Novo Contato');
  };

  const openEditForm = (lead: Lead) => {
    setNomeCliente(lead.name);
    setTelefone(lead.phone);
    setEquipamentoInteresse(lead.equipment_info);
    setProblemDescription(lead.problem_description || '');
    setOrigem(lead.origem);
    setValorEstimado(lead.valor_estimado.toString());
    setStatusFunil(lead.status);
    setIsEditing(true);
  };

  /* ─── Conversão em OS, com verificação de duplicado ─── */

  const handleConvertToOS = () => {
    if (!selectedLead) return;

    const storedClientsRaw = localStorage.getItem('mock-clients');
    const storedClients: Client[] = storedClientsRaw ? JSON.parse(storedClientsRaw) : [];

    const cleanedPhone = selectedLead.phone.replace(/\D/g, '');
    const duplicate = storedClients.find((c) => {
      const matchName = c.name.toLowerCase().trim() === selectedLead.name.toLowerCase().trim();
      const matchPhone = cleanedPhone && c.phone.replace(/\D/g, '') === cleanedPhone;
      return matchName || matchPhone;
    });

    if (duplicate) {
      setDuplicateClient(duplicate);
      setShowDuplicateModal(true);
    } else {
      proceedWithNewClientCreation();
    }
  };

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
      name: selectedLead.name,
      document: '',
      phone: selectedLead.phone,
      email: '',
    };

    localStorage.setItem('mock-clients', JSON.stringify([...storedClients, newClient]));

    updateLeadStatus(selectedLead.id, 'Ganho/Convertido');

    const equipment = selectedLead.equipment_info;
    setShowDuplicateModal(false);
    setSelectedLead(null);

    toast.success('Lead convertido — cliente novo criado');
    router.push(
      `/dashboard/orders?new=true&client_id=${newClientId}&equipment=${encodeURIComponent(equipment)}`,
    );
  };

  const handleUseExistingClient = () => {
    if (!selectedLead || !duplicateClient) return;

    updateLeadStatus(selectedLead.id, 'Ganho/Convertido');

    const equipment = selectedLead.equipment_info;
    const clientId = duplicateClient.id;
    setShowDuplicateModal(false);
    setSelectedLead(null);

    toast.success('Lead vinculado ao cliente existente');
    router.push(
      `/dashboard/orders?new=true&client_id=${clientId}&equipment=${encodeURIComponent(equipment)}`,
    );
  };

  const getColumnTotals = (colId: Lead['status']) => {
    const filtered = leads.filter((l) => l.status === colId);
    return {
      count: filtered.length,
      sum: filtered.reduce((total, lead) => total + lead.valor_estimado, 0),
    };
  };

  const whatsappLink = (lead: Lead) => {
    const digits = lead.phone.replace(/\D/g, '');
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const message = `Olá ${lead.name}, tudo bem? Sou da equipe da ${company?.name || 'TrustCare'}. Gostaria de conversar sobre o seu ${lead.equipment_info}.`;
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<TrendingUp />}
        title="Funil de CRM & Leads"
        description="Gerencie e qualifique seus prospects antes de abrirem uma O.S."
        actions={
          <Button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Novo Lead
          </Button>
        }
      />

      <Card padding="sm" className="flex items-start gap-3.5">
        <div className="p-2 rounded-2xl bg-info/15 text-info shrink-0" aria-hidden>
          <Info className="w-4 h-4" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-small font-semibold text-text">
            Arraste os cards entre as colunas para mudar a fase
          </p>
          <p className="text-caption text-text-muted mt-0.5">
            Ao converter um lead, o sistema verifica clientes duplicados e pré-preenche a
            abertura de O.S. Prefere teclado? Abra o lead e mude a fase pelo campo
            &ldquo;Status do Funil&rdquo;.
          </p>
        </div>
      </Card>

      {loading ? (
        <div
          className="flex flex-col lg:flex-row gap-6"
          aria-busy="true"
          aria-label="Carregando funil de vendas"
        >
          {LEAD_STATUS_FLOW.map((status, colIndex) => (
            <Card key={status} padding="sm" className="flex-1 min-w-[280px] lg:max-w-[320px]">
              <Skeleton className="h-4 w-32 mb-2" style={{ animationDelay: `${colIndex * 80}ms` }} />
              <Skeleton className="h-3 w-24 mb-5" />
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        // Kanban vazio não é um estado de "arraste algo": não há o que
        // arrastar. As 5 colunas vazias só ocupam a tela sem dizer o que fazer.
        <Card>
          <EmptyState
            icon={<TrendingUp />}
            title="Nenhum lead no funil ainda"
            description="Cadastre os contatos que chegam por WhatsApp, indicação ou anúncio. Quando um deles fechar, o lead vira uma O.S. com o cliente já preenchido."
            action={
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
              >
                Criar primeiro lead
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4 thin-scrollbar">
          {LEAD_STATUS_FLOW.map((colId) => {
            const { count, sum } = getColumnTotals(colId);
            const filteredLeads = leads.filter((l) => l.status === colId);
            const isOver = dragOverColumn === colId;

            return (
              <section
                key={colId}
                aria-label={`${colId} — ${count} ${count === 1 ? 'lead' : 'leads'}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, colId)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, colId)}
                className={cn(
                  'flex-1 min-w-[280px] lg:max-w-[320px] p-4 flex flex-col min-h-[600px]',
                  'bg-surface-sunken/50 border border-border rounded-[20px]',
                  'transition-all duration-200',
                  isOver && 'border-dashed border-brand/50 bg-brand/5',
                )}
              >
                <header className="mb-4 pb-3 border-b border-border">
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <h2 className="text-small font-semibold text-text flex items-center gap-2 min-w-0">
                      <span
                        className={cn('w-2 h-2 rounded-full shrink-0', getStatusDot(colId))}
                        aria-hidden
                      />
                      <span className="truncate">{colId}</span>
                    </h2>
                    <Badge className="shrink-0 font-mono tabular-nums">{count}</Badge>
                  </div>
                  <span className="text-caption text-text-subtle font-mono tabular-nums">
                    Total: {brl(sum)}
                  </span>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[520px] pr-1 thin-scrollbar">
                  {filteredLeads.length === 0 ? (
                    <div className="h-28 border border-dashed border-border rounded-[20px] flex items-center justify-center text-center p-4">
                      <p className="text-caption text-text-subtle">
                        Arraste um lead para esta etapa
                      </p>
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        interactive
                        padding="sm"
                        draggable
                        role="button"
                        tabIndex={0}
                        aria-label={`Abrir lead ${lead.name}`}
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsEditing(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedLead(lead);
                            setIsEditing(false);
                          }
                        }}
                        className={cn(
                          'flex flex-col justify-between cursor-grab active:cursor-grabbing',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                          draggedLeadId === lead.id && 'opacity-40 border-dashed',
                        )}
                      >
                        <div>
                          <div className="flex justify-between items-center gap-2 mb-2">
                            <Badge className={getOriginClasses(lead.origem)}>{lead.origem}</Badge>
                            <span className="text-caption text-text-subtle font-mono tabular-nums shrink-0">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <h3 className="text-h3 text-text truncate">{lead.name}</h3>

                          <p className="text-small text-text-muted mt-1 flex items-center gap-1.5 truncate">
                            <Wrench className="w-3.5 h-3.5 text-text-subtle shrink-0" aria-hidden />
                            {lead.equipment_info}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center gap-2">
                          <span className="text-small font-semibold text-text font-mono tabular-nums">
                            {brl(lead.valor_estimado)}
                          </span>

                          {lead.phone && (
                            <span className="text-caption text-text-subtle flex items-center gap-1 shrink-0">
                              <Phone className="w-3 h-3" aria-hidden />
                              {formatPhone(lead.phone)}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── Criar lead ─── */}
      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="Novo Lead de CRM"
        description="Qualifique as necessidades do cliente antes de gerar o chamado técnico."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-novo-lead">
              Salvar Lead
            </Button>
          </>
        }
      >
        <form id="form-novo-lead" onSubmit={handleCreateLead} className="space-y-4">
          <Input
            label="Nome do Cliente"
            required
            placeholder="Ex: Ana Paula Souza"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
          />
          <Input
            label="Telefone de Contato"
            placeholder="Ex: (11) 98888-7777"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          <Input
            label="Equipamento & Serviço Desejado"
            required
            placeholder="Ex: MacBook Pro - Troca de Bateria"
            value={equipamentoInteresse}
            onChange={(e) => setEquipamentoInteresse(e.target.value)}
          />
          <Textarea
            label="Descrição do Problema"
            hint="Opcional"
            rows={2}
            placeholder="Ex: O aparelho está esquentando e desligando sozinho..."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Origem do Lead"
              value={origem}
              onChange={(e) => setOrigem(e.target.value as Lead['origem'])}
            >
              {LEAD_ORIGINS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>

            <Input
              label="Valor Estimado (R$)"
              type="number"
              step="0.01"
              min="0"
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
            />
          </div>

          <Select
            label="Etapa Inicial no Funil"
            value={statusFunil}
            onChange={(e) => setStatusFunil(e.target.value as Lead['status'])}
          >
            {STATUS_INICIAL.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* ─── Detalhes / edição ─── */}
      <Modal
        open={selectedLead !== null && !isEditing}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.name ?? ''}
        description={
          selectedLead
            ? `Cadastrado em ${new Date(selectedLead.created_at).toLocaleString('pt-BR')}`
            : undefined
        }
        size="lg"
        footer={
          selectedLead && (
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 w-full">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEditForm(selectedLead)}>
                  Editar Lead
                </Button>
                {selectedLead.phone && (
                  <a
                    href={whatsappLink(selectedLead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                  >
                    <Phone className="w-3.5 h-3.5" aria-hidden /> WhatsApp
                  </a>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDeleteLead(selectedLead)}
                >
                  Excluir
                </Button>
              </div>

              {selectedLead.status !== 'Ganho/Convertido' && (
                <Button size="sm" onClick={handleConvertToOS}>
                  Gerar O.S. <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </Button>
              )}
            </div>
          )
        }
      >
        {selectedLead && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getOriginClasses(selectedLead.origem)}>
                {selectedLead.origem}
              </Badge>
              <StatusBadge status={selectedLead.status} dot />
            </div>

            <dl className="bg-surface-sunken p-4 border border-border rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <Wrench className="w-4 h-4 text-text-muted shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-caption text-text-subtle uppercase tracking-wider">
                    Equipamento / Interesse
                  </dt>
                  <dd className="text-small font-semibold text-text">
                    {selectedLead.equipment_info}
                  </dd>
                </div>
              </div>

              {selectedLead.problem_description && (
                <div className="flex items-start gap-3 pt-3 border-t border-border">
                  <FileText className="w-4 h-4 text-text-muted shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-caption text-text-subtle uppercase tracking-wider">
                      Descrição do Problema
                    </dt>
                    <dd className="text-small text-text leading-relaxed">
                      {selectedLead.problem_description}
                    </dd>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-text-muted shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-caption text-text-subtle uppercase tracking-wider">
                      Telefone
                    </dt>
                    <dd className="text-small font-semibold text-text font-mono tabular-nums">
                      {selectedLead.phone || '—'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-text-muted shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-caption text-text-subtle uppercase tracking-wider">
                      Valor Estimado
                    </dt>
                    <dd className="text-small font-semibold text-text font-mono tabular-nums">
                      {brl(selectedLead.valor_estimado)}
                    </dd>
                  </div>
                </div>
              </div>
            </dl>

            {selectedLead.status === 'Perdido' && selectedLead.motivo_perda && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded-xl">
                <p className="text-caption text-danger uppercase tracking-wider mb-1">
                  Motivo do descarte
                </p>
                <p className="text-small text-text">
                  &ldquo;{selectedLead.motivo_perda}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Edição ─── */}
      <Modal
        open={selectedLead !== null && isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar Lead"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Voltar
            </Button>
            <Button type="submit" form="form-editar-lead">
              Atualizar Dados
            </Button>
          </>
        }
      >
        <form id="form-editar-lead" onSubmit={handleUpdateLead} className="space-y-4">
          <Input
            label="Nome do Cliente"
            required
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
          />
          <Input
            label="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          <Input
            label="Equipamento / Interesse"
            required
            value={equipamentoInteresse}
            onChange={(e) => setEquipamentoInteresse(e.target.value)}
          />
          <Textarea
            label="Descrição do Problema"
            hint="Opcional"
            rows={2}
            placeholder="Descrição detalhada..."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Origem"
              value={origem}
              onChange={(e) => setOrigem(e.target.value as Lead['origem'])}
            >
              {LEAD_ORIGINS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>

            <Input
              label="Valor Estimado (R$)"
              type="number"
              step="0.01"
              min="0"
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
            />
          </div>

          <Select
            label="Status do Funil"
            value={statusFunil}
            onChange={(e) => setStatusFunil(e.target.value as Lead['status'])}
          >
            {LEAD_STATUS_FLOW.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* ─── Justificativa de perda ─── */}
      <Modal
        open={showLossReasonModal}
        onClose={cancelLossReason}
        title="Por que este lead foi perdido?"
        description="O motivo fica registrado no histórico e alimenta o relatório de perdas."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={cancelLossReason}>
              Cancelar
            </Button>
            <Button type="submit" form="form-motivo-perda" variant="danger">
              Confirmar Perda
            </Button>
          </>
        }
      >
        <form id="form-motivo-perda" onSubmit={handleLossReasonSubmit} className="space-y-3">
          <Select
            label="Motivo"
            required
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
          >
            <option value="">Selecione um motivo...</option>
            {MOTIVOS_DE_PERDA.map((m) => (
              <option key={m} value={m}>
                {m === 'Outro' ? 'Outro (digite abaixo)' : m}
              </option>
            ))}
          </Select>

          {lossReason === 'Outro' && (
            <Input
              label="Motivo customizado"
              required
              autoFocus
              placeholder="Digite o motivo..."
              value={lossReasonCustom}
              onChange={(e) => setLossReasonCustom(e.target.value)}
            />
          )}
        </form>
      </Modal>

      {/* ─── Cliente duplicado ─── */}
      <Modal
        open={showDuplicateModal && duplicateClient !== null}
        onClose={() => setShowDuplicateModal(false)}
        title="Já existe um cliente com estes dados"
        description="Vincular ao cadastro existente evita duplicar histórico e financeiro."
        footer={
          <Button variant="ghost" onClick={() => setShowDuplicateModal(false)}>
            Voltar
          </Button>
        }
      >
        {duplicateClient && (
          <div className="space-y-5">
            <dl className="bg-surface-sunken p-4 border border-border rounded-xl space-y-2 text-small">
              <div className="flex gap-2">
                <dt className="text-text-muted">Nome:</dt>
                <dd className="text-text font-semibold">{duplicateClient.name}</dd>
              </div>
              {duplicateClient.phone && (
                <div className="flex gap-2">
                  <dt className="text-text-muted">Telefone:</dt>
                  <dd className="text-text font-mono tabular-nums">{formatPhone(duplicateClient.phone)}</dd>
                </div>
              )}
              {duplicateClient.email && (
                <div className="flex gap-2">
                  <dt className="text-text-muted">Email:</dt>
                  <dd className="text-text">{duplicateClient.email}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-text-muted">Código interno:</dt>
                <dd className="text-text font-mono tabular-nums">
                  #{duplicateClient.client_number}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3">
              <Button
                fullWidth
                icon={<Check className="w-4 h-4" />}
                onClick={handleUseExistingClient}
              >
                Vincular ao cliente existente
              </Button>
              <Button variant="secondary" fullWidth onClick={proceedWithNewClientCreation}>
                Criar cadastro novo mesmo assim
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
