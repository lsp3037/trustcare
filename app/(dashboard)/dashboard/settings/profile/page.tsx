'use client';

import React, { useState } from 'react';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import { Shield, User, Lock, Mail, Smartphone, Save, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Status feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sincronizar caso o user carregue depois
  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setWhatsapp(user.whatsapp || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          whatsapp: whatsapp
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await refreshUser();
      setSuccessMsg('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não conferem.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccessMsg('Senha atualizada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao atualizar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Meu Perfil</h1>
        <p className="text-text-muted mt-1">Gerencie suas informações pessoais e de acesso à plataforma.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Coluna 1: Informações Pessoais */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-border bg-surface-sunken p-5 flex items-center gap-3">
              <User className="w-5 h-5 text-brand" />
              <h2 className="text-lg font-semibold text-text">Dados Pessoais</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-5 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-subtle mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-subtle mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Smartphone className="h-4 w-4 text-text-muted" />
                    </div>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-surface-raised border border-border rounded-xl pl-11 pr-4 py-2.5 text-text focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-brand text-brand-contrast px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-brand-contrast/30 border-t-brand-contrast rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-border bg-surface-sunken p-5 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-text">Segurança da Conta</h2>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-5 space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-500/90 leading-relaxed">
                  Ao redefinir sua senha, você pode ser desconectado de outros dispositivos. Certifique-se de usar uma senha forte e única.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-subtle mb-1.5">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-subtle mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-xl px-4 py-2.5 text-text focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    placeholder="Digite novamente"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 bg-surface-raised border border-border text-text px-5 py-2.5 rounded-xl font-medium hover:bg-surface-overlay hover:border-amber-500/50 hover:text-amber-500 transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <span className="w-4 h-4 border-2 border-text/30 border-t-text rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Coluna 2: Dados Não Editáveis */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm p-6 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center text-3xl font-bold text-brand uppercase mb-4 shadow-inner">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <h3 className="text-xl font-bold text-text truncate w-full">{user?.full_name || 'Usuário'}</h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-raised border border-border rounded-full text-xs font-semibold text-text-muted uppercase tracking-widest mt-3">
              <Shield className="w-3.5 h-3.5 text-brand" />
              {user?.role === 'admin' ? 'Administrador' : user?.role === 'technician' ? 'Técnico' : 'Visualizador'}
            </span>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                E-mail de Acesso
              </label>
              <div className="bg-surface-sunken border border-border/50 rounded-xl px-4 py-2.5 text-text-subtle text-sm cursor-not-allowed">
                {user?.email}
              </div>
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                A alteração de e-mail deve ser solicitada ao administrador da conta por motivos de segurança.
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
