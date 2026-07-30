'use client';

import React, { useState, useCallback } from 'react';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import { Shield, User, Lock, Mail, Smartphone, Save, AlertTriangle, CheckCircle2, AlertCircle, Upload, ImageIcon, Trash2 } from 'lucide-react';

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
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // File upload states
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar_url || '');
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sincronizar caso o user carregue depois
  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setWhatsapp(user.whatsapp || '');
      setAvatarUrl(user.avatar_url || '');
      setPreviewUrl(user.avatar_url || '');
    }
  }, [user]);

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  function validateAndSetFile(selectedFile: File) {
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMsg('O arquivo selecionado deve ser uma imagem (JPG, PNG, WEBP).');
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      setErrorMsg('A foto de perfil deve ter no máximo 2MB.');
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setErrorMsg('');
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const selectedFile = e.dataTransfer.files?.[0];
    if (!selectedFile) return;

    validateAndSetFile(selectedFile);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    validateAndSetFile(selectedFile);
  };

  const handleRemovePreview = () => {
    setFile(null);
    setPreviewUrl(avatarUrl);
  };

  const handleUploadAvatar = async (userId: string): Promise<string> => {
    if (!file) return avatarUrl;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${uniqueName}`;

      const { error: uploadErr } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.warn('Erro de upload para o Storage:', err.message);
      return previewUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let finalAvatarUrl = avatarUrl;
      if (file) {
        finalAvatarUrl = await handleUploadAvatar(user.user_id);
        setAvatarUrl(finalAvatarUrl);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          whatsapp: whatsapp,
          avatar_url: finalAvatarUrl
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

        {/* Coluna 2: Dados Não Editáveis e Foto */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col items-center">
            
            <div className="w-full flex justify-center mb-6">
              <div 
                className={`relative group w-32 h-32 rounded-full border-2 border-dashed ${isDragActive ? 'border-brand bg-brand/5' : 'border-border bg-surface-raised'} transition-colors overflow-hidden flex flex-col items-center justify-center cursor-pointer`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-6 h-6 text-text-muted mx-auto mb-2" />
                    <span className="text-xs text-text-subtle">Foto</span>
                  </div>
                )}
                
                {/* Overlay de hover para troca */}
                <div className="absolute inset-0 bg-surface-overlay/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <Upload className="w-5 h-5 text-text mb-1" />
                  <span className="text-[10px] font-medium text-text">Trocar foto</span>
                </div>
              </div>
            </div>

            {file && (
              <button 
                type="button" 
                onClick={handleRemovePreview}
                className="text-xs text-danger hover:text-danger/80 flex items-center gap-1 mb-4"
              >
                <Trash2 className="w-3 h-3" />
                Remover nova foto
              </button>
            )}

            <h3 className="text-xl font-bold text-text text-center truncate w-full">{user?.full_name || 'Usuário'}</h3>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-surface-raised border border-border rounded-full text-xs font-semibold text-text-muted uppercase tracking-widest mt-3">
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
