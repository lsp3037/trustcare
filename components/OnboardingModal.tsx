'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/context/CompanyContext';
import { supabase } from '@/lib/supabase/client';
import { triggerConfetti } from '@/lib/utils/confetti';
import { 
  Building, 
  Phone, 
  Mail, 
  Upload, 
  Loader2, 
  AlertCircle,
  Image as ImageIcon,
  PartyPopper,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function OnboardingModal() {
  const { company, loading: contextLoading, refreshCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  // File upload states
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Status feedback states
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if onboarding is needed
  useEffect(() => {
    if (contextLoading) return;

    const onboardingCompleted = localStorage.getItem('company-onboarded') === 'true';
    
    // Mostra o onboarding se não foi marcado como concluído E a empresa está com valores padrão do mock
    const isDefaultCompany = 
      !company.logo_url && 
      (company.name === 'Trust Care T.I.' || !company.name) && 
      (company.phone === '(66) 99999-9999' || !company.phone);

    if (!onboardingCompleted || isDefaultCompany) {
      const loadInitialFormData = async () => {
        let initialName = '';
        let initialEmail = '';
        let initialPhone = '';

        // 1. Tenta obter do local storage (offline fallback)
        const mockSession = localStorage.getItem('os-session');
        if (mockSession) {
          try {
            const parsed = JSON.parse(mockSession);
            initialName = parsed.company_name || '';
            initialEmail = parsed.email || '';
            initialPhone = parsed.phone || '';
          } catch (e) {
            console.error(e);
          }
        }

        // 2. Tenta obter do Supabase Auth
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (user.user_metadata?.company_name) {
              initialName = user.user_metadata.company_name;
            }
            if (user.email) {
              initialEmail = user.email;
            }
          }
        } catch (err) {
          console.warn('Erro ao obter usuário para onboarding:', err);
        }

        // 3. Se ainda estiver vazio e o contexto tiver dados NÃO genéricos, usa os do contexto
        if (!initialName && company.name && company.name !== 'Trust Care T.I.') {
          initialName = company.name;
        }
        if (!initialPhone && company.phone && company.phone !== '(66) 99999-9999') {
          initialPhone = company.phone;
        }
        if (!initialEmail && company.email && company.email !== 'contato@trustcare.com.br') {
          initialEmail = company.email;
        }

        setTimeout(() => {
          setIsOpen(true);
          setName(initialName);
          setPhone(initialPhone);
          setEmail(initialEmail);
          setLogoUrl(company.logo_url || '');
          setPreviewUrl(company.logo_url || '');
        }, 0);
      };

      loadInitialFormData();
    }
  }, [company, contextLoading]);

  // Drag & Drop validation & handlers
  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMsg('O arquivo deve ser uma imagem (JPG, PNG, WEBP).');
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setErrorMsg('O logotipo deve ter no máximo 2MB.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setErrorMsg('');
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

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

  const handleUploadLogo = async (companyId: string): Promise<string> => {
    if (!file) return logoUrl;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `${companyId}/${uniqueName}`;

      const { error: uploadErr } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no upload';
      console.warn('Erro no upload da imagem de onboarding, usando local:', errorMessage);
      return previewUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      let finalLogoUrl = logoUrl;
      const targetCompanyId = company.id || 'mock-company-id';

      // 1. Upload do logotipo se houver um arquivo selecionado
      if (file) {
        finalLogoUrl = await handleUploadLogo(targetCompanyId);
        setLogoUrl(finalLogoUrl);
      }

      const updateData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logo_url: finalLogoUrl
      };

      // 2. Salva no banco ou localStorage
      if (company.id && company.id !== 'mock-company-id' && company.id.length === 36) {
        const { error: updateErr } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', company.id);

        if (updateErr) throw updateErr;
      } else {
        const localCompany = {
          ...company,
          ...updateData
        };
        localStorage.setItem('mock-company-settings', JSON.stringify(localCompany));
      }

      // 3. Atualiza contexto global
      await refreshCompany();

      // 4. Marca onboarding como finalizado
      localStorage.setItem('company-onboarded', 'true');

      // 5. Aciona animação de celebração com confetes
      setShowCelebration(true);
      triggerConfetti();

      // Atraso de 2.2s para que o usuário aproveite os confetes antes do modal fechar completamente
      setTimeout(() => {
        setIsOpen(false);
        setShowCelebration(false);
      }, 2200);

    } catch (err: unknown) {
      console.error('Erro no salvamento de onboarding:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado.';
      setErrorMsg(`Falha ao salvar configurações: ${errorMessage}`);
      setSaving(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('company-onboarded', 'true');
    setIsOpen(false);
  };

  if (!isOpen || contextLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]">
        
        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-350">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <PartyPopper className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white flex items-center gap-1.5 justify-center">
              Tudo Pronto! <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">
              Sua empresa foi configurada com sucesso. Suas Ordens de Serviço e PDFs agora estão prontos para produção profissional!
            </p>
          </div>
        )}

        {/* Brand/Welcome Left Banner (Mobile: Top) */}
        <div className="md:w-5/12 bg-slate-950/40 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/10">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">Configuração Inicial</h2>
              <p className="text-[11px] text-emerald-450 font-bold uppercase tracking-wider mt-1">Passo Obrigatório</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bem-vindo! Antes de criar sua primeira Ordem de Serviço, vamos configurar a sua empresa para que os seus PDFs fiquem profissionais.
            </p>
          </div>

          <div className="hidden md:block pt-6 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-500 leading-normal">
              Esses dados serão utilizados no cabeçalho dos seus orçamentos e recibos de O.S. impressos ou enviados para os clientes.
            </p>
          </div>
        </div>

        {/* Configuration Form Right Panel */}
        <form onSubmit={handleSave} className="md:w-7/12 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Logo uploader */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block self-start">Logotipo da Assistência</span>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative w-full h-28 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all duration-200 group bg-slate-950/20 ${
                  isDragActive 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-slate-800 hover:border-emerald-500/30'
                }`}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full p-2.5 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Logotipo" className="max-w-full max-h-full object-contain" />
                    
                    <label className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[9px] gap-1 rounded-xl font-bold">
                      <Upload className="w-3.5 h-3.5 text-emerald-455" />
                      <span>Alterar Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                ) : (
                  <div className="text-center p-3 flex flex-col items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-700 group-hover:text-emerald-500/40 transition-colors mb-1" />
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Arraste a logo</span>
                    <label className="text-[8px] text-emerald-450 hover:underline cursor-pointer font-bold mt-0.5">
                      ou selecione no computador
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center rounded-xl text-emerald-450 text-[9px] gap-1.5 font-bold">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enviando logotipo...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1">
              <label htmlFor="onboard-name" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Nome da Empresa / Assistência
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                <input
                  id="onboard-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Trust Care Assistência"
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                />
              </div>
            </div>

            {/* Phone & Email fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="onboard-phone" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                  <input
                    id="onboard-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (66) 99999-9999"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="onboard-email" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                  <input
                    id="onboard-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contato@suaempresa.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="border-t border-slate-800/80 pt-5 mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-350 transition-colors"
            >
              Configurar depois
            </button>

            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 disabled:shadow-none cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span>Concluir configurações da Empresa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
