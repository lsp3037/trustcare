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
  CheckCircle2,
  PlusCircle,
  UserPlus,
  LayoutDashboard,
  Check
} from 'lucide-react';
import { useCompany } from '@/lib/context/CompanyContext';
import { supabase } from '@/lib/supabase/client';
import { triggerConfetti } from '@/lib/utils/confetti';
import { LoadingSpinner, Button, Field, Input, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Os 3 passos do assistente. Antes cada um era markup copiado. */
const STEPS = [
  { title: 'Branding & Perfil', hint: 'Logotipo, Nome e Contatos' },
  { title: 'Regras & Garantias', hint: 'CDC 90 Dias e Termos no PDF' },
  { title: 'Próximos Passos', hint: 'Primeiras Ações no Sistema' },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="space-y-3 pt-2">
      {STEPS.map((step, i) => {
        const n = i + 1;
        const isCurrent = current === n;
        const isDone = current > n;
        return (
          <li key={step.title}>
            {i > 0 && <span className="block w-0.5 h-4 bg-border ml-3.5 mb-3" aria-hidden />}
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  'w-7 h-7 shrink-0 flex items-center justify-center text-small font-mono font-semibold border',
                  isCurrent && 'bg-brand text-brand-contrast border-brand',
                  isDone && 'bg-brand/10 text-brand border-brand/25',
                  !isCurrent && !isDone && 'bg-surface-sunken text-text-subtle border-border',
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : n}
              </span>
              <div className="min-w-0">
                <p className={cn('text-small font-semibold', isCurrent ? 'text-text' : 'text-text-muted')}>
                  {step.title}
                  {isCurrent && <span className="sr-only"> (passo atual)</span>}
                </p>
                <p className="text-caption text-text-subtle">{step.hint}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Campo com ícone à esquerda. Eram 7 inputs com o mesmo bloco
 * `relative` + ícone posicionado + classe longa, reescritos um a um.
 */
function IconInput({
  icon: Icon,
  label,
  id,
  hint,
  ...props
}: {
  icon: React.ElementType;
  label: string;
  id: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} htmlFor={id} hint={hint} required={props.required}>
      <div className="relative">
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none z-10"
          aria-hidden
        />
        <Input id={id} wrapperClassName="gap-0" className="pl-10" {...props} />
      </div>
    </Field>
  );
}

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface/85 backdrop-blur-md p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative w-full max-w-2xl bg-surface-raised border border-border shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] md:max-h-[85vh]"
      >

        {/* Left Side Banner with Stepper */}
        <div className="md:w-5/12 bg-surface-sunken p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-brand/10 text-brand border border-brand/25 flex items-center justify-center" aria-hidden>
              <Building className="w-6 h-6" />
            </div>

            <div>
              <h2 id="onboarding-title" className="text-h2 text-text">Configuração Inicial</h2>
              <p className="text-caption uppercase tracking-wider text-brand mt-1">
                Passo {currentStep} de {STEPS.length}
              </p>
            </div>

            {/* Visual Stepper */}
            <StepIndicator current={currentStep} />
          </div>

          <div className="hidden md:block pt-6 border-t border-border">
            <p className="text-caption text-text-subtle">
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
                <h3 className="text-h3 text-text flex items-center gap-2">
                  <Building className="w-4 h-4 text-text-subtle" aria-hidden />
                  Identidade da sua Assistência
                </h3>

                {errorMsg && (
                  <p role="alert" className="p-3 bg-danger/10 border border-danger/25 text-danger text-small flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                    <span>{errorMsg}</span>
                  </p>
                )}

                {/* Logo uploader */}
                <Field label="Logotipo da Assistência">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      'relative w-full h-24 border border-dashed flex flex-col items-center justify-center transition-colors group bg-surface-sunken',
                      isDragActive ? 'border-brand bg-brand/5' : 'border-border hover:border-border-strong',
                    )}
                  >
                    {previewUrl ? (
                      <div className="relative w-full h-full p-2.5 flex items-center justify-center">
                        <img src={previewUrl} alt="Logotipo" className="max-w-full max-h-full object-contain" />
                        <label className="absolute inset-0 bg-surface/85 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-text text-caption gap-1">
                          <Upload className="w-3.5 h-3.5 text-brand" aria-hidden />
                          <span>Alterar Logo</span>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                        </label>
                      </div>
                    ) : (
                      <div className="text-center p-3 flex flex-col items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-text-subtle mb-1.5" aria-hidden />
                        <span className="text-caption text-text-subtle">Arraste a logo</span>
                        <label className="text-caption text-brand hover:underline cursor-pointer mt-0.5 focus-within:underline">
                          ou selecione no computador
                          <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                        </label>
                      </div>
                    )}

                    {uploading && (
                      <div className="absolute inset-0 bg-surface/85 flex flex-col items-center justify-center text-brand text-caption gap-1.5">
                        <LoadingSpinner className="w-5 h-5 text-brand" />
                        <span>Enviando logotipo...</span>
                      </div>
                    )}
                  </div>
                </Field>

                <IconInput
                  icon={Building}
                  id="onboard-name"
                  label="Nome da Empresa / Assistência"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Trust Care Assistência"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <IconInput
                    icon={Phone}
                    id="onboard-phone"
                    label="Telefone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(66) 99999-9999"
                  />
                  <IconInput
                    icon={Phone}
                    id="onboard-whatsapp"
                    label="WhatsApp"
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(66) 99999-9999"
                  />
                </div>

                <IconInput
                  icon={Mail}
                  id="onboard-email"
                  label="E-mail Comercial"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaempresa.com"
                />
              </div>

              {/* Actions Step 1 */}
              <div className="border-t border-border pt-4 mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Configurar depois
                </Button>
                <Button type="submit">
                  Próximo Passo <ArrowRight className="w-4 h-4" aria-hidden />
                </Button>
              </div>
            </form>
          )}

          {/* PASSO 2: REGRAS OPERACIONAIS & GARANTIA */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Save} className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h3 className="text-h3 text-text flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-text-subtle" aria-hidden />
                  Regras de Garantia & Termos do PDF
                </h3>

                {errorMsg && (
                  <p role="alert" className="p-3 bg-danger/10 border border-danger/25 text-danger text-small flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                    <span>{errorMsg}</span>
                  </p>
                )}

                <IconInput
                  icon={ShieldCheck}
                  id="onboard-warranty"
                  label="Prazo Padrão de Garantia (Dias)"
                  hint="O Código de Defesa do Consumidor estipula 90 dias de garantia legal."
                  type="number"
                  required
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  placeholder="90"
                  className="pl-10 font-mono tabular-nums"
                />

                <Textarea
                  id="onboard-terms"
                  label="Termos de Garantia (Impresso no PDF)"
                  rows={3}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="min-h-0"
                />

                <Textarea
                  id="onboard-notes"
                  label="Observações Padrão de Orçamentos"
                  rows={2}
                  value={budgetNotes}
                  onChange={(e) => setBudgetNotes(e.target.value)}
                  className="min-h-0"
                />
              </div>

              {/* Actions Step 2 */}
              <div className="border-t border-border pt-4 mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => setCurrentStep(1)}
                >
                  Voltar
                </Button>

                <Button type="submit" loading={saving || uploading}>
                  {saving ? 'Salvando...' : 'Salvar & Avançar'}
                  {!saving && <CheckCircle2 className="w-4 h-4" aria-hidden />}
                </Button>
              </div>
            </form>
          )}

          {/* PASSO 3: CELEBRAÇÃO & AÇÃO IMEDIATA */}
          {currentStep === 3 && (
            <div className="space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 bg-brand/10 text-brand border border-brand/25 flex items-center justify-center mx-auto" aria-hidden>
                  <PartyPopper className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-h2 text-text flex items-center justify-center gap-2">
                    Tudo Pronto! <Sparkles className="w-5 h-5 text-brand" aria-hidden />
                  </h3>
                  <p className="text-small text-text-muted mt-2 max-w-sm mx-auto">
                    Sua assistência técnica <strong className="text-text font-semibold">{name || 'Trust Care'}</strong> está configurada. Escolha por onde quer começar:
                  </p>
                </div>

                {/* Direct Action Cards */}
                <div className="grid grid-cols-1 gap-3 pt-2 text-left">
                  {[
                    {
                      icon: PlusCircle,
                      title: 'Criar 1ª Ordem de Serviço',
                      hint: 'Abra um chamado de manutenção e gere o primeiro PDF',
                      route: '/dashboard/orders?new=true',
                    },
                    {
                      icon: UserPlus,
                      title: 'Cadastrar 1º Cliente',
                      hint: 'Cadastre dados da empresa (PJ) ou pessoa física (PF)',
                      route: '/dashboard/clients?new=true',
                    },
                    {
                      icon: LayoutDashboard,
                      title: 'Ir ao Painel Geral (Dashboard)',
                      hint: 'Explore os gráficos, KPIs e navegação da plataforma',
                      route: '/dashboard',
                    },
                  ].map(({ icon: Icon, title, hint, route }) => (
                    <button
                      key={route}
                      type="button"
                      onClick={() => handleFinishAction(route)}
                      className="p-3 bg-surface-sunken border border-border hover:border-border-strong transition-colors flex items-center justify-between gap-3 group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="p-2 shrink-0 bg-brand/10 text-brand" aria-hidden>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-small font-semibold text-text">{title}</span>
                          <span className="block text-caption text-text-subtle">{hint}</span>
                        </span>
                      </span>
                      <ArrowRight
                        className="w-4 h-4 shrink-0 text-text-subtle group-hover:text-text transition-colors"
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-6 text-center">
                <Button variant="ghost" size="sm" onClick={() => handleFinishAction()}>
                  Fechar assistente de onboarding
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
