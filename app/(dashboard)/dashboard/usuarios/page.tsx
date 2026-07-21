'use client';
import { Settings, Eye, Wrench, Users, UserPlus, Search, AlertCircle, User, Phone, Pencil, Trash2, X, CheckCircle2, Copy, Mail, Shield, Layers } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/context/UserContext';
import { useCompany } from '@/lib/context/CompanyContext';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';

// Static permissions definition to display inside the registration modal
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'Gerenciar membros da equipe',
    'Visualizar lucros & faturamento',
    'Acesso às configurações globais',
    'Editar ordens de serviço'
  ],
  technician: [
    'Atualizar status das OSs',
    'Escrever laudos técnicos',
    'Vincular peças e insumos',
    'Visualizar fila de bancada'
  ],
  viewer: [
    'Cadastrar clientes',
    'Abrir novas Ordens de Serviço',
    'Consultar ordens e prazos',
    'Acesso restrito a painel financeiro'
  ]
};



export default function UserManagementPage() {
  const { user, role, loading: userLoading } = useUser();
  const router = useRouter();
  const { maxTechnicians, isReadOnly } = useCompany();
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('technician');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    const verifyAdminAccess = () => {
      setCheckingAccess(true);
      
      if (role !== 'admin') {
        router.push('/dashboard');
      } else {
        const usingMock = !user;
        setIsMock(usingMock);
        setCheckingAccess(false);
        fetchUsers(usingMock);
      }
    };

    verifyAdminAccess();
  }, [router, role, user, userLoading]);

  async function fetchUsers(forceMock?: boolean) {
    const activeMock = forceMock !== undefined ? forceMock : isMock;
    try {
      setLoading(true);

      if (activeMock) {
        loadLocalUsers();
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      const processed = (data || []).map(p => ({
        id: p.id,
        name: p.full_name || 'Membro da Equipe',
        email: p.email || 'usuario@empresa.com',
        phone: p.phone || '',
        role: p.role || 'technician',
        status: 'Ativo'
      }));
      setUsers(processed);
    } catch (err) {
      console.warn('Erro ao carregar usuários do Supabase, usando mock local:', err);
      loadLocalUsers();
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
        { id: 'p3', name: 'Carlos Oliveira', email: 'carlos@techassist.com.br', phone: '(66) 99999-3333', role: 'viewer', status: 'Ativo' }
      ];
      localStorage.setItem('mock-profiles', JSON.stringify(initialMocks));
      setUsers(initialMocks);
    }
  };

  // Invite flow: generates a secure token, inserts into `invites` table, and produces a copyable link.
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);
    setGeneratedInviteLink('');

    if (isReadOnly) {
      setFormError('A conta está em modo apenas-leitura devido a atraso no pagamento. Não é possível gerar novos convites.');
      setSubmitting(false);
      return;
    }

    const activeTechs = users.filter(u => u.role === 'admin' || u.role === 'technician').length;
    if (selectedRole !== 'viewer' && activeTechs >= maxTechnicians) {
      setFormError(`Limite de técnicos ativos atingido (${activeTechs} de ${maxTechnicians} permitidos no seu plano). Atualize seu plano para convidar mais técnicos.`);
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
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
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

      const link = `${window.location.origin}/invite?token=${token}`;
      setGeneratedInviteLink(link);
      setFormSuccess(true);
    } catch (err: any) {
      console.error('Erro ao gerar convite:', err);
      setFormError(err.message || 'Ocorreu um erro ao gerar o convite.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit flow: updates profile data in the `profiles` table.
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      if (isMock) {
        const localProfiles = localStorage.getItem('mock-profiles') || '[]';
        const currentList = JSON.parse(localProfiles);
        const updatedList = currentList.map((u: any) =>
          u.id === editingUser.id
            ? { ...u, name: fullName, email, phone, role: selectedRole }
            : u
        );
        localStorage.setItem('mock-profiles', JSON.stringify(updatedList));
        setUsers(updatedList);
        setFormSuccess(true);
        setTimeout(() => closeModal(), 1500);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole, full_name: fullName, email, phone })
        .eq('id', editingUser.id);

      if (error) throw error;

      setFormSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchUsers();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err);
      setFormError(err.message || 'Ocorreu um erro ao salvar as alterações.');
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
    setFormError('');
    setFormSuccess(false);
    setIsCreating(true);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o usuário "${name}" do sistema?`)) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Usuário removido com sucesso!');
        fetchUsers();
      } catch (err) {
        console.warn('Erro Supabase, excluindo usuário mock local:', err);
        const localProfiles = localStorage.getItem('mock-profiles');
        if (localProfiles) {
          const parsed = JSON.parse(localProfiles);
          const filtered = parsed.filter((p: any) => p.id !== id);
          localStorage.setItem('mock-profiles', JSON.stringify(filtered));
          setUsers(filtered);
          alert('[Local] Usuário removido com sucesso!');
        }
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
    setFormError('');
    setFormSuccess(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      case 'viewer': return 'Recepcionista';
      default: return 'Colaborador';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-rose-550/20 text-rose-400 border border-rose-500/20';
      case 'technician': return 'bg-indigo-550/20 text-indigo-400 border border-indigo-500/20';
      case 'viewer': return 'bg-amber-550/20 text-amber-400 border border-amber-500/20';
      default: return 'bg-slate-550/20 text-slate-400 border border-slate-500/20';
    }
  };

  const getRoleDetails = (roleKey: string) => {
    switch (roleKey) {
      case 'admin':
        return {
          title: 'Administrador',
          description: 'Acesso completo a todas as seções e relatórios do painel administrativo.',
          icon: <Settings className="w-8 h-8 text-rose-455" />,
          colorClass: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
          permissions: ROLE_PERMISSIONS.admin
        };
      case 'viewer':
        return {
          title: 'Recepcionista',
          description: 'Acesso focado na triagem inicial, cadastro de clientes e consulta de andamento.',
          icon: <Eye className="w-8 h-8 text-amber-500" />,
          colorClass: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
          permissions: ROLE_PERMISSIONS.viewer
        };
      case 'technician':
      default:
        return {
          title: 'Técnico',
          description: 'Perfil especializado no fluxo de reparo das ordens de serviço no laboratório.',
          icon: <Wrench className="w-8 h-8 text-blue-500" />,
          colorClass: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
          permissions: ROLE_PERMISSIONS.technician
        };
    }
  };

  const roleDetails = getRoleDetails(selectedRole);

  const filteredUsers = users.filter((user) => {
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoleLabel(user.role).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (checkingAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900">
        <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Verificando permissões de acesso...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-8 h-8 text-blue-500" /> Usuários
          </h1>
          <p className="text-slate-400 mt-1">Gerencie os membros da sua equipe e atribua permissões de acesso.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Convidar Membro
          </button>
        )}
      </div>

      {/* Campo de Busca (Identical to Clients search) */}
      {!isCreating && (
        <div className="relative w-full md:max-w-md bg-slate-900/40 p-1 rounded-none">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, perfil ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-855 rounded-none py-2 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Listagem da Equipe (Identical to Clients Table format) */}
      {!isCreating && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900">
            <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-sm text-slate-400">Carregando dados da equipe...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900 text-center px-4">
            <AlertCircle className="w-12 h-12 text-slate-650 mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Nenhum colaborador encontrado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">Tente ajustar seus termos de pesquisa.</p>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-950/45">
                    <th className="py-4 px-6 text-center">ID</th>
                    <th className="py-4 px-6">Nome</th>
                    <th className="py-4 px-6">Perfil</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Telefone</th>
                    <th className="py-4 px-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredUsers.map((colaborador, index) => (
                    <tr key={colaborador.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Column 1: Sequential ID */}
                      <td className="py-4 px-6 text-center font-semibold text-slate-450 text-xs font-mono">
                        #{index + 1}
                      </td>
                      {/* Column 2: User Name with Square Profile Icon */}
                      <td className="py-4 px-6 font-bold text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-none shrink-0 bg-blue-500/10 text-blue-400">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-[200px] md:max-w-xs">{colaborador.name}</span>
                        </div>
                      </td>
                      {/* Column 3: Custom Role Badge */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide border uppercase ${getRoleBadgeColor(colaborador.role)}`}>
                          {getRoleLabel(colaborador.role)}
                        </span>
                      </td>
                      {/* Column 4: Email */}
                      <td className="py-4 px-6 text-slate-350 font-mono text-xs">
                        {colaborador.email}
                      </td>
                      {/* Column 5: Telefone with WhatsApp green link */}
                      <td className="py-4 px-6 text-slate-400 text-xs font-mono">
                        {colaborador.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{colaborador.phone}</span>
                            <WhatsAppButton 
                              phone={colaborador.phone} 
                              className="p-1.5 rounded-none shrink-0 bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-650">—</span>
                        )}
                      </td>
                      {/* Column 6: Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(colaborador)}
                            className="text-blue-500 hover:text-blue-450 hover:bg-blue-500/10 p-1.5 rounded-none transition-colors cursor-pointer"
                            title="Editar Colaborador"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(colaborador.id, colaborador.name)}
                            className="text-rose-500 hover:text-rose-455 hover:bg-rose-500/10 p-1.5 rounded-none transition-colors cursor-pointer"
                            title="Remover Colaborador"
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
        )
      )}

      {/* Modal — Convidar Novo Membro (fluxo de convite seguro via `invites` table) */}
      {isCreating && !editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-none w-full max-w-4xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 grid grid-cols-1 md:grid-cols-10">

            <button
              onClick={closeModal}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left side: Invite Form */}
            <div className="p-6 md:p-8 md:col-span-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-850">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5 text-blue-500" /> Convidar Novo Membro
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Um link de convite será gerado. O membro convidado define sua própria senha ao aceitar.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {formError}
                </div>
              )}

              {!formSuccess && (
                <>
                  {isReadOnly ? (
                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                      Sua conta está em modo apenas-leitura. Regularize o faturamento para poder convidar novos membros.
                    </div>
                  ) : (selectedRole !== 'viewer' && users.filter(u => u.role === 'admin' || u.role === 'technician').length >= maxTechnicians) ? (
                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                      Limite de técnicos atingido ({users.filter(u => u.role === 'admin' || u.role === 'technician').length} de {maxTechnicians} permitidos no seu plano). Atualize o plano para poder adicionar mais técnicos.
                    </div>
                  ) : null}
                </>
              )}

              {formSuccess && generatedInviteLink ? (
                <div className="space-y-4">
                  <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="font-semibold text-sm">Convite gerado com sucesso! Copie o link e envie ao membro.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link de Convite (válido por 7 dias)</label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={generatedInviteLink}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-emerald-300 font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedInviteLink);
                        }}
                        title="Copiar link"
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded text-xs transition-colors cursor-pointer mt-2"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail do Membro
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: carlos.tecnico@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> Perfil de Acesso
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="technician">Técnico</option>
                      <option value="viewer">Recepcionista</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-850">
                    <button
                      type="submit"
                      disabled={submitting || isReadOnly || (selectedRole !== 'viewer' && users.filter(u => u.role === 'admin' || u.role === 'technician').length >= maxTechnicians)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? <LoadingSpinner className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Gerar Convite</>}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-2.5 rounded text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right side: Permission preview (role driven) */}
            <div className="p-6 md:p-8 md:col-span-4 bg-[#0a0d16] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Preview de Permissões
                </div>
                <div className={`p-4 border rounded-none transition-all duration-300 ${roleDetails.colorClass}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-950/80 rounded border border-slate-850">
                      {roleDetails.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{roleDetails.title}</h4>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Nível de Acesso</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-4 leading-relaxed font-sans">{roleDetails.description}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ações Autorizadas:</p>
                  <ul className="space-y-1.5">
                    {roleDetails.permissions.map((perm, idx) => (
                      <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-850 text-center md:text-left">
                <span className="text-[10px] font-bold text-slate-650 uppercase tracking-widest block">Trust Care Corp</span>
                <span className="text-[9px] text-slate-500 font-mono">Controle de Segurança de Acesso</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Editar Usuário Existente */}
      {isCreating && editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-none w-full max-w-4xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 grid grid-cols-1 md:grid-cols-10">

            <button
              onClick={closeModal}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left side: Edit Form */}
            <div className="p-6 md:p-8 md:col-span-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-850">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-blue-500" /> Editar Usuário
                </h3>
                <p className="text-xs text-slate-400 mt-1">Atualize as informações do membro da sua equipe.</p>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                {formSuccess && (
                  <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-semibold text-sm">Usuário atualizado com sucesso!</p>
                  </div>
                )}
                {formError && (
                  <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" /> Nome Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Henrique de Souza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: carlos.tecnico@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500" /> Celular (WhatsApp)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: (66) 99233-8238"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" /> Perfil de Acesso
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="technician">Técnico</option>
                    <option value="viewer">Recepcionista</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="submit"
                    disabled={submitting || formSuccess}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <LoadingSpinner className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Alterações'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-2.5 rounded text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>

            {/* Right side: Permission preview */}
            <div className="p-6 md:p-8 md:col-span-4 bg-[#0a0d16] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Preview de Permissões
                </div>
                <div className={`p-4 border rounded-none transition-all duration-300 ${roleDetails.colorClass}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-950/80 rounded border border-slate-850">
                      {roleDetails.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{roleDetails.title}</h4>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Nível de Acesso</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-4 leading-relaxed font-sans">{roleDetails.description}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ações Autorizadas:</p>
                  <ul className="space-y-1.5">
                    {roleDetails.permissions.map((perm, idx) => (
                      <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-850 text-center md:text-left">
                <span className="text-[10px] font-bold text-slate-650 uppercase tracking-widest block">Trust Care Corp</span>
                <span className="text-[9px] text-slate-500 font-mono">Controle de Segurança de Acesso</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
