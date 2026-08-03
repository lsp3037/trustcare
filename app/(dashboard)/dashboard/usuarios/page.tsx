'use client';
import {
  Settings,
  Eye,
  Wrench,
  Users,
  UserPlus,
  AlertCircle,
  User,
  Phone,
  Pencil,
  Trash2,
  Copy,
  Shield,
  Layers,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
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
import { useUser } from '@/lib/context/UserContext';
import { useCompany } from '@/lib/context/CompanyContext';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { formatPhone } from '@/lib/utils/phone';
import { cn } from '@/lib/utils';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'Gerenciar membros da equipe',
    'Visualizar lucros & faturamento',
    'Acesso às configurações globais',
    'Editar ordens de serviço',
  ],
  technician: [
    'Atualizar status das OSs',
    'Escrever laudos técnicos',
    'Vincular peças e insumos',
    'Visualizar fila de bancada',
  ],
  viewer: [
    'Cadastrar clientes',
    'Abrir novas Ordens de Serviço',
    'Consultar ordens e prazos',
    'Acesso restrito a painel financeiro',
  ],
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  technician: 'Técnico',
  viewer: 'Recepcionista',
};

const ROLE_TONE: Record<string, 'danger' | 'info' | 'warning' | 'neutral'> = {
  admin: 'danger',
  technician: 'info',
  viewer: 'warning',
};

const getRoleLabel = (role: string) => ROLE_LABEL[role] ?? 'Colaborador';
const getRoleBadgeTone = (role: string) => ROLE_TONE[role] ?? 'neutral';

const ROLE_DETAILS: Record<
  string,
  { title: string; description: string; icon: React.ReactNode; toneClass: string }
> = {
  admin: {
    title: 'Administrador',
    description: 'Acesso completo a todas as seções e relatórios do painel administrativo.',
    icon: <Settings className="w-6 h-6" />,
    toneClass: 'border-danger/25 text-danger bg-danger/10',
  },
  viewer: {
    title: 'Recepcionista',
    description: 'Acesso focado na triagem inicial, cadastro de clientes e consulta de andamento.',
    icon: <Eye className="w-6 h-6" />,
    toneClass: 'border-warning/25 text-warning bg-warning/10',
  },
  technician: {
    title: 'Técnico',
    description: 'Perfil especializado no fluxo de reparo das ordens de serviço no laboratório.',
    icon: <Wrench className="w-6 h-6" />,
    toneClass: 'border-info/25 text-info bg-info/10',
  },
};

