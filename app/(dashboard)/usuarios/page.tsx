'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Trash2, 
  Pencil,
  Mail, 
  User, 
  Lock, 
  Shield, 
  CheckCircle2, 
  X,
  Loader2,
  AlertCircle,
  Phone,
  Layers,
  Wrench,
  Eye,
  Settings,
  Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

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

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.358 5.03l-1.373 5.016 5.137-1.348a9.97 9.97 0 004.866 1.28h.004c5.507 0 9.99-4.478 9.99-9.986 0-2.67-1.04-5.18-2.932-7.07A9.92 9.92 0 0012.012 2zm5.72 14.242c-.25.706-1.464 1.294-2.007 1.348-.48.047-.946.064-3.03-.755-2.668-1.05-4.388-3.766-4.52-3.942-.136-.176-1.1-1.464-1.1-2.79 0-1.328.697-1.98.946-2.242.25-.262.544-.328.726-.328h.518c.163 0 .385-.062.59.43.21.503.714 1.742.775 1.868.062.126.103.272.019.44-.083.167-.126.272-.25.419-.126.146-.263.327-.376.44-.126.126-.26.262-.11.517.15.25.666 1.097 1.428 1.776.98.874 1.802 1.144 2.057 1.272.25.126.398.106.545-.062.146-.17.63-.732.8-.98.17-.25.337-.21.562-.126.224.084 1.428.673 1.674.797.247.126.41.188.47.293.06.104.06.602-.19 1.308z"/>
  </svg>
);

