'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PartyPopper, 
  Sparkles, 
  Building, 
  AlertCircle, 
  Upload, 
  ImageIcon, 
  Phone, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  FileText,
  CheckCircle2,
  PlusCircle,
  UserPlus,
  LayoutDashboard,
  Check
} from 'lucide-react';
import { useCompany } from '@/lib/context/CompanyContext';
import { supabase } from '@/lib/supabase/client';
import { triggerConfetti } from '@/lib/utils/confetti';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function OnboardingModal() {
  const router = useRouter();
  const { company, loading: contextLoading, refreshCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);

  // Stepper State (Step 1, Step 2, Step 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Identidade da Empresa
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Step 2: Regras de Garantia & Termos do PDF
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [termsText, setTermsText] = useState('Garantia legal de 90 dias conforme Art. 26 do Código de Defesa do Consumidor (CDC) cobrindo peças substituídas e serviços executados.');
  const [budgetNotes, setBudgetNotes] = useState('Orçamentos possuem validade de 10 dias úteis. Equipamentos prontos não retirados em até 90 dias após a notificação estão sujeitos a taxas de armazenamento.');

  // Global Status Feedback
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if onboarding is needed
  useEffect(() => {
    if (contextLoading) return;

    const onboardingCompleted = localStorage.getItem('company-onboarded') === 'true';
    
    // Mostra o onboarding se não foi marcado como concluído OU a empresa está com valores padrão do mock
    const isDefaultCompany = 
      !company.logo_url && 
      (company.name === 'Trust Care T.I.' || !company.name) && 
      (company.phone === '(66) 99999-9999' || !company.phone);

    if (!onboardingCompleted || isDefaultCompany) {
      const loadInitialFormData = async () => {
        let initialName = '';
        let initialEmail = '';
        let initialPhone = '';
        let initialWhatsapp = '';

        // 1. Tenta obter do local storage (offline fallback)
        const mockSession = localStorage.getItem('os-session');
        if (mockSession) {
          try {
            const parsed = JSON.parse(mockSession);
            initialName = parsed.company_name || '';
            initialEmail = parsed.email || '';
            initialPhone = parsed.phone || '';
            initialWhatsapp = parsed.whatsapp || '';
          } catch (e) {
            console.error(e);
          }
        }

        // 2. Tenta obter do Supabase Auth
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (user.user_metadata?.company_name) initialName = user.user_metadata.company_name;
            if (user.email) initialEmail = user.email;
            if (user.user_metadata?.whatsapp) initialWhatsapp = user.user_metadata.whatsapp;
            if (user.user_metadata?.phone) initialPhone = user.user_metadata.phone;
          }
        } catch (err) {
          console.warn('Erro ao obter usuário para onboarding:', err);
        }

        if (initialWhatsapp && !initialPhone) initialPhone = initialWhatsapp;
        if (initialPhone && !initialWhatsapp) initialWhatsapp = initialPhone;

        if (!initialName && company.name && company.name !== 'Trust Care T.I.') initialName = company.name;
        if (!initialPhone && company.phone && company.phone !== '(66) 99999-9999') initialPhone = company.phone;
        if (!initialWhatsapp && company.whatsapp) initialWhatsapp = company.whatsapp;
        if (!initialEmail && company.email && company.email !== 'contato@trustcare.com.br') initialEmail = company.email;

        setTimeout(() => {
          setIsOpen(true);
          setName(initialName);
          setPhone(initialPhone);
          setWhatsapp(initialWhatsapp);
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
    if (selectedFile) validateAndSetFile(selectedFile);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
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

  // Avançar do Passo 1 para o Passo 2
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome da empresa é obrigatório.');
      return;
    }
    setErrorMsg('');
    setCurrentStep(2);
  };

  // Salvar configurações finais no Passo 2 e ir pro Passo 3
  const handleStep2Save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      let finalLogoUrl = logoUrl;
      const targetCompanyId = company.id || 'mock-company-id';

      if (file) {
        finalLogoUrl = await handleUploadLogo(targetCompanyId);
        setLogoUrl(finalLogoUrl);
      }

      const updateData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logo_url: finalLogoUrl,
        whatsapp: whatsapp.trim()
      };

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

      // Guardar preferências operacionais no localStorage
      localStorage.setItem('company-onboarding-terms', JSON.stringify({
        warrantyDays,
        termsText,
        budgetNotes
      }));

      await refreshCompany();
      localStorage.setItem('company-onboarded', 'true');

      // Transiciona para o Passo 3 (Boas-Vindas) e lança os confetes!
      setCurrentStep(3);
      triggerConfetti();

    } catch (err: unknown) {
      console.error('Erro no salvamento de onboarding:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado.';
      setErrorMsg(`Falha ao salvar configurações: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFinishAction = (route?: string) => {
    localStorage.setItem('company-onboarded', 'true');
    setIsOpen(false);
    if (route) {
      router.push(route);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('company-onboarded', 'true');
    setIsOpen(false);
  };

  if (!isOpen || contextLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-none shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] md:max-h-[85vh]">
        
        {/* Left Side Banner with Stepper */}
        <div className="md:w-5/12 bg-slate-950/50 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-none bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/10">
              <Building className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white leading-tight">Configuração Inicial</h2>
              <p className="text-[11px] text-emerald-450 font-bold uppercase tracking-wider mt-1">
                Passo {currentStep} de 3
              </p>
            </div>

            {/* Visual Stepper */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition-all ${
                  currentStep === 1 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                    : currentStep > 1 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}>
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </div>
                <div>
                  <p className={`text-xs font-bold ${currentStep === 1 ? 'text-white' : 'text-slate-400'}`}>Branding & Perfil</p>
                  <p className="text-[10px] text-slate-500">Logotipo, Nome e Contatos</p>
                </div>
              </div>

              <div className="w-0.5 h-4 bg-slate-800 ml-3.5" />

              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition-all ${
                  currentStep === 2 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                    : currentStep > 2 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}>
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                </div>
                <div>
                  <p className={`text-xs font-bold ${currentStep === 2 ? 'text-white' : 'text-slate-400'}`}>Regras & Garantias</p>
                  <p className="text-[10px] text-slate-500">CDC 90 Dias e Termos no PDF</p>
                </div>
              </div>

              <div className="w-0.5 h-4 bg-slate-800 ml-3.5" />

              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition-all ${
                  currentStep === 3 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                    : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}>
                  3
                </div>
                <div>
                  <p className={`text-xs font-bold ${currentStep === 3 ? 'text-white' : 'text-slate-400'}`}>Próximos Passos</p>
                  <p className="text-[10px] text-slate-500">Primeiras Ações no Sistema</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:block pt-6 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-500 leading-normal">
              Esses dados serão utilizados na personalização visual dos seus PDFs de Ordem de Serviço, orçamentos e comprovantes de entrega.
            </p>
          </div>
        </div>

        {/* Right Side Content Panel */}
        <div className="md:w-7/12 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          
          {/* PASSO 1: BRANDING & PERFIL */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-500" />
                  Identidade da sua Assistência
                </h3>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-none flex items-start gap-2.5">
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
                    className={`relative w-full h-24 rounded-none border border-dashed flex flex-col items-center justify-center transition-all duration-200 group bg-slate-950/20 ${
                      isDragActive 
                        ? 'border-emerald-500 bg-emerald-500/5' 
                        : 'border-slate-800 hover:border-emerald-500/30'
                    }`}
                  >
                    {previewUrl ? (
                      <div className="relative w-full h-full p-2.5 flex items-center justify-center">
                        <img src={previewUrl} alt="Logotipo" className="max-w-full max-h-full object-contain" />
                        <label className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[9px] gap-1 rounded-none font-bold">
                          <Upload className="w-3.5 h-3.5 text-emerald-450" />
                          <span>Alterar Logo</span>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <div className="text-center p-3 flex flex-col items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-700 group-hover:text-emerald-500/40 transition-colors mb-1" />
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Arraste a logo</span>
                        <label className="text-[8px] text-emerald-450 hover:underline cursor-pointer font-bold mt-0.5">
                          ou selecione no computador
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                      </div>
                    )}

                    {uploading && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center rounded-none text-emerald-450 text-[9px] gap-1.5 font-bold">
                        <LoadingSpinner className="w-5 h-5 animate-spin" />
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
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                    />
                  </div>
                </div>

                {/* Phone & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        placeholder="(66) 99999-9999"
                        className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="onboard-whatsapp" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                      <input
                        id="onboard-whatsapp"
                        type="text"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(66) 99999-9999"
                        className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="onboard-email" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    E-mail Comercial
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                    <input
                      id="onboard-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@suaempresa.com"
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Step 1 */}
              <div className="border-t border-slate-800/80 pt-4 mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-350 transition-colors"
                >
                  Configurar depois
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none text-[10px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  <span>Próximo Passo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* PASSO 2: REGRAS OPERACIONAIS & GARANTIA */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Save} className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Regras de Garantia & Termos do PDF
                </h3>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-none flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Prazo Padrão de Garantia */}
                <div className="space-y-1">
                  <label htmlFor="onboard-warranty" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Prazo Padrão de Garantia (Dias)
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                    <input
                      id="onboard-warranty"
                      type="number"
                      required
                      value={warrantyDays}
                      onChange={(e) => setWarrantyDays(e.target.value)}
                      placeholder="90"
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500">O Código de Defesa do Consumidor estipula 90 dias de garantia legal.</p>
                </div>

                {/* Termos de Garantia do PDF */}
                <div className="space-y-1">
                  <label htmlFor="onboard-terms" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Termos de Garantia (Impresso no PDF)
                  </label>
                  <textarea
                    id="onboard-terms"
                    rows={3}
                    value={termsText}
                    onChange={(e) => setTermsText(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans leading-relaxed"
                  />
                </div>

                {/* Observações dos Orçamentos */}
                <div className="space-y-1">
                  <label htmlFor="onboard-notes" className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Observações Padrão de Orçamentos
                  </label>
                  <textarea
                    id="onboard-notes"
                    rows={2}
                    value={budgetNotes}
                    onChange={(e) => setBudgetNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* Actions Step 2 */}
              <div className="border-t border-slate-800/80 pt-4 mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-none text-[10px] flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-none text-[10px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span>Salvar & Avançar</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* PASSO 3: CELEBRAÇÃO & AÇÃO IMEDIATA */}
          {currentStep === 3 && (
            <div className="space-y-6 flex flex-col justify-between h-full animate-in fade-in duration-300">
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <PartyPopper className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-white flex items-center justify-center gap-1.5">
                    Tudo Pronto! <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Sua assistência técnica <strong className="text-emerald-400 font-bold">{name || 'Trust Care'}</strong> está configurada. Escolha por onde quer começar:
                  </p>
                </div>

                {/* Direct Action Cards */}
                <div className="grid grid-cols-1 gap-3 pt-2 text-left">
                  <button
                    onClick={() => handleFinishAction('/dashboard/orders?new=true')}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-none transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Criar 1ª Ordem de Serviço</p>
                        <p className="text-[10px] text-slate-500">Abra um chamado de manutenção e gere o primeiro PDF</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  </button>

                  <button
                    onClick={() => handleFinishAction('/dashboard/clients?new=true')}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/40 rounded-none transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Cadastrar 1º Cliente</p>
                        <p className="text-[10px] text-slate-500">Cadastre dados da empresa (PJ) ou pessoa física (PF)</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </button>

                  <button
                    onClick={() => handleFinishAction('/dashboard')}
                    className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-none transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 text-slate-300 group-hover:bg-slate-700 transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Ir ao Painel Geral (Dashboard)</p>
                        <p className="text-[10px] text-slate-500">Explore os gráficos, KPIs e navegação da plataforma</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 mt-6 text-center">
                <button
                  onClick={() => handleFinishAction()}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Fechar assistente de onboarding
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