export default function UserManagementPage() {
  const { user, role, loading: userLoading } = useUser();
  const router = useRouter();
  const { maxTechnicians, isReadOnly } = useCompany();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('technician');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    setCheckingAccess(true);
    if (role !== 'admin') {
      router.push('/dashboard');
    } else {
      const usingMock = !user;
      setIsMock(usingMock);
      setCheckingAccess(false);
      fetchUsers(usingMock);
    }
  }, [router, role, user, userLoading]);

  async function fetchUsers(forceMock?: boolean) {
    const activeMock = forceMock !== undefined ? forceMock : isMock;
    try {
      setLoading(true);

      if (activeMock) {
        loadLocalUsers();
        return;
      }

      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;

      setUsers(
        (data || []).map((p) => ({
          id: p.id,
          name: p.full_name || 'Membro da Equipe',
          email: p.email || 'usuario@empresa.com',
          phone: p.phone || '',
          role: p.role || 'technician',
          status: 'Ativo',
        })),
      );
    } catch (err) {
      console.warn('Erro ao carregar usuários do Supabase, usando mock local:', err);
      loadLocalUsers();
      toast.warning('Exibindo dados salvos neste dispositivo', {
        description: 'Não foi possível falar com o servidor.',
      });
    } finally {
      setLoading(false);
    }
  }

  const loadLocalUsers = () => {
    const localProfiles = localStorage.getItem('mock-profiles');
    if (localProfiles) {
      setUsers(JSON.parse(localProfiles));
    } else {
      const initialMocks = [
        { id: 'p1', name: 'Luan Sabino Paixão', email: 'luan@techassist.com.br', phone: '(66) 99999-1111', role: 'admin', status: 'Ativo' },
        { id: 'p2', name: 'Samira Paniago', email: 'samira@techassist.com.br', phone: '(66) 99233-8238', role: 'technician', status: 'Ativo' },
        { id: 'p3', name: 'Carlos Oliveira', email: 'carlos@techassist.com.br', phone: '(66) 99999-3333', role: 'viewer', status: 'Ativo' },
      ];
      localStorage.setItem('mock-profiles', JSON.stringify(initialMocks));
      setUsers(initialMocks);
    }
  };

  const activeTechs = users.filter((u) => u.role === 'admin' || u.role === 'technician').length;
  const limiteTecnicosAtingido = selectedRole !== 'viewer' && activeTechs >= maxTechnicians;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneratedInviteLink('');

    if (isReadOnly) {
      toast.error('Convites bloqueados', {
        description:
          'A conta está em modo apenas-leitura por atraso no pagamento. Regularize o faturamento para convidar membros.',
      });
      setSubmitting(false);
      return;
    }

    if (limiteTecnicosAtingido) {
      toast.error('Limite de técnicos atingido', {
        description: `Você tem ${activeTechs} de ${maxTechnicians} permitidos no seu plano. Atualize o plano para convidar mais.`,
      });
      setSubmitting(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuário não autenticado.');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada no perfil.');

      const token =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('invites').insert({
        company_id: profileData.company_id,
        email: email.trim(),
        role: selectedRole,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

      if (error) throw error;

      setGeneratedInviteLink(`${window.location.origin}/invite?token=${token}`);
      toast.success('Convite gerado', { description: 'Copie o link e envie ao novo membro.' });
    } catch (err: any) {
      console.error('Erro ao gerar convite:', err);
      toast.error('Não foi possível gerar o convite', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);

    try {
      if (isMock) {
        const currentList = JSON.parse(localStorage.getItem('mock-profiles') || '[]');
        const updatedList = currentList.map((u: any) =>
          u.id === editingUser.id ? { ...u, name: fullName, email, phone, role: selectedRole } : u,
        );
        localStorage.setItem('mock-profiles', JSON.stringify(updatedList));
        setUsers(updatedList);
        toast.warning('Alteração salva apenas neste dispositivo', {
          description: 'Sem conexão com o servidor.',
        });
        closeModal();
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole, full_name: fullName, email, phone })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success(`"${fullName}" atualizado`);
      closeModal();
      fetchUsers();
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      toast.error('Não foi possível salvar as alterações', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (colaborador: any) => {
    setEditingUser(colaborador);
    setFullName(colaborador.name);
    setEmail(colaborador.email);
    setPhone(colaborador.phone || '');
    setSelectedRole(colaborador.role);
    setIsCreating(true);
  };

  const handleDeleteUser = async (colaborador: any) => {
    const confirmed = await confirm({
      title: `Remover "${colaborador.name}" da equipe?`,
      description:
        'A pessoa perde o acesso ao sistema imediatamente. As ordens de serviço e laudos que ela registrou continuam no histórico.',
      confirmLabel: 'Remover acesso',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', colaborador.id);
      if (error) throw error;

      toast.success(`"${colaborador.name}" removido da equipe`);
      fetchUsers();
    } catch (err) {
      console.warn('Erro Supabase, excluindo usuário mock local:', err);
      const localProfiles = localStorage.getItem('mock-profiles');
      if (localProfiles) {
        const filtered = JSON.parse(localProfiles).filter((p: any) => p.id !== colaborador.id);
        localStorage.setItem('mock-profiles', JSON.stringify(filtered));
        setUsers(filtered);
        toast.warning('Remoção aplicada apenas neste dispositivo', {
          description: 'A pessoa continua com acesso até a próxima sincronização.',
        });
      } else {
        toast.error('Não foi possível remover o usuário');
      }
    }
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setSelectedRole('technician');
    setGeneratedInviteLink('');
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedInviteLink);
      // Copiar sem retorno visual deixa a dúvida de se funcionou.
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar', {
        description: 'Selecione o link e copie manualmente.',
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoleLabel(u.role).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (checkingAccess) {
    return (
      <Card padding="none" aria-busy="true" aria-label="Verificando permissões de acesso">
        <SkeletonTable rows={4} columns={5} />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Users />}
        title="Usuários"
        description="Gerencie os membros da sua equipe e atribua permissões de acesso."
        badges={
          <Badge tone={activeTechs >= maxTechnicians ? 'warning' : 'neutral'}>
            {activeTechs} de {maxTechnicians} técnicos do plano
          </Badge>
        }
        actions={
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setIsCreating(true)}>
            Convidar Membro
          </Button>
        }
      />

      <Toolbar>
        <ToolbarSearch
          aria-label="Buscar membros da equipe"
          placeholder="Buscar por nome, perfil ou email..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
      </Toolbar>

      {loading ? (
        <Card padding="none">
          <SkeletonTable rows={4} columns={5} />
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertCircle />}
            title="Nenhum colaborador encontrado"
            description={
              searchTerm
                ? 'Tente ajustar seus termos de pesquisa.'
                : 'Convide técnicos e recepcionistas para trabalhar junto com você.'
            }
            action={
              searchTerm ? (
                <Button variant="secondary" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              ) : (
                <Button
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => setIsCreating(true)}
                >
                  Convidar primeiro membro
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
                <TH>Perfil</TH>
                <TH>Email</TH>
                <TH>Telefone</TH>
                <TH align="center">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {filteredUsers.map((colaborador, index) => (
                <TR key={colaborador.id}>
                  <TD align="center" numeric className="text-text-muted">
                    #{index + 1}
                  </TD>
                  <TD className="font-semibold">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-1.5 rounded-2xl border border-glass-border shrink-0 bg-info/10 text-info"
                        aria-hidden
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-[200px] md:max-w-xs">
                        {colaborador.name}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={getRoleBadgeTone(colaborador.role)}>
                      {getRoleLabel(colaborador.role)}
                    </Badge>
                  </TD>
                  <TD className="text-text-muted truncate max-w-[220px]">{colaborador.email}</TD>
                  {/* Mesma grade fixa da listagem de clientes (ícone · valor ·
                      ação), para que a coluna de contato tenha o mesmo
                      alinhamento nas duas telas. */}
                  <TD className="text-text-muted">
                    <div className="grid grid-cols-[1rem_1fr_1.75rem] items-center gap-2 min-w-[11rem]">
                      <Phone className="w-3.5 h-3.5 text-text-subtle" aria-hidden />
                      {colaborador.phone ? (
                        <>
                          <span className="font-mono tabular-nums truncate">
                            {formatPhone(colaborador.phone)}
                          </span>
                          <WhatsAppButton phone={colaborador.phone} />
                        </>
                      ) : (
                        <>
                          <span className="text-text-subtle">—</span>
                          <span />
                        </>
                      )}
                    </div>
                  </TD>
                  <TD align="center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1.5"
                        onClick={() => handleEditClick(colaborador)}
                        title="Editar colaborador"
                        aria-label={`Editar ${colaborador.name}`}
                      >
                        <Pencil className="w-4 h-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1.5 hover:text-danger"
                        onClick={() => handleDeleteUser(colaborador)}
                        title="Remover colaborador"
                        aria-label={`Remover ${colaborador.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {/* Convite e edição compartilham o mesmo diálogo: antes eram dois blocos
          quase idênticos, com o painel de permissões duplicado inteiro. */}
      <Modal
        open={isCreating}
        onClose={closeModal}
        title={editingUser ? 'Editar Usuário' : 'Convidar Novo Membro'}
        description={
          editingUser
            ? 'Atualize as informações do membro da sua equipe.'
            : 'Um link de convite será gerado. O membro define a própria senha ao aceitar.'
        }
        size="xl"
        footer={
          generatedInviteLink ? (
            <Button variant="secondary" onClick={closeModal}>
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form={editingUser ? 'form-editar-usuario' : 'form-convite'}
                loading={submitting}
                disabled={!editingUser && (isReadOnly || limiteTecnicosAtingido)}
                icon={editingUser ? undefined : <UserPlus className="w-3.5 h-3.5" />}
              >
                {editingUser ? 'Salvar Alterações' : 'Gerar Convite'}
              </Button>
            </>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">
            {!editingUser && isReadOnly && (
              <p className="p-3 rounded-xl bg-warning/10 border border-warning/25 text-small text-warning">
                Conta em modo apenas-leitura. Regularize o faturamento para convidar novos membros.
              </p>
            )}

            {!editingUser && !isReadOnly && limiteTecnicosAtingido && (
              <p className="p-3 rounded-xl bg-warning/10 border border-warning/25 text-small text-warning">
                Limite de técnicos atingido ({activeTechs} de {maxTechnicians} do seu plano).
                Atualize o plano ou convide como Recepcionista.
              </p>
            )}

            {generatedInviteLink ? (
              <Field
                label="Link de convite"
                hint="Válido por 7 dias. Envie por WhatsApp ou e-mail."
              >
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Link de convite gerado"
                    readOnly
                    value={generatedInviteLink}
                    wrapperClassName="flex-1"
                    className="font-mono text-caption"
                  />
                  <Button type="button" className="shrink-0" onClick={copyInviteLink}>
                    <Copy className="w-3.5 h-3.5" aria-hidden /> Copiar
                  </Button>
                </div>
              </Field>
            ) : editingUser ? (
              <form id="form-editar-usuario" onSubmit={handleUpdateUser} className="space-y-4">
                <Input
                  label="Nome Completo"
                  required
                  placeholder="Ex: Carlos Henrique de Souza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="E-mail"
                    type="email"
                    required
                    placeholder="Ex: carlos@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    label="Celular (WhatsApp)"
                    placeholder="Ex: (66) 99233-8238"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Select
                  label="Perfil de Acesso"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="technician">Técnico</option>
                  <option value="viewer">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </Select>
              </form>
            ) : (
              <form id="form-convite" onSubmit={handleCreateInvite} className="space-y-4">
                <Input
                  label="E-mail do Membro"
                  type="email"
                  required
                  placeholder="Ex: carlos.tecnico@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Select
                  label="Perfil de Acesso"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="technician">Técnico</option>
                  <option value="viewer">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </Select>
              </form>
            )}
          </div>

          <RolePreview role={selectedRole} />
        </div>
      </Modal>
    </div>
  );
}

/** Painel que traduz o perfil escolhido no que a pessoa vai poder fazer. */
function RolePreview({ role }: { role: string }) {
  const details = ROLE_DETAILS[role] ?? ROLE_DETAILS.technician;
  const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.technician;

  return (
    <aside className="md:col-span-2 space-y-4">
      <p className="text-caption font-semibold text-text-subtle uppercase tracking-wider flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5" aria-hidden /> O que este perfil pode fazer
      </p>

      <div className={cn('p-4 border rounded-xl transition-colors', details.toneClass)}>
        <div className="flex items-center gap-3">
          <div className="shrink-0" aria-hidden>
            {details.icon}
          </div>
          <h3 className="text-small font-semibold text-text">{details.title}</h3>
        </div>
        <p className="text-caption text-text-muted mt-3 leading-relaxed">{details.description}</p>
      </div>

      <ul className="space-y-1.5">
        {permissions.map((perm) => (
          <li key={perm} className="text-small text-text-muted flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-text-subtle shrink-0 mt-0.5" aria-hidden />
            <span>{perm}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
