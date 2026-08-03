'use client';
import {
  QrCode,
  Building,
  User,
  Phone,
  Mail,
  Laptop,
  Users,
  Plus,
  AlertCircle,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SkeletonTable,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Toolbar,
  ToolbarSearch,
  TR,
  useConfirm,
  useToast,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { formatDocument, validateDocument } from '@/lib/utils/documentValidation';
import { formatPhone } from '@/lib/utils/phone';
import { cn } from '@/lib/utils';

const OFFLINE_HINT = 'Sem conexão com o servidor. A alteração ficou só neste dispositivo.';

export default function ClientsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Formulário de novo cliente
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('PF');
  const [document, setDocument] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fluxo de equipamento encadeado ao cadastro
  const [createdClient, setCreatedClient] = useState<any | null>(null);
  const [addedEquipments, setAddedEquipments] = useState<any[]>([]);
  const [eqName, setEqName] = useState('');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [addingEq, setAddingEq] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('clients').select('*').order('name');

      if (error) throw error;

      setClients(
        (data || []).map((c: any, index: number) => ({
          ...c,
          client_number: c.client_number || 1001 + index,
        })),
      );
    } catch (err) {
      console.warn('Erro ao carregar clientes do Supabase, usando fallback local:', err);
      loadLocalClients();
      toast.warning('Exibindo dados salvos neste dispositivo', {
        description: 'Não foi possível falar com o servidor. A lista pode estar desatualizada.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocalClients = () => {
    const localClients = localStorage.getItem('mock-clients');
    if (localClients) {
      setClients(
        JSON.parse(localClients).map((c: any, index: number) => ({
          ...c,
          client_number: c.client_number || 1001 + index,
        })),
      );
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

    // Validação de documento fica no próprio campo, não num banner no topo:
    // o erro precisa estar onde se corrige.
    if (document && !validateDocument(document)) {
      setDocumentError(
        `${type === 'PF' ? 'CPF' : 'CNPJ'} inválido. Confira os dígitos.`,
      );
      return;
    }
    setDocumentError('');
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        if (profile?.company_id) companyId = profile.company_id;
      }

      const newClientData = { company_id: companyId, type, name, document, phone, email };

      const { data: insertedClient, error } = await supabase
        .from('clients')
        .insert(newClientData)
        .select()
        .single();

      let finalClient = insertedClient;

      if (error) {
        console.warn('Falha Supabase, salvando mock local:', error.message);

        const currentMock = [...clients];
        const nextNumber =
          Math.max(...currentMock.map((c) => c.client_number || 1000), 1000) + 1;
        finalClient = {
          id: `mock-client-${Date.now()}`,
          client_number: nextNumber,
          ...newClientData,
        };
        currentMock.push(finalClient);
        localStorage.setItem('mock-clients', JSON.stringify(currentMock));

        toast.warning('Cliente salvo apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.success(`Cliente "${name}" cadastrado`);
      }

      setCreatedClient(finalClient);
      fetchClients();
    } catch (err: any) {
      toast.error('Não foi possível salvar o cliente', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdClient) return;

    setAddingEq(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
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
        const allEqs = mockEqs ? JSON.parse(mockEqs) : [];

        finalEq = { id: `mock-eq-${Date.now()}`, ...newEq };
        allEqs.push(finalEq);
        localStorage.setItem('mock-equipments', JSON.stringify(allEqs));

        toast.warning('Equipamento salvo apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.success(`"${eqName}" adicionado`);
      }

      setAddedEquipments((prev) => [...prev, finalEq || newEq]);
      setEqName('');
      setEqBrand('');
      setEqModel('');
      setEqSerial('');
    } catch (err: any) {
      toast.error('Não foi possível adicionar o equipamento', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setAddingEq(false);
    }
  };

  const resetCreateFlow = () => {
    setIsCreating(false);
    setCreatedClient(null);
    setAddedEquipments([]);
    setName('');
    setDocument('');
    setDocumentError('');
    setPhone('');
    setEmail('');
    setType('PF');
    setEqName('');
    setEqBrand('');
    setEqModel('');
    setEqSerial('');
    fetchClients();
  };

  const handleDeleteClient = async (client: any) => {
    const confirmed = await confirm({
      title: `Excluir o cliente "${client.name}"?`,
      description:
        'O cadastro, os equipamentos e o histórico de contato somem. Clientes com ordens de serviço vinculadas não podem ser excluídos.',
      confirmLabel: 'Excluir cliente',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', client.id);
      if (error) throw error;

      setClients((prev) => prev.filter((c) => c.id !== client.id));
      toast.success(`Cliente "${client.name}" excluído`);
    } catch (err: any) {
      const isForeignKey =
        err.code === '23503' ||
        err.message?.includes('foreign key constraint') ||
        err.message?.includes('violates foreign key');

      if (isForeignKey) {
        // Não é falha de conexão: é uma regra de negócio. Explica a saída.
        toast.error('Este cliente não pode ser excluído', {
          description:
            'Ele tem ordens de serviço vinculadas. Exclua ou transfira as OS antes de remover o cadastro.',
        });
        return;
      }

      console.warn('Erro ao excluir cliente no Supabase, tentando excluir localmente:', err.message);

      const localClients = localStorage.getItem('mock-clients');
      if (localClients) {
        const filtered = JSON.parse(localClients).filter((c: any) => c.id !== client.id);
        localStorage.setItem('mock-clients', JSON.stringify(filtered));
        setClients((prev) => prev.filter((c) => c.id !== client.id));
        toast.warning('Exclusão aplicada apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.error('Não foi possível excluir o cliente', {
          description: err.message || 'Erro desconhecido.',
        });
      }
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.document && client.document.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const camposBloqueados = submitting || createdClient !== null;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Users />}
        title="Clientes"
        description="Gerencie a base de contatos e clientes da sua empresa."
        actions={
          !isCreating && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsCreating(true)}>
              Novo Cliente
            </Button>
          )
        }
      />

      {isCreating ? (
        <Card padding="lg" className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start gap-4 mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-h2 text-text">Adicionar Novo Cliente</h2>
              <p className="text-small text-text-muted mt-0.5">
                Cadastre uma pessoa física ou jurídica.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetCreateFlow}>
              Cancelar
            </Button>
          </div>

          <form onSubmit={handleCreateClient} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tipo">
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: 'PF', label: 'Pessoa Física' },
                    { value: 'PJ', label: 'Pessoa Jurídica' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center gap-2 text-small text-text cursor-pointer',
                        camposBloqueados && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <input
                        type="radio"
                        name="client-type"
                        checked={type === option.value}
                        onChange={() => setType(option.value)}
                        disabled={camposBloqueados}
                        className="accent-brand h-4 w-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </Field>

              <Input
                label={type === 'PF' ? 'CPF' : 'CNPJ'}
                placeholder={type === 'PF' ? 'Ex: 123.456.789-00' : 'Ex: 12.345.678/0001-90'}
                value={document}
                onChange={(e) => {
                  setDocument(formatDocument(e.target.value));
                  if (documentError) setDocumentError('');
                }}
                maxLength={18}
                disabled={camposBloqueados}
                error={documentError}
                className="font-mono"
              />
            </div>

            <Input
              label={type === 'PF' ? 'Nome Completo' : 'Razão Social'}
              required
              placeholder={
                type === 'PF' ? 'Ex: Carlos Henrique de Souza' : 'Ex: Tech Solutions Ltda'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={camposBloqueados}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Telefone"
                placeholder="Ex: (11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={camposBloqueados}
              />
              <Input
                label="Email"
                type="email"
                placeholder="Ex: cliente@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={camposBloqueados}
              />
            </div>

            {!createdClient && (
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="submit" loading={submitting}>
                  Salvar Cliente
                </Button>
              </div>
            )}
          </form>

          {/* Equipamentos — aparece depois que o cliente existe */}
          {createdClient && (
            <div className="mt-8 pt-8 border-t border-border space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-h3 text-text flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-text-subtle" aria-hidden /> Equipamentos do
                  Cliente
                </h3>
                <Badge tone="info" className="shrink-0">
                  {addedEquipments.length}{' '}
                  {addedEquipments.length === 1 ? 'adicionado' : 'adicionados'}
                </Badge>
              </div>

              {addedEquipments.length > 0 && (
                <Card padding="none">
                  <Table density="compact">
                    <THead>
                      <TR>
                        <TH>Equipamento</TH>
                        <TH>Marca</TH>
                        <TH>Modelo</TH>
                        <TH align="right">Serial</TH>
                        <TH align="center">Ações</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {addedEquipments.map((eq, idx) => (
                        <TR key={eq.id || idx}>
                          <TD className="font-semibold">{eq.name}</TD>
                          <TD className="text-text-muted">{eq.brand || '—'}</TD>
                          <TD className="text-text-muted">{eq.model || '—'}</TD>
                          <TD align="right" numeric>
                            {eq.serial_number || '—'}
                          </TD>
                          <TD align="center">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Plus className="w-3 h-3" />}
                              onClick={() => {
                                setIsCreating(false);
                                router.push(
                                  `/dashboard/orders?new=true&client_id=${createdClient?.id}&equipment_id=${eq.id}`,
                                );
                              }}
                            >
                              Abrir O.S.
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </Card>
              )}

              <form
                onSubmit={handleCreateEquipment}
                className="space-y-4 bg-surface-sunken p-5 rounded-xl border border-border"
              >
                <h4 className="text-caption font-semibold text-text uppercase tracking-wider">
                  Novo Equipamento
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Identificação / Nome"
                    required
                    placeholder="Ex: Notebook do Cliente"
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                  />
                  <Input
                    label="Marca"
                    placeholder="Ex: Lenovo"
                    value={eqBrand}
                    onChange={(e) => setEqBrand(e.target.value)}
                  />
                  <Input
                    label="Modelo"
                    placeholder="Ex: ThinkPad E14"
                    value={eqModel}
                    onChange={(e) => setEqModel(e.target.value)}
                  />
                  <Field label="Nº de Série / Tag">
                    <div className="relative">
                      <QrCode
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle pointer-events-none"
                        aria-hidden
                      />
                      <Input
                        aria-label="Número de série"
                        placeholder="Ex: PF1A2B3C"
                        value={eqSerial}
                        onChange={(e) => setEqSerial(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </Field>
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
                <Button variant="secondary" onClick={resetCreateFlow}>
                  Concluir Cadastro
                </Button>
                <Button
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    const lastEqId =
                      addedEquipments.length > 0
                        ? addedEquipments[addedEquipments.length - 1].id
                        : '';
                    setIsCreating(false);
                    router.push(
                      `/dashboard/orders?new=true&client_id=${createdClient?.id}${lastEqId ? `&equipment_id=${lastEqId}` : ''}`,
                    );
                  }}
                >
                  Concluir e Criar O.S.
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <>
          <Toolbar>
            <ToolbarSearch
              aria-label="Buscar clientes"
              placeholder="Buscar por nome, documento ou email..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
          </Toolbar>

          {loading ? (
            <Card padding="none">
              <SkeletonTable rows={6} columns={5} />
            </Card>
          ) : filteredClients.length === 0 ? (
            <Card>
              <EmptyState
                icon={<AlertCircle />}
                title={searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                description={
                  searchTerm
                    ? 'Tente ajustar seus termos de pesquisa.'
                    : 'Cadastre seus clientes para vincular equipamentos e ordens de serviço a eles.'
                }
                action={
                  searchTerm ? (
                    <Button variant="secondary" onClick={() => setSearchTerm('')}>
                      Limpar busca
                    </Button>
                  ) : (
                    <Button
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => setIsCreating(true)}
                    >
                      Cadastrar primeiro cliente
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <Card padding="none">
              <Table>
                <THead>
                  <TR>
                    <TH align="center">ID</TH>
                    <TH>Nome</TH>
                    <TH>Tipo</TH>
                    <TH>Documento</TH>
                    <TH>Contato</TH>
                    <TH align="center" className="w-12">
                      <span className="sr-only">Ações</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredClients.map((client) => (
                    <TR key={client.id}>
                      <TD align="center" numeric className="text-text-muted">
                        #{client.client_number || client.id.toString().slice(0, 4)}
                      </TD>
                      <TD className="font-semibold">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'p-1.5 rounded-2xl border border-glass-border shrink-0',
                              client.type === 'PJ'
                                ? 'bg-brand/10 text-brand'
                                : 'bg-info/10 text-info',
                            )}
                            aria-hidden
                          >
                            {client.type === 'PJ' ? (
                              <Building className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="truncate max-w-[200px] md:max-w-xs hover:text-brand hover:underline transition-colors rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            {client.name}
                          </Link>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={client.type === 'PJ' ? 'brand' : 'info'}>
                          {client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </Badge>
                      </TD>
                      <TD numeric>{client.document || '—'}</TD>
                      {/* Grade de 3 colunas fixas (ícone · valor · ação) repetida
                          nas duas linhas: mantém ícone, texto e botão do
                          WhatsApp na mesma vertical em todas as linhas da
                          tabela, independentemente do tamanho do número. */}
                      <TD className="text-text-muted">
                        {/* `min-w` só garante folga para o número não truncar;
                            o alinhamento vem da grade, não dele. */}
                        <div className="grid gap-1 min-w-[12rem]">
                          <div className="grid grid-cols-[1rem_1fr_1.75rem] items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-text-subtle" aria-hidden />
                            {client.phone ? (
                              <>
                                <span className="font-mono tabular-nums truncate">
                                  {formatPhone(client.phone)}
                                </span>
                                <WhatsAppButton phone={client.phone} />
                              </>
                            ) : (
                              <>
                                <span className="text-text-subtle">—</span>
                                <span />
                              </>
                            )}
                          </div>

                          <div className="grid grid-cols-[1rem_1fr_1.75rem] items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-text-subtle" aria-hidden />
                            <span
                              className={cn('truncate', !client.email && 'text-text-subtle')}
                              title={client.email || undefined}
                            >
                              {client.email || '—'}
                            </span>
                            <span />
                          </div>
                        </div>
                      </TD>
                      <TD align="center">
                        <DropdownMenu label={`Ações do cliente ${client.name}`}>
                          <DropdownMenuItem href={`/dashboard/clients/${client.id}`}>
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            onSelect={() => handleDeleteClient(client)}
                          >
                            Excluir cliente
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
