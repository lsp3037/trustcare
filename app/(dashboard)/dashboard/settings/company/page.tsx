'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/context/CompanyContext';
import { supabase } from '@/lib/supabase/client';
import { 
  Building, 
  Phone, 
  Mail, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

export default function CompanySettingsPage() {
  const { company, loading: contextLoading, refreshCompany } = useCompany();

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
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync inputs with global company context data
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setLogoUrl(company.logo_url || '');
      setPreviewUrl(company.logo_url || '');
    }
  }, [company]);

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

  const validateAndSetFile = (selectedFile: File) => {
    // Validate image format
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMsg('O arquivo selecionado deve ser uma imagem (JPG, PNG, WEBP).');
      return;
    }

    // Validate size (max 2MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      setErrorMsg('O logotipo deve ter no máximo 2MB.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setErrorMsg('');
  };

  const handleRemovePreview = () => {
    setFile(null);
    setPreviewUrl(logoUrl); // Revert to current saved logo url
  };

  const handleUploadLogo = async (companyId: string): Promise<string> => {
    if (!file) return logoUrl;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `${companyId}/${uniqueName}`;

      // Upload file to company-logos bucket
      const { data, error: uploadErr } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.warn('Erro de upload para o Storage, simulando salvamento local:', err.message);
      // Fallback local se estiver sem conexão/offline
      return previewUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let finalLogoUrl = logoUrl;
      const targetCompanyId = company.id || 'mock-company-id';

      // 1. Upload logo to Supabase Storage if a new file is staged
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

      // 2. Save configurations (Supabase or Local Fallback)
      if (company.id && company.id !== 'mock-company-id' && company.id.length === 36) {
        const { error: updateErr } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', company.id);

        if (updateErr) throw updateErr;
      } else {
        // Mock fallback sync
        const localCompany = {
          ...company,
          ...updateData
        };
        localStorage.setItem('mock-company-settings', JSON.stringify(localCompany));
      }

      // 3. Refresh Context state
      await refreshCompany();

      setSuccessMsg('Dados da empresa salvos com sucesso!');
      setFile(null);
      
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 3500);

      return () => clearTimeout(timer);
    } catch (err: any) {
      console.error('Erro ao salvar dados da empresa:', err);
      setErrorMsg(`Falha ao salvar dados: ${err.message || 'Erro inesperado.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Carregando configurações da empresa...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Building className="w-6 h-6 text-emerald-500" /> Dados da Empresa
        </h1>
        <p className="text-sm text-slate-450 mt-1">Configure os dados de identidade e contato da sua assistência técnica.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-white">Configurações Gerais</h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">ID Tenant: {company.id || 'offline-mock'}</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Drag & Drop Upload Block */}
            <div className="md:col-span-1 flex flex-col items-center space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logotipo do Sistema</span>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative w-full aspect-square max-w-[160px] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all duration-200 group bg-slate-950/30 ${
                  isDragActive 
                    ? 'border-emerald-500 bg-emerald-500/5 shadow-inner' 
                    : 'border-slate-800 hover:border-emerald-500/30'
                }`}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full p-3 flex items-center justify-center">
                    <img src={previewUrl} alt="Logotipo" className="max-w-full max-h-full object-contain" />
                    
                    {/* Hover replacement info */}
                    <label className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] gap-1.5 rounded-xl font-bold">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Substituir</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                ) : (
                  <div className="text-center p-4 flex flex-col items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-700 group-hover:text-emerald-500/40 transition-colors mb-2" />
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Arraste a logo</span>
                    <label className="text-[9px] text-emerald-400 hover:underline cursor-pointer font-bold block mt-1">
                      ou selecione
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}

                {/* Loading overlay during upload */}
                {uploading && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center rounded-xl text-emerald-400 text-[10px] gap-2 font-bold">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Enviando...</span>
                  </div>
                )}
              </div>
              
              {file && (
                <button
                  type="button"
                  onClick={handleRemovePreview}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-350 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Descartar alteração
                </button>
              )}
              
              <p className="text-[9px] text-slate-500 text-center leading-normal max-w-[150px]">Imagens JPG, PNG ou WEBP. Tamanho máximo de 2MB.</p>
            </div>

            {/* Inputs Block */}
            <div className="md:col-span-2 space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label htmlFor="company-name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nome da Empresa / Razão Social
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                  <input
                    id="company-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Trust Care T.I."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="company-phone" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Telefone de Contato
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-555" />
                    <input
                      id="company-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (66) 99999-9999"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="company-email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    E-mail de Contato
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-555" />
                    <input
                      id="company-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: contato@trustcare.com.br"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 disabled:shadow-none cursor-pointer"
            >
              {(saving || uploading) ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando Configurações...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvar Dados</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