const getWhatsAppLink = (phone: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  let cleanPhone = digits;
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}`;
};

export default function UserManagementPage() {
  const router = useRouter();
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
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('technician'); // Standardized roles
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        setCheckingAccess(true);
        
        // 1. Verify mock session
        const mockSession = localStorage.getItem('os-session');
        let sessionRole = '';
        let usingMock = false;
        if (mockSession) {
          const parsed = JSON.parse(mockSession);
          sessionRole = parsed.role;
          usingMock = true;
        }

        // 2. Verify Supabase Session
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          if (profile) {
            sessionRole = profile.role === 'admin' ? 'admin' : profile.role === 'technician' ? 'tecnico' : 'recepcionista';
            usingMock = false;
          }
        }

        if (sessionRole !== 'admin') {
          router.push('/dashboard');
        } else {
          setIsMock(usingMock);
          setCheckingAccess(false);
          fetchUsers(usingMock);
        }
      } catch (err) {
        console.warn('Erro ao verificar acesso, assumindo offline:', err);
        setIsMock(true);
        setCheckingAccess(false);
        fetchUsers(true);
      }
    };

    verifyAdminAccess();
  }, [router]);

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

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      if (isMock) {
        // Mode Mock / Simulação
        const localProfiles = localStorage.getItem('mock-profiles') || '[]';
        const currentList = JSON.parse(localProfiles);
        
        if (editingUser) {
          // Mode Edit - Local
          const updatedList = currentList.map((u: any) => 
            u.id === editingUser.id 
              ? { ...u, name: fullName, email: email, phone: phone, role: selectedRole } 
              : u
          );
          localStorage.setItem('mock-profiles', JSON.stringify(updatedList));
          setUsers(updatedList);
        } else {
          // Mode Create - Local
          currentList.push({
            id: `mock-profile-${Date.now()}`,
            name: fullName,
            email,
            phone,
            role: selectedRole,
            status: 'Ativo'
          });
          localStorage.setItem('mock-profiles', JSON.stringify(currentList));
          setUsers(currentList);
        }
        
        setFormSuccess(true);
        setTimeout(() => {
          closeModal();
        }, 1500);
        return;
      }

      // Mode Supabase
      if (editingUser) {
        // Mode Edit - Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            role: selectedRole,
            full_name: fullName,
            email: email,
            phone: phone
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        setFormSuccess(true);
        setTimeout(() => {
          closeModal();
          fetchUsers();
        }, 1500);
      } else {
        // Mode Create - Supabase
        let companyId = 'mock-tenant-id';
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', currentUser.id)
            .single();
          if (profile?.company_id) companyId = profile.company_id;
        }

        // Create temporary client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        const { data, error } = await tempClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_id: companyId,
              role: selectedRole,
              phone: phone
            }
          }
        });

        if (error) throw error;

        setFormSuccess(true);
        setTimeout(() => {
          closeModal();
          fetchUsers();
        }, 1500);
      }
      
    } catch (err: any) {
      console.error('Erro na operação com o Supabase:', err);
      setFormError(err.message || 'Ocorreu um erro ao salvar os dados no banco de dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (colaborador: any) => {
    setEditingUser(colaborador);
    setFullName(colaborador.name);
    setEmail(colaborador.email);
    setPhone(colaborador.phone || '');
    setPassword('');
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
    setPassword('');
    setSelectedRole('technician');
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
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
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
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        )}
      </div>

      {/* Campo de Busca (Identical to Clients search) */}
      {!isCreating && (
        <div className="relative w-full md:max-w-md bg-slate-900/40 p-1 rounded-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome, perfil ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-855 rounded-lg py-2 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Listagem da Equipe (Identical to Clients Table format) */}
      {!isCreating && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-sm text-slate-400">Carregando dados da equipe...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900 text-center px-4">
            <AlertCircle className="w-12 h-12 text-slate-650 mb-4" />
            <h3 className="text-lg font-bold text-slate-300">Nenhum colaborador encontrado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">Tente ajustar seus termos de pesquisa.</p>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden shadow-xl">
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
                          <div className="p-1.5 rounded-lg shrink-0 bg-blue-500/10 text-blue-400">
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
                            <a 
                              href={getWhatsAppLink(colaborador.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 p-0.5 hover:bg-emerald-500/10 rounded transition-colors"
                              title="Enviar mensagem no WhatsApp"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                            </a>
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
                            className="text-blue-500 hover:text-blue-450 hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Editar Colaborador"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(colaborador.id, colaborador.name)}
                            className="text-rose-500 hover:text-rose-455 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
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

      {/* Modal / Dialog de Cadastro/Edição de Usuário (Neo-Brutalist Technical HUD layout inside the modal) */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-lg w-full max-w-4xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 grid grid-cols-1 md:grid-cols-10">
            
            {/* Modal Close Button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left side: Form (6 columns) */}
            <div className="p-6 md:p-8 md:col-span-6 space-y-6 border-b md:border-b-0 md:border-r border-slate-850">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-blue-500" /> {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                </h3>
                <p className="text-xs text-slate-455 mt-1">
                  {editingUser ? 'Atualize as informações do membro da sua equipe.' : 'Adicione um novo membro para sua equipe de suporte.'}
                </p>
              </div>

              <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
                {formSuccess && (
                  <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-205">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-semibold text-sm">
                      {editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!'}
                    </p>
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-455">
                    {formError}
                  </div>
                )}

                {/* Nome Completo */}
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
                  {/* E-mail */}
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

                  {/* Celular (WhatsApp) */}
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
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Senha Inicial */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-500" /> {editingUser ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                    </label>
                    <input
                      type="password"
                      placeholder={editingUser ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                      minLength={6}
                      required={!editingUser}
                    />
                  </div>

                  {/* Perfil */}
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
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="submit"
                    disabled={submitting || formSuccess}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : editingUser ? (
                      'Salvar Alterações'
                    ) : (
                      'Salvar Usuário'
                    )}
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

            {/* Right side: Live preview widget (4 columns) */}
            <div className="p-6 md:p-8 md:col-span-4 bg-[#0a0d16] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Preview de Permissões
                </div>
                
                {/* Dynamic Card representation */}
                <div className={`p-4 border rounded-lg transition-all duration-300 ${roleDetails.colorClass}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-950/80 rounded border border-slate-850">
                      {roleDetails.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{roleDetails.title}</h4>
                      <p className="text-[10px] text-slate-455 uppercase font-mono">Nível de Acesso</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-4 leading-relaxed font-sans">
                    {roleDetails.description}
                  </p>
                </div>

                {/* List of Permissions */}
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
