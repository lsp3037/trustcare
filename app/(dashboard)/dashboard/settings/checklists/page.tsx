'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Settings,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';

interface ChecklistItemTemplate {
  id: string;
  label: string;
  type: 'boolean';
  required: boolean;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItemTemplate[] = [
  { id: 'charger', label: 'Carregador', type: 'boolean', required: false },
  { id: 'battery', label: 'Bateria', type: 'boolean', required: false },
  { id: 'screen', label: 'Tela/Display', type: 'boolean', required: false },
  { id: 'keyboard', label: 'Teclado', type: 'boolean', required: false },
  { id: 'chassis', label: 'Carcaça (arranhões/amassados)', type: 'boolean', required: false },
  { id: 'password', label: 'Senha de Acesso/PIN', type: 'boolean', required: false },
  { id: 'power', label: 'Ligar/Dar vídeo', type: 'boolean', required: false },
  { id: 'removable_media', label: 'Mídia Removível', type: 'boolean', required: false },
  { id: 'missing_screws', label: 'Parafusos Ausentes', type: 'boolean', required: false }
];

interface EquipmentCategory {
  id: string;
  name: string;
}

export default function ChecklistSettingsPage() {
  const router = useRouter();
  const { role, loading: userLoading } = useUser();
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [items, setItems] = useState<ChecklistItemTemplate[]>([]);
  
  const [newItemLabel, setNewItemLabel] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!userLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  // Carrega as categorias ao montar o componente
  useEffect(() => {
    let active = true;
    const fetchCats = async () => {
      try {
        setErrorMsg('');
        const { data: catData, error } = await supabase
          .from('equipment_categories')
          .select('*')
          .order('name');

        if (error) throw error;
        
        if (active && catData) {
          setCategories(catData);
        }
      } catch (err) {
        const errorObj = err as Error;
        console.warn('Erro ao carregar categorias do Supabase, buscando local:', errorObj.message);
        const mockCats = localStorage.getItem('mock-equipment-categories');
        const allCats = mockCats ? JSON.parse(mockCats) : [
          { id: 'cat1', name: 'Notebook' },
          { id: 'cat2', name: 'Desktop' }
        ];
        if (active) {
          setCategories(allCats);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    
    fetchCats();
    return () => { active = false; };
  }, []);

  // Carrega o template da categoria selecionada
  useEffect(() => {
    if (!selectedCategoryId) return;

    let active = true;
    const fetchTemplate = async () => {
      try {
        setErrorMsg('');
        const { data, error } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('category_id', selectedCategoryId)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          if (data && data.schema && Array.isArray(data.schema.items)) {
            setItems(data.schema.items);
          } else {
            // Tenta buscar nos mocks do localStorage
            const mockTemplatesStr = localStorage.getItem('mock-checklist-templates');
            const mockTemplates = mockTemplatesStr ? JSON.parse(mockTemplatesStr) : {};
            if (mockTemplates[selectedCategoryId] && Array.isArray(mockTemplates[selectedCategoryId].items)) {
              setItems(mockTemplates[selectedCategoryId].items);
            } else {
              setItems(DEFAULT_CHECKLIST_ITEMS);
            }
          }
        }
      } catch (err) {
        const errorObj = err as Error;
        console.warn('Erro ao carregar template, usando padrão:', errorObj.message);
        if (active) {
          const mockTemplatesStr = localStorage.getItem('mock-checklist-templates');
          const mockTemplates = mockTemplatesStr ? JSON.parse(mockTemplatesStr) : {};
          if (mockTemplates[selectedCategoryId] && Array.isArray(mockTemplates[selectedCategoryId].items)) {
            setItems(mockTemplates[selectedCategoryId].items);
          } else {
            setItems(DEFAULT_CHECKLIST_ITEMS);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchTemplate();
    
    return () => { active = false; };
  }, [selectedCategoryId]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim()) return;

    // Gera um slug simples como ID único
    const cleanLabel = newItemLabel.trim();
    const id = cleanLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '');

    // Evita duplicados
    if (items.some(item => item.id === id)) {
      setErrorMsg('Um item semelhante já existe neste checklist.');
      return;
    }

    const newItem: ChecklistItemTemplate = {
      id: id || `item_${Date.now()}`,
      label: cleanLabel,
      type: 'boolean',
      required: false
    };

    setItems([...items, newItem]);
    setNewItemLabel('');
    setErrorMsg('');
  };

  const handleRemoveItem = (idToRemove: string) => {
    setItems(items.filter(item => item.id !== idToRemove));
  };

  const handleToggleRequired = (idToToggle: string) => {
    setItems(items.map(item => {
      if (item.id === idToToggle) {
        return { ...item, required: !item.required };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!selectedCategoryId) return;
    setSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
        if (profile?.company_id) companyId = profile.company_id;
      }

      // Upsert no Supabase
      const { error } = await supabase
        .from('checklist_templates')
        .upsert({
          company_id: companyId,
          category_id: selectedCategoryId,
          schema: { items },
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,category_id' });

      if (error) {
        console.warn('Erro ao salvar no Supabase, salvando localmente:', error.message);
        
        // Salva nos mocks do localStorage
        const mockTemplatesStr = localStorage.getItem('mock-checklist-templates');
        const mockTemplates = mockTemplatesStr ? JSON.parse(mockTemplatesStr) : {};
        mockTemplates[selectedCategoryId] = { items };
        localStorage.setItem('mock-checklist-templates', JSON.stringify(mockTemplates));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const errorObj = err as Error;
      setErrorMsg(errorObj.message || 'Erro desconhecido ao salvar template.');
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Verificando permissões...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header de Configurações */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" /> Configurações de Checklist
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Defina itens obrigatórios e opcionais de entrada e saída por categoria.</p>
            </div>
          </div>
        </div>

        {/* Seleção de Categoria */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selecione a Categoria de Equipamento</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategoryId(val);
                if (!val) {
                  setItems([]);
                  setLoading(false);
                } else {
                  setLoading(true);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Selecione uma categoria...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedCategoryId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Editor de Checklist */}
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-400" /> Itens do Checklist
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-750">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-500 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Carregando template...
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhum item configurado para este checklist. Adicione itens abaixo.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                        <p className="text-[10px] font-mono text-slate-500">ID: {item.id}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Botão de Obrigatório (Brutalist style toggle) */}
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(item.id)}
                          className={`text-[9px] font-bold px-2 py-1 rounded transition-colors ${
                            item.required 
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                              : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {item.required ? 'Obrigatório' : 'Opcional'}
                        </button>

                        {/* Botão Remover */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 bg-slate-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors border border-slate-800/80"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário Inline para Novo Item */}
              <form onSubmit={handleAddItem} className="flex gap-2 pt-2 border-t border-slate-850">
                <input
                  type="text"
                  placeholder="Ex: Estado do teclado, Dobradiças..."
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </form>

            </div>

            {/* Ações e Informações */}
            <div className="space-y-6">
              
              {/* Box de Ação */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</h4>
                
                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-450 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Configuração salva com sucesso!
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-450 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-650/10"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Checklist
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deseja resetar este checklist para as configurações clássicas padrão?')) {
                      setItems(DEFAULT_CHECKLIST_ITEMS);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-450 hover:text-slate-200 py-2 px-3 rounded-xl text-xs transition-colors"
                >
                  Resetar para Padrão
                </button>
              </div>

              {/* Informações de Apoio */}
              <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-6 text-slate-450 space-y-3">
                <h4 className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400" /> Boas práticas
                </h4>
                <ul className="text-[11px] list-disc list-inside space-y-2 leading-relaxed">
                  <li>O checklist dinâmico é ativado assim que um equipamento desta categoria for selecionado na tela de O.S.</li>
                  <li>Marque itens como <strong className="text-rose-400">Obrigatório</strong> para forçar o preenchimento pelo técnico no momento da entrada ou saída.</li>
                  <li>Mantenha as descrições curtas e autoexplicativas para caber nos relatórios de impressão física.</li>
                </ul>
              </div>

            </div>

          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            Selecione uma categoria acima para carregar ou personalizar seu checklist.
          </div>
        )}

      </div>
    </div>
  );
}
