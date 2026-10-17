'use client';
import {
  QrCode,
  Save,
  Plus,
  ClipboardList,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  Edit,
  Building,
  User,
  FileText,
  Phone,
  Mail,
  Laptop,
  Trash2,
  FolderPlus,
  Cpu,
  HardDrive,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useConfirm,
  useToast,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { formatPhone } from '@/lib/utils/phone';

const OFFLINE_HINT = 'Sem conexão com o servidor. A alteração ficou só neste dispositivo.';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const toast = useToast();
  const confirm = useConfirm();

  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edição do cliente
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('PF');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Cadastro de equipamento
  const [eqName, setEqName] = useState('');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [eqProcessor, setEqProcessor] = useState('');
  const [eqRam, setEqRam] = useState('');
  const [eqStorage, setEqStorage] = useState('');
  const [eqGpuType, setEqGpuType] = useState('');
  const [eqGpuModel, setEqGpuModel] = useState('');
  const [addingEq, setAddingEq] = useState(false);

  // Categorias e CRUD de equipamentos
  const [categories, setCategories] = useState<any[]>([]);
  const [eqCategoryId, setEqCategoryId] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingEqId, setEditingEqId] = useState<string | null>(null);

  // Histórico clínico de checklists
  const [selectedEqForHistory, setSelectedEqForHistory] = useState<any | null>(null);
  const [eqChecklistHistory, setEqChecklistHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleShowChecklistHistory = async (eq: any) => {
    setSelectedEqForHistory(eq);
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('id, client_id, service_number, entry_checklist, exit_checklist, status, created_at')
        .eq('equipment_id', eq.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEqChecklistHistory(data || []);
    } catch (err) {
      console.warn('Erro ao carregar histórico no Supabase:', err);
      setEqChecklistHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchClientAndOrders = async () => {
    try {
      setLoading(true);

      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientErr) throw clientErr;

      if (clientData) {
        // Calcula o número sequencial quando o registro não tem um gravado.
        const { data: allClients } = await supabase
          .from('clients')
          .select('id')
          .order('created_at', { ascending: true });
        const index = allClients ? allClients.findIndex((c) => c.id === clientData.id) : 0;

        const processedClient = {
          ...clientData,
          client_number: clientData.client_number || 1001 + (index >= 0 ? index : 0),
        };

        setClient(processedClient);
        setName(processedClient.name);
        setType(processedClient.type);
        setDocument(processedClient.document || '');
        setPhone(processedClient.phone || '');
        setEmail(processedClient.email || '');

        const { data: ordersData } = await supabase
          .from('service_orders')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });

        if (ordersData) setOrders(ordersData);

        const { data: catData } = await supabase
          .from('equipment_categories')
          .select('*')
          .order('name');

        if (catData) setCategories(catData);

        const { data: eqData } = await supabase
          .from('client_equipments')
          .select('*, equipment_categories(name)')
          .eq('client_id', id)
          .order('created_at', { ascending: false });

        if (eqData) setEquipments(eqData);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar do Supabase:', err);
      setClient(null);
      toast.error('Não foi possível carregar o cliente', {
        description: err?.message || 'Falha de comunicação com o servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientAndOrders();
  }, [id]);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedData = { name, type, document, phone, email };

      const { error } = await supabase.from('clients').update(updatedData).eq('id', id);

      if (error) throw error;
      toast.success('Cadastro atualizado');

      setIsEditing(false);
      fetchClientAndOrders();
    } catch (err: any) {
      toast.error('Não foi possível salvar o cadastro', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingEq(true);

    // Marca se alguma etapa caiu para o armazenamento local, para que a
    // mensagem final diga a verdade.
    let usedFallback = false;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!profile?.company_id) throw new Error('Empresa do usuário não identificada.');

      const isUuid = (val: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const supabaseEqData = {
        company_id: profile.company_id,
        client_id: id,
        category_id: isUuid(eqCategoryId) ? eqCategoryId : null,
        name: eqName,
        brand: eqBrand,
        model: eqModel,
        serial_number: eqSerial,
        processor: eqProcessor.trim() || null,
        ram: eqRam.trim() || null,
        storage: eqStorage.trim() || null,
        gpu_type: eqGpuType.trim() || null,
        gpu_model: eqGpuModel.trim() || null,
      };

      if (editingEqId) {
        const { error } = await supabase
          .from('client_equipments')
          .update(supabaseEqData)
          .eq('id', editingEqId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_equipments').insert(supabaseEqData);
        if (error) throw error;
      }

      const acao = editingEqId ? 'atualizado' : 'cadastrado';
      const nomeEquipamento = eqName;

      setEqName('');
      setEqBrand('');
      setEqModel('');
      setEqSerial('');
      setEqCategoryId('');
      setEqProcessor('');
      setEqRam('');
      setEqStorage('');
      setEqGpuType('');
      setEqGpuModel('');
      setEditingEqId(null);

      if (usedFallback) {
        toast.warning(`Equipamento salvo apenas neste dispositivo`, {
          description: OFFLINE_HINT,
        });
      } else {
        toast.success(`"${nomeEquipamento}" ${acao}`);
      }

      fetchClientAndOrders();
    } catch (err: any) {
      toast.error('Não foi possível salvar o equipamento', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setAddingEq(false);
    }
  };

  const handleDeleteEquipment = async (eq: any) => {
    const confirmed = await confirm({
      title: `Excluir o equipamento "${eq.name}"?`,
      description:
        'O histórico de checklists deixa de aparecer na ficha deste cliente. As ordens de serviço já emitidas não são afetadas.',
      confirmLabel: 'Excluir equipamento',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('client_equipments').delete().eq('id', eq.id);
      if (error) throw error;
      toast.success(`"${eq.name}" excluído`);
      fetchClientAndOrders();
    } catch (err: any) {
      toast.error('Não foi possível excluir o equipamento', {
        description: err.message || 'Erro inesperado.',
      });
    }
  };

  const handleEditEquipment = (eq: any) => {
    setEditingEqId(eq.id);
    setEqName(eq.name);
    setEqBrand(eq.brand || '');
    setEqModel(eq.model || '');
    setEqSerial(eq.serial_number || '');
    setEqCategoryId(eq.category_id || '');
    setEqProcessor(eq.processor || '');
    setEqRam(eq.ram || '');
    setEqStorage(eq.storage || '');
    setEqGpuType(eq.gpu_type || '');
    setEqGpuModel(eq.gpu_model || '');
    window.document.getElementById('equipment-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName || !newCategoryName.trim()) {
      setIsCreatingCategory(false);
      return;
    }

    const catName = newCategoryName.trim();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!profile?.company_id) throw new Error('Empresa do usuário não encontrada.');

      const { data, error } = await supabase
        .from('equipment_categories')
        .insert({ name: catName, company_id: profile.company_id })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCategories([...categories, data]);
        setEqCategoryId(data.id);
        toast.success(`Categoria "${catName}" criada`);
      }
    } catch (err: any) {
      toast.error('Não foi possível criar a categoria', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setIsCreatingCategory(false);
      setNewCategoryName('');
    }
  };

  const cancelEquipmentEdit = () => {
    setEditingEqId(null);
    setEqName('');
    setEqBrand('');
    setEqModel('');
    setEqSerial('');
    setEqCategoryId('');
    setEqProcessor('');
    setEqRam('');
    setEqStorage('');
    setEqGpuType('');
    setEqGpuModel('');
  };

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Carregando detalhes do cliente">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 h-fit">
            <Skeleton className="h-5 w-40 mb-6" />
            <div className="space-y-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <Skeleton className="h-5 w-52 mb-6" />
              <Skeleton className="h-32 w-full" />
            </Card>
            <Card>
              <Skeleton className="h-5 w-44 mb-6" />
              <Skeleton className="h-32 w-full" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-danger" />}
        title="Cliente não encontrado"
        description="O cliente solicitado não existe ou foi excluído."
        action={
          <Link href="/dashboard/clients" className={buttonClasses({ variant: 'secondary' })}>
            <ArrowLeft className="w-4 h-4" aria-hidden /> Voltar para a listagem
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/dashboard/clients"
        backLabel="Voltar para Clientes"
        title={client.name}
        description="Dados de cadastro, equipamentos e histórico de chamados técnicos."
        badges={
          <Badge className="font-mono tabular-nums">#{client.client_number || '—'}</Badge>
        }
        actions={
          !isEditing && (
            <Button
              variant="secondary"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => setIsEditing(true)}
            >
              Editar Dados
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Ficha de cadastro ─── */}
        <Card className="lg:col-span-1 h-fit">
          <CardTitle className="mb-6 border-b border-border pb-3">
            {isEditing ? 'Editar Cadastro' : 'Ficha de Cadastro'}
          </CardTitle>

          {isEditing ? (
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <Field label="Tipo">
                <div className="flex gap-4">
                  {['PF', 'PJ'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-small text-text cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="tipo-cadastro"
                        checked={type === option}
                        onChange={() => setType(option)}
                        className="accent-brand h-4 w-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </Field>

              <Input
                label="Nome / Razão Social"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label={`Documento (${type === 'PF' ? 'CPF' : 'CNPJ'})`}
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder={type === 'PF' ? 'Ex: 123.456.789-00' : 'Ex: 12.345.678/0001-90'}
              />
              <Input
                label="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: cliente@empresa.com"
              />

              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" className="flex-1" loading={saving}>
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsEditing(false);
                    setName(client.name);
                    setType(client.type);
                    setDocument(client.document || '');
                    setPhone(client.phone || '');
                    setEmail(client.email || '');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <dl className="space-y-5">
              <FichaLinha
                icon={client.type === 'PJ' ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                highlight={client.type === 'PJ'}
                label="Tipo de Cadastro"
                value={client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              />
              <FichaLinha
                icon={<FileText className="w-5 h-5" />}
                label={client.type === 'PF' ? 'CPF' : 'CNPJ'}
                value={client.document || '—'}
                mono
              />
              <FichaLinha
                icon={<Phone className="w-5 h-5" />}
                label="Telefone"
                value={client.phone ? formatPhone(client.phone) : '—'}
                mono
              />
              <FichaLinha
                icon={<Mail className="w-5 h-5" />}
                label="E-mail"
                value={client.email || '—'}
              />
            </dl>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-8">
          {/* ─── Equipamentos ─── */}
          <Card>
            <CardTitle className="mb-6 border-b border-border pb-3 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-text-subtle" aria-hidden /> Equipamentos do Cliente
            </CardTitle>

            {equipments.length === 0 ? (
              <p className="text-center py-6 text-small text-text-subtle">
                Nenhum equipamento cadastrado para este cliente.
              </p>
            ) : (
              <div className="mb-6">
                <Table density="compact">
                  <THead>
                    <TR>
                      <TH>Equipamento</TH>
                      <TH>Categoria</TH>
                      <TH>Marca</TH>
                      <TH>Modelo</TH>
                      <TH>N/S (Serial)</TH>
                      <TH align="right">Ações</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {equipments.map((eq) => (
                      <TR key={eq.id}>
                        <TD className="font-semibold">
                          <div className="text-text font-medium">{eq.name}</div>
                          {(eq.processor || eq.ram || eq.storage || eq.gpu_type || eq.gpu_model) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 font-normal">
                              {eq.processor && (
                                <span
                                  className="inline-flex items-center gap-1 text-caption px-1.5 py-0.5 rounded bg-surface-subtle text-text-subtle border border-border"
                                  title={`Processador: ${eq.processor}`}
                                >
                                  <Cpu className="w-3 h-3 text-text-muted shrink-0" aria-hidden />
                                  <span>{eq.processor}</span>
                                </span>
                              )}
                              {eq.ram && (
                                <span
                                  className="inline-flex items-center gap-1 text-caption px-1.5 py-0.5 rounded bg-surface-subtle text-text-subtle border border-border"
                                  title={`Memória RAM: ${eq.ram}`}
                                >
                                  <span>RAM: {eq.ram}</span>
                                </span>
                              )}
                              {eq.storage && (
                                <span
                                  className="inline-flex items-center gap-1 text-caption px-1.5 py-0.5 rounded bg-surface-subtle text-text-subtle border border-border"
                                  title={`Armazenamento: ${eq.storage}`}
                                >
                                  <HardDrive className="w-3 h-3 text-text-muted shrink-0" aria-hidden />
                                  <span>{eq.storage}</span>
                                </span>
                              )}
                              {(eq.gpu_type || eq.gpu_model) && (
                                <span
                                  className="inline-flex items-center gap-1 text-caption px-1.5 py-0.5 rounded bg-surface-subtle text-text-subtle border border-border"
                                  title="Placa de Vídeo"
                                >
                                  <span>
                                    GPU:{' '}
                                    {eq.gpu_type === 'integrada'
                                      ? eq.gpu_model
                                        ? `${eq.gpu_model} (Integrada)`
                                        : 'Integrada'
                                      : eq.gpu_model
                                        ? `${eq.gpu_model} (Dedicada)`
                                        : 'Dedicada'}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </TD>
                        <TD className="text-text-muted">
                          {eq.equipment_categories?.name ? (
                            <Badge>{eq.equipment_categories.name}</Badge>
                          ) : (
                            '—'
                          )}
                        </TD>
                        <TD className="text-text-muted">{eq.brand || '—'}</TD>
                        <TD className="text-text-muted">{eq.model || '—'}</TD>
                        <TD numeric>{eq.serial_number || '—'}</TD>
                        <TD align="right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-1.5"
                              onClick={() => handleShowChecklistHistory(eq)}
                              title="Histórico clínico (checklists)"
                              aria-label={`Histórico clínico de ${eq.name}`}
                            >
                              <ClipboardList className="w-3.5 h-3.5" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-1.5"
                              onClick={() => handleEditEquipment(eq)}
                              title="Editar equipamento"
                              aria-label={`Editar ${eq.name}`}
                            >
                              <Edit className="w-3.5 h-3.5" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-1.5 hover:text-danger"
                              onClick={() => handleDeleteEquipment(eq)}
                              title="Excluir equipamento"
                              aria-label={`Excluir ${eq.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}

            {/* Formulário de equipamento */}
            <form
              id="equipment-form"
              onSubmit={handleSaveEquipment}
              className="border-t border-border pt-5 space-y-4"
            >
              <h4 className="text-small font-semibold text-text flex items-center gap-2">
                {editingEqId ? (
                  <>
                    <Edit className="w-4 h-4 text-text-subtle" aria-hidden /> Atualizar Equipamento
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-text-subtle" aria-hidden /> Cadastrar Novo Equipamento
                  </>
                )}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Identificação / Nome"
                  required
                  placeholder="Ex: Notebook Luan"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                />

                <Field label="Categoria">
                  <div className="flex gap-2">
                    <Select
                      aria-label="Categoria do equipamento"
                      value={eqCategoryId}
                      onChange={(e) => setEqCategoryId(e.target.value)}
                      wrapperClassName="flex-1"
                    >
                      <option value="">Selecione...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 shrink-0"
                      onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                      title="Nova categoria"
                      aria-label="Criar nova categoria"
                      aria-expanded={isCreatingCategory}
                    >
                      <FolderPlus className="w-4 h-4" aria-hidden />
                    </Button>
                  </div>
                </Field>

                {isCreatingCategory && (
                  <div className="col-span-1 md:col-span-2">
                    <Field label="Nova categoria">
                      <div className="flex gap-2">
                        <Input
                          aria-label="Nome da nova categoria"
                          placeholder="Nome da categoria"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          wrapperClassName="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            // Enter aqui salvaria o formulário inteiro de
                            // equipamento; o campo é um sub-fluxo próprio.
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCategory();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleSaveCategory}>
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setNewCategoryName('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </Field>
                  </div>
                )}

                <Input
                  label="Marca"
                  placeholder="Ex: Dell"
                  value={eqBrand}
                  onChange={(e) => setEqBrand(e.target.value)}
                />
                <Input
                  label="Modelo"
                  placeholder="Ex: Latitude 3420"
                  value={eqModel}
                  onChange={(e) => setEqModel(e.target.value)}
                />

                <Field label="Nº de Série / Tag" className="md:col-span-2">
                  <div className="relative">
                    <QrCode
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle pointer-events-none"
                      aria-hidden
                    />
                    <Input
                      aria-label="Número de série"
                      placeholder="Ex: PE091728"
                      value={eqSerial}
                      onChange={(e) => setEqSerial(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </Field>
              </div>

              {/* Especificações Técnicas / Configuração da Máquina (Opcional) */}
              <div className="rounded-xl border border-border/80 bg-surface-subtle/50 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-text-subtle" aria-hidden />
                    <span className="text-small font-semibold text-text">
                      Configuração da Máquina
                    </span>
                  </div>
                  <span className="text-caption font-medium text-text-subtle bg-surface px-2.5 py-0.5 rounded-full border border-border">
                    Opcional
                  </span>
                </div>
                <p className="text-[12px] text-text-subtle">
                  Especificações de hardware (processador, memória, disco e placa de vídeo) para agilizar diagnósticos e orçamentos.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input
                    label="Processador (CPU)"
                    placeholder="Ex: Core i5-1135G7 / Ryzen 5"
                    value={eqProcessor}
                    onChange={(e) => setEqProcessor(e.target.value)}
                  />
                  <Input
                    label="Memória RAM"
                    placeholder="Ex: 16 GB DDR4"
                    value={eqRam}
                    onChange={(e) => setEqRam(e.target.value)}
                  />
                  <Input
                    label="Armazenamento"
                    placeholder="Ex: SSD 512 GB NVMe"
                    value={eqStorage}
                    onChange={(e) => setEqStorage(e.target.value)}
                  />
                  <Field label="Placa de Vídeo">
                    <Select
                      aria-label="Tipo de placa de vídeo"
                      value={eqGpuType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEqGpuType(val);
                        if (!val) setEqGpuModel('');
                      }}
                    >
                      <option value="">Não informado</option>
                      <option value="integrada">Integrada (Onboard)</option>
                      <option value="dedicada">Dedicada (Offboard)</option>
                    </Select>
                  </Field>
                </div>

                {eqGpuType === 'dedicada' && (
                  <div className="pt-1">
                    <Input
                      label="Qual a placa de vídeo dedicada?"
                      placeholder="Ex: NVIDIA GeForce RTX 3060 6GB / GTX 1650"
                      value={eqGpuModel}
                      onChange={(e) => setEqGpuModel(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingEqId && (
                  <Button type="button" variant="secondary" size="sm" onClick={cancelEquipmentEdit}>
                    Cancelar Edição
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  loading={addingEq}
                  icon={
                    editingEqId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />
                  }
                >
                  {editingEqId ? 'Atualizar Equipamento' : 'Adicionar Equipamento'}
                </Button>
              </div>
            </form>
          </Card>

          {/* ─── Histórico de OS ─── */}
          <Card>
            <div className="flex justify-between items-start gap-4 mb-6 border-b border-border pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-text-subtle" aria-hidden /> Ordens de Serviço
                </CardTitle>
                <p className="text-caption text-text-subtle mt-0.5">
                  Chamados técnicos abertos para este cliente.
                </p>
              </div>
              <Link
                href={`/dashboard/orders?new=true&clientId=${client.id}`}
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden /> Abrir OS
              </Link>
            </div>

            {orders.length === 0 ? (
              <EmptyState
                icon={<ClipboardList />}
                title="Nenhuma Ordem de Serviço"
                description="Não há chamados associados a este cliente no momento."
                action={
                  <Link
                    href={`/dashboard/orders?new=true&clientId=${client.id}`}
                    className={buttonClasses({ size: 'sm' })}
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden /> Abrir primeira OS
                  </Link>
                }
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>OS</TH>
                    <TH>Equipamento</TH>
                    <TH>Status</TH>
                    <TH align="center">Data</TH>
                    <TH align="right">Valor</TH>
                  </TR>
                </THead>
                <TBody>
                  {orders.map((order) => (
                    <TR
                      key={order.id}
                      interactive
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      <TD numeric className="text-text-muted">
                        #{order.codigo_os || order.id.slice(0, 8)}
                      </TD>
                      <TD className="font-medium truncate max-w-[180px]">
                        {order.equipment_details}
                      </TD>
                      <TD>
                        <StatusBadge status={order.status} />
                      </TD>
                      <TD align="center" numeric className="text-text-muted">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </TD>
                      <TD align="right" numeric className="font-semibold">
                        R${' '}
                        {Number(order.total_value).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      </div>

      {/* ─── Histórico clínico ─── */}
      <Modal
        open={selectedEqForHistory !== null}
        onClose={() => setSelectedEqForHistory(null)}
        title={`Histórico clínico — ${selectedEqForHistory?.name ?? ''}`}
        description={
          selectedEqForHistory
            ? [
                selectedEqForHistory.brand,
                selectedEqForHistory.model,
                selectedEqForHistory.serial_number
                  ? `S/N: ${selectedEqForHistory.serial_number}`
                  : null,
              ]
                .filter(Boolean)
                .join(' • ')
            : undefined
        }
        size="xl"
      >
        {loadingHistory ? (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando histórico clínico">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : eqChecklistHistory.length === 0 ? (
          <EmptyState
            icon={<Wrench />}
            title="Nenhum checklist registrado"
            description="Este equipamento ainda não passou por uma ordem de serviço com checklist preenchido."
          />
        ) : (
          <div className="relative border-l border-border ml-3 space-y-8 pb-4">
            {eqChecklistHistory.map((historyItem) => (
              <ChecklistTimelineItem
                key={historyItem.id}
                item={historyItem}
                onOpenOrder={(orderId) => {
                  setSelectedEqForHistory(null);
                  router.push(`/dashboard/orders/${orderId}`);
                }}
              />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Subcomponentes locais
   ───────────────────────────────────────────────────────────── */

function FichaLinha({
  icon,
  label,
  value,
  mono = false,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'p-2.5 rounded-2xl border border-glass-border shrink-0',
          highlight ? 'bg-brand/15 text-brand' : 'bg-surface-sunken text-text-muted',
        )}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-caption text-text-subtle uppercase tracking-wider">{label}</dt>
        <dd
          className={cn(
            'text-small font-semibold text-text truncate',
            mono && 'font-mono tabular-nums',
          )}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function ChecklistItems({ checklist }: { checklist: any }) {
  if (!checklist) return null;

  const itemsList = Object.entries(checklist).filter(
    ([key]) => !['password_pin', 'general_notes'].includes(key),
  );

  if (itemsList.length === 0) {
    return (
      <span className="text-caption text-text-subtle italic block mt-1">
        Nenhum item preenchido
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 bg-surface-sunken p-3 rounded-xl border border-border">
      {itemsList.map(([key, val]: [string, any]) => {
        const isChecked = typeof val === 'object' ? val.checked : !!val;
        const note = typeof val === 'object' ? val.observation : '';
        return (
          <div key={key} className="text-caption flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  isChecked ? 'bg-success' : 'bg-danger',
                )}
                aria-hidden
              />
              <span className="text-text capitalize truncate">{key.replace(/_/g, ' ')}</span>
            </div>
            {note && (
              <span className="text-caption text-text-subtle italic pl-3 truncate" title={note}>
                Obs: {note}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChecklistTimelineItem({
  item,
  onOpenOrder,
}: {
  item: any;
  onOpenOrder: (orderId: string) => void;
}) {
  const entry = item.entry_checklist;
  const exit = item.exit_checklist;

  return (
    <div className="relative pl-6">
      <span
        className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-surface-raised border border-border flex items-center justify-center"
        aria-hidden
      >
        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
      </span>

      <div className="bg-surface-sunken border border-border p-4 rounded-xl space-y-3">
        <div className="flex justify-between items-center gap-2">
          {/* Era um <span> com onClick: inalcançável por teclado. */}
          <button
            type="button"
            onClick={() => onOpenOrder(item.id)}
            className="text-small font-semibold text-text hover:text-brand transition-colors font-mono tabular-nums cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            O.S. #{item.service_number || item.id.slice(0, 8)}
          </button>
          <span className="text-caption text-text-subtle font-mono tabular-nums shrink-0">
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-caption text-text-subtle">Status:</span>
          <StatusBadge status={item.status} />
        </div>

        {entry && (
          <div className="space-y-1">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider block">
              Checklist de entrada
            </span>
            <ChecklistItems checklist={entry} />
            {entry.password_pin?.has_password && (
              <p className="text-caption text-text-subtle bg-surface-raised px-2 py-1 rounded-lg inline-block border border-border mt-1">
                Senha/PIN:{' '}
                <span className="text-text font-mono">
                  {entry.password_pin.password_value || 'Sim'}
                </span>
              </p>
            )}
            {entry.general_notes && (
              <p className="text-caption text-text-subtle italic mt-1 bg-surface-raised p-2 rounded-lg border border-border">
                Nota: &quot;{entry.general_notes}&quot;
              </p>
            )}
          </div>
        )}

        {exit && (
          <div className="space-y-1 pt-2 border-t border-border">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider block">
              Checklist de saída
            </span>
            <ChecklistItems checklist={exit} />
            {exit.general_notes && (
              <p className="text-caption text-text-subtle italic mt-1 bg-surface-raised p-2 rounded-lg border border-border">
                Nota: &quot;{exit.general_notes}&quot;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
