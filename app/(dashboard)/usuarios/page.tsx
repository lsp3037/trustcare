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
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function UserManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Verificação de Acesso
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Estados do Modal
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('tecnico');
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const handleEditClick = (colaborador: any) => {
    setEditingUser(colaborador);
    setFullName(colaborador.name);
    setEmail(colaborador.email);
    setPassword('');
    setSelectedRole(colaborador.role);
    setIsCreating(true);
  };

  // Mapeamento de Roles (Interface -> Banco de Dados)
  const roleMap: Record<string, string> = {
    admin: 'admin',
    tecnico: 'technician',
    recepcionista: 'viewer',
  };

  const reverseRoleMap: Record<string, string> = {
    admin: 'admin',
    technician: 'tecnico',
    viewer: 'recepcionista',
  };

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        setCheckingAccess(true);
        
        // 1. Verifica sessão mock
        const mockSession = localStorage.getItem('os-session');
        let sessionRole = '';
        if (mockSession) {
          const parsed = JSON.parse(mockSession);
          sessionRole = parsed.role;
        }

        // 2. Verifica Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          if (profile) {
            sessionRole = profile.role === 'admin' ? 'admin' : profile.role === 'technician' ? 'tecnico' : 'recepcionista';
          }
        }

        if (sessionRole !== 'admin') {
          // Se não for admin, redireciona para o dashboard
          router.push('/dashboard');
        } else {
          setCheckingAccess(false);
          fetchUsers();
        }
      } catch (err) {
        console.warn('Erro ao verificar acesso, assumindo offline:', err);
        setCheckingAccess(false);
        fetchUsers();
      }
    };

    verifyAdminAccess();
  }, [router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        // Tenta obter emails do mock local correspondente ou deixa o mock local carregar se for localhost
        setUsers(data.map(p => ({
          id: p.id,
          name: p.user_metadata?.full_name || 'Membro da Equipe',
          email: p.email || 'usuario@empresa.com',
          role: reverseRoleMap[p.role] || 'tecnico',
          status: 'Ativo'
        })));
      } else {
        loadLocalUsers();
      }
    } catch (err) {
      console.warn('Erro ao carregar usuários do Supabase, usando mock local:', err);
      loadLocalUsers();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalUsers = () => {
    const localProfiles = localStorage.getItem('mock-profiles');
    if (localProfiles) {
      setUsers(JSON.parse(localProfiles));
    } else {
      const initialMocks = [
        { id: 'p1', name: 'Luan Sabino Paixão', email: 'luan@techassist.com.br', role: 'admin', status: 'Ativo' },
        { id: 'p2', name: 'Samira Paniago', email: 'samira@techassist.com.br', role: 'tecnico', status: 'Ativo' },
        { id: 'p3', name: 'Carlos Oliveira', email: 'carlos@techassist.com.br', role: 'recepcionista', status: 'Ativo' }
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
      if (editingUser) {
        // Modo Edição - Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            role: roleMap[selectedRole]
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        setFormSuccess(true);
        setTimeout(() => {
          closeModal();
          fetchUsers();
        }, 1500);

      } else {
        // Modo Criação - Supabase
        let companyId = 'mock-tenant-id';
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', currentUser.id).single();
          if (profile?.company_id) companyId = profile.company_id;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_id: companyId,
              role: roleMap[selectedRole]
            }
          }
        });

        if (error) {
          throw error;
        }

        setFormSuccess(true);
        setTimeout(() => {
          closeModal();
          fetchUsers();
        }, 1500);
      }

    } catch (err: any) {
      console.warn('Falha Supabase, aplicando operação mock no localStorage:', err.message);
      
      const currentList = [...users];
      if (editingUser) {
        // Modo Edição - Fallback Local
        const updatedList = currentList.map((u) => 
          u.id === editingUser.id 
            ? { ...u, name: fullName, email: email, role: selectedRole } 
            : u
        );
        localStorage.setItem('mock-profiles', JSON.stringify(updatedList));
      } else {
        // Modo Criação - Fallback Local
        currentList.push({
          id: `mock-profile-${Date.now()}`,
          name: fullName,
          email,
          role: selectedRole,
          status: 'Ativo'
        });
        localStorage.setItem('mock-profiles', JSON.stringify(currentList));
      }
      
      setFormSuccess(true);
      setTimeout(() => {
        closeModal();
        fetchUsers();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
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
    setPassword('');
    setSelectedRole('tecnico');
    setFormError('');
    setFormSuccess(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'tecnico': return 'Técnico';
      case 'recepcionista': return 'Recepcionista';
      default: return 'Colaborador';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'tecnico': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'recepcionista': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

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
            <Users className="w-8 h-8 text-blue-500" /> Gerenciamento de Usuários
          </h1>
          <p className="text-slate-400 mt-1">Gerencie os membros da sua equipe e atribua permissões de acesso.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Listagem da Equipe */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400">Carregando dados da equipe...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900 text-center px-4">
          <AlertCircle className="w-12 h-12 text-slate-650 mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Nenhum membro cadastrado</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">Adicione novos colaboradores para gerenciar o sistema.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-950/45">
                  <th className="py-4 px-6">Nome</th>
                  <th className="py-4 px-6">E-mail</th>
                  <th className="py-4 px-6 text-center">Perfil</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map((colaborador) => (
                  <tr key={colaborador.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase shrink-0">
                          {colaborador.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[200px] md:max-w-xs">{colaborador.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-350 font-mono text-xs">{colaborador.email}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide border uppercase ${getRoleBadgeColor(colaborador.role)}`}>
                        {getRoleLabel(colaborador.role)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                        {colaborador.status || 'Ativo'}
                      </span>
                    </td>
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
      )}

      {/* Modal / Dialog de Cadastro de Usuário */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" /> {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              <p className="text-xs text-slate-455 mt-0.5">
                {editingUser ? 'Atualize as informações do membro da sua equipe.' : 'Adicione um novo membro para sua equipe de suporte.'}
              </p>
            </div>

            <form onSubmit={handleCreateOrUpdateUser} className="space-y-4">
              {formSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="font-semibold text-sm">
                    {editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!'}
                  </p>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-455">
                  {formError}
                </div>
              )}

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ex: Carlos Henrique de Souza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Ex: carlos.tecnico@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Senha Inicial */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {editingUser ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder={editingUser ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    minLength={6}
                    required={!editingUser}
                  />
                </div>
              </div>

              {/* Perfil */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perfil</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="tecnico">Técnico</option>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-slate-850">
                <button
                  type="submit"
                  disabled={submitting || formSuccess}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50"
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
                  className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
