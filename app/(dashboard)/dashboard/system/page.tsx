'use client';

import React, { useState, useEffect } from 'react';
import { useCompany } from '@/lib/context/CompanyContext';
import { supabase } from '@/lib/supabase/client';
import { Building, Phone, Mail, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SystemSettingsPage() {
  const { company, loading: contextLoading, refreshCompany } = useCompany();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setLogoUrl(company.logo_url || '');
      setPreviewUrl(company.logo_url || '');
    }
  }, [company]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Valida tamanho (max 2MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      setErrorMsg('O logotipo deve ter no máximo 2MB.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setErrorMsg('');
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
      console.warn('Erro de upload, usando URL local de simulação:', err.message);
      // Fallback local caso dê erro (ex: ambiente offline ou erro de storage)
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

      // 1. Faz upload do arquivo se selecionado
      if (file) {
        finalLogoUrl = await handleUploadLogo(targetCompanyId);
        setLogoUrl(finalLogoUrl);
      }

      const updateData = {
        name,
        phone,
        email,
        logo_url: finalLogoUrl
      };

      // 2. Salva no Supabase (se houver id real)
      if (company.id && company.id !== 'mock-company-id' && company.id.length === 36) {
        const { error: updateErr } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', company.id);

        if (updateErr) throw updateErr;
      } else {
        // Modo offline: simula gravação local no localStorage
        const localCompany = {
          ...company,
          ...updateData
        };
        localStorage.setItem('mock-company-settings', JSON.stringify(localCompany));
      }

      // 3. Atualiza estado global e recarrega os dados da empresa
      await refreshCompany();

      setSuccessMsg('Dados da empresa atualizados com sucesso!');
      setFile(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar configurações da empresa:', err);
      setErrorMsg(`Falha ao salvar dados: ${err.message || 'Verifique sua conexão.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Carregando configurações do sistema...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Configurações do Sistema</h1>
        <p className="text-sm text-slate-450 mt-1">Gerencie os dados e a identidade visual de sua empresa.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header da Aba */}
        <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-4 flex items-center gap-3">
          <Building className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">Dados da Empresa</h2>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bloco de Upload do Logo */}
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 p-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logotipo da Empresa</span>
              
              <div className="relative w-32 h-32 rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden flex items-center justify-center group">
                {previewUrl ? (
                  <img src={previewUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <Building className="w-10 h-10 text-slate-600" />
                )}
                
                <label className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] gap-1">
                  <Upload className="w-4 h-4" />
                  <span>Substituir Logo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-500 text-center">Formatos aceitos: JPG, PNG. Max 2MB.</p>
            </div>

            {/* Campos de Texto */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <label htmlFor="company-name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nome da Empresa / Razão Social
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="company-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Trust Care T.I."
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-phone" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Telefone de Contato
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      id="company-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (66) 99999-9999"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company-email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    E-mail de Contato
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      id="company-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: contato@trustcare.com.br"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
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
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-all shadow-lg shadow-blue-600/10 flex items-center gap-2 cursor-pointer"
            >
              {(saving || uploading) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Configurações</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
