'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import { 
  Users, 
  UserPlus, 
  Loader2, 
  Mail, 
  ShieldAlert, 
  CheckCircle2, 
  X,
  Trash2,
  Copy
} from 'lucide-react';

type Profile = {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  created_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used: boolean;
};

export default function TeamSettingsPage() {
  const router = useRouter();
  const { role, loading: userLoading } = useUser();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('technician');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');


  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Fetch active profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('invites')
        .select('*')
        .eq('used', false)
        .order('created_at', { ascending: false });
      
      if (!invitesError) {
        setInvites(invitesData || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados da equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && role !== 'admin') {
      router.push('/dashboard');
    } else if (role === 'admin') {
      fetchTeamData();
    }
  }, [role, userLoading, router]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    setGeneratedLink('');

    try {
      // 1. Get company ID via an RPC or since RLS handles it, we can just insert and RLS gets our company_id.
      // Wait, we need to pass company_id. Let's get it from our profile context.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('Usuário não autenticado.');

      // We need to fetch the company_id for the current user to insert the invite
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();
        
      if (!profileData?.company_id) throw new Error('Empresa não encontrada.');

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const { data: newInvite, error } = await supabase
        .from('invites')
        .insert({
          company_id: profileData.company_id,
          email: inviteEmail.trim(),
          role: inviteRole,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/invite?token=${token}`;
      setGeneratedLink(link);
      setInviteSuccess('Convite gerado com sucesso! Copie o link abaixo e envie para o membro.');
      setInvites([newInvite, ...invites]);
      
      // Limpar formulário (exceto sucesso/link)
      setInviteEmail('');
      setInviteRole('technician');

    } catch (err: any) {
      console.error('Erro ao gerar convite:', err);
      setInviteError(err.message || 'Falha ao gerar o convite.');
    } finally {
      setInviting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copiado para a área de transferência!');
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) return;
    
    try {
      const { error } = await supabase.from('invites').delete().eq('id', id);
      if (error) throw error;
      setInvites(invites.filter(i => i.id !== id));
    } catch (err) {
      console.error('Erro ao excluir convite:', err);
      alert('Falha ao excluir o convite.');
    }
  };

  if (userLoading || role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-slate-900 rounded-none">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Verificando permissões...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" /> Equipe e Acessos
          </h1>
          <p className="text-sm text-slate-450 mt-1">Gerencie os técnicos e recepcionistas com acesso ao sistema.</p>
        </div>
        
        <button
          onClick={() => {
            setIsInviteModalOpen(true);
            setInviteError('');
            setInviteSuccess('');
            setGeneratedLink('');
          }}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer rounded-none border-b-4 border-emerald-800 hover:border-emerald-600 active:border-b-0 active:translate-y-1"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>Convidar Membro</span>
        </button>
      </div>

      <div className="bg-slate-900 border-2 border-slate-800 shadow-2xl shadow-black/50 overflow-hidden rounded-none">
        {/* Tab Header */}
        <div className="border-b-2 border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-500" />
            Membros Ativos
          </h2>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider bg-slate-900 px-2 py-1 border border-slate-800">{profiles.length} Usuários</span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Usuário</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Cargo/Nível</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">E-mail</th>
                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                      <span className="text-xs text-slate-500 font-mono">Carregando perfis...</span>
                    </div>
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <span className="text-xs text-slate-500 font-mono">Nenhum membro encontrado.</span>
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase text-xs">
                          {profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <span className="font-semibold text-sm text-slate-200">{profile.full_name || 'Usuário Sem Nome'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        profile.role === 'admin' 
                          ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' 
                          : profile.role === 'technician'
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                            : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
                      }`}>
                        [{profile.role}]
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-400 font-mono">{profile.email}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-500 font-mono">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Convites Pendentes */}
      {invites.length > 0 && (
        <div className="bg-slate-900 border-2 border-slate-800 shadow-xl overflow-hidden rounded-none opacity-80 hover:opacity-100 transition-opacity">
          <div className="border-b-2 border-slate-800 bg-slate-950/80 px-6 py-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-500" />
              Convites Pendentes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-800/50">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-slate-800/20">
                    <td className="py-3 px-6">
                      <span className="text-xs text-amber-400/80 font-mono">{invite.email}</span>
                    </td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border border-amber-500/20 text-amber-500/70 bg-amber-500/5">
                        [{invite.role}]
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button 
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Cancelar Convite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Deslizante (Slide-over ou Centered Modal para o Convite) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !inviting && setIsInviteModalOpen(false)}></div>
          
          <div className="relative bg-slate-900 border-2 border-emerald-500/30 w-full max-w-md shadow-2xl shadow-emerald-900/20 rounded-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-950">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Novo Convite</h3>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                disabled={inviting}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvite} className="p-6 space-y-5">
              {inviteError && (
                <div className="p-3 bg-rose-500/10 border-l-2 border-rose-500 text-rose-400 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}
              
              {inviteSuccess && (
                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/50 flex flex-col gap-3">
                  <div className="flex items-start gap-2 text-emerald-400 text-sm font-bold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{inviteSuccess}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      readOnly 
                      value={generatedLink} 
                      className="flex-1 bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 p-2 outline-none"
                    />
                    <button 
                      type="button"
                      onClick={copyToClipboard}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-black transition-colors"
                      title="Copiar Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {!inviteSuccess && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      E-mail do Membro
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="tecnico@exemplo.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-none text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-0 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Nível de Acesso (Role)
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-none text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono appearance-none"
                    >
                      <option value="technician">TÉCNICO (Cria O.S., edita, vê clientes)</option>
                      <option value="viewer">RECEPÇÃO (Visualiza O.S., não edita financeiro)</option>
                      <option value="admin">ADMINISTRADOR (Acesso total)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  FECHAR
                </button>
                {!inviteSuccess && (
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-black font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-all cursor-pointer rounded-none"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    <span>Gerar Convite</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
