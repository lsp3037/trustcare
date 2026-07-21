'use client';
import { AlertTriangle, ArrowLeft, Edit, Trash2, CheckCircle2, Layers, Award, Cpu, Database, Calendar, DollarSign, Percent } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para edição do Produto
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('SSD');
  const [brand, setBrand] = useState('');
  const [capacity, setCapacity] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('5');

  // Estados para especificações dinâmicas de RAM e SSD (Edição)
  const [ramApp, setRamApp] = useState('PC');
  const [ramTech, setRamTech] = useState('DDR4');
  const [ramSpeed, setRamSpeed] = useState('');
  const [ramGb, setRamGb] = useState('8GB');

  const [ssdTech, setSsdTech] = useState('NVMe');
  const [ssdGb, setSsdGb] = useState('480GB');

  // Auxiliar para decodificar especificações a partir do campo 'capacity'
  const parseCapacitySpecs = (catVal: string, capVal: string) => {
    if (!capVal) return;
    if (catVal === 'Memória RAM') {
      const isNotebook = capVal.toLowerCase().includes('notebook');
      setRamApp(isNotebook ? 'Notebook' : 'PC');
      
      const techMatch = capVal.match(/DDR[2345]?/i);
      if (techMatch) setRamTech(techMatch[0].toUpperCase());
      
      const sizeMatch = capVal.match(/\d+GB/i);
      if (sizeMatch) setRamGb(sizeMatch[0].toUpperCase());
      
      const speedMatch = capVal.match(/\d+MHz/i);
      if (speedMatch) setRamSpeed(speedMatch[0]);
    } else if (catVal === 'SSD') {
      const sizeMatch = capVal.match(/\d+(?:GB|TB)/i);
      if (sizeMatch) setSsdGb(sizeMatch[0].toUpperCase());
      
      if (capVal.toLowerCase().includes('nvme')) setSsdTech('NVMe');
      else if (capVal.toLowerCase().includes('m.2 sata')) setSsdTech('M.2 SATA');
      else if (capVal.toLowerCase().includes('sata iii')) setSsdTech('SATA III');
    }
  };

  // Auto-preenchimento dinâmico de Nome e Capacidade (Apenas se o usuário estiver ativamente editando)
  useEffect(() => {
    if (!isEditing) return;

    if (category === 'Memória RAM') {
      const computedCapacity = `${ramGb} ${ramTech}${ramSpeed ? ` ${ramSpeed}` : ''} (${ramApp})`;
      setCapacity(computedCapacity);
      
      const speedPart = ramSpeed ? ` ${ramSpeed}` : '';
      const brandPart = brand ? ` ${brand}` : '';
      setName(`Memória RAM ${ramTech} ${ramGb}${speedPart}${brandPart}`);
    } else if (category === 'SSD') {
      const computedCapacity = `${ssdGb} ${ssdTech}`;
      setCapacity(computedCapacity);
      
      const brandPart = brand ? ` ${brand}` : '';
      setName(`SSD ${ssdGb}${brandPart} ${ssdTech}`);
    }
  }, [category, brand, ramApp, ramTech, ramSpeed, ramGb, ssdTech, ssdGb, isEditing]);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const categories = [
    'HD', 
    'SSD', 
    'Memória RAM', 
    'Placa de Vídeo', 
    'Fonte de Alimentação', 
    'Gabinete',
    'Processador',
    'Placa-Mãe',
    'Cabo / Acessório',
    'Ferramentas',
    'Outro'
  ];

  const fetchProduct = async () => {
    try {
      setLoading(true);
      
      // 1. Tenta buscar do Supabase
      const { data: productData, error } = await supabase
        .from('products_inventory')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (productData) {
        setProduct(productData);
        setName(productData.name);
        setSku(productData.sku);
        setCategory(productData.category || 'SSD');
        setBrand(productData.brand || '');
        setCapacity(productData.capacity || '');
        setQuantity(productData.quantity.toString());
        setCostPrice(productData.cost_price.toString());
        setSalePrice(productData.sale_price.toString());
        setMinStockAlert(productData.min_stock_alert.toString());
        parseCapacitySpecs(productData.category || 'SSD', productData.capacity || '');
      }
    } catch (err) {
      console.warn('Erro ao carregar produto do Supabase, usando mock local:', err);
      
      // Fallback para localStorage
      const localProducts = localStorage.getItem('mock-inventory');
      if (localProducts) {
        const parsed = JSON.parse(localProducts);
        const found = parsed.find((p: any) => p.id === id);
        
        if (found) {
          setProduct(found);
          setName(found.name);
          setSku(found.sku);
          setCategory(found.category || 'SSD');
          setBrand(found.brand || '');
          setCapacity(found.capacity || '');
          setQuantity(found.quantity.toString());
          setCostPrice(found.cost_price.toString());
          setSalePrice(found.sale_price.toString());
          setMinStockAlert(found.min_stock_alert.toString());
          parseCapacitySpecs(found.category || 'SSD', found.capacity || '');
        } else {
          setProduct(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const updatedData = {
        name,
        sku,
        category,
        brand,
        capacity,
        quantity: parseInt(quantity) || 0,
        cost_price: parseFloat(costPrice) || 0,
        sale_price: parseFloat(salePrice) || 0,
        min_stock_alert: parseInt(minStockAlert) || 0,
      };

      const { error } = await supabase
        .from('products_inventory')
        .update(updatedData)
        .eq('id', id);

      if (error) {
        console.warn('Erro no Supabase, atualizando local storage:', error.message);
        
        // Local storage update
        const localProducts = localStorage.getItem('mock-inventory');
        if (localProducts) {
          const parsed = JSON.parse(localProducts);
          const updatedList = parsed.map((p: any) => {
            if (p.id === id) {
              return { ...p, ...updatedData };
            }
            return p;
          });
          localStorage.setItem('mock-inventory', JSON.stringify(updatedList));
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
        fetchProduct();
      }, 1000);

    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm('Tem certeza de que deseja excluir este produto do estoque? Esta ação não pode ser desfeita.')) {
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('products_inventory')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Erro ao deletar no Supabase, deletando do mock local:', error.message);
        
        // Deleta do mock local
        const localProducts = localStorage.getItem('mock-inventory');
        if (localProducts) {
          const parsed = JSON.parse(localProducts);
          const filtered = parsed.filter((p: any) => p.id !== id);
          localStorage.setItem('mock-inventory', JSON.stringify(filtered));
        }
      }

      router.push('/dashboard/inventory');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
      setDeleting(false);
    }
  };

  // Cálculo de Margem de Lucro Bruto
  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const profitValue = sale - cost;
  const profitMargin = sale > 0 ? (profitValue / sale) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900">
        <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Carregando detalhes do produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Produto não encontrado</h2>
        <p className="text-slate-400">O item solicitado não existe no estoque.</p>
        <Link href="/dashboard/inventory" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para a listagem
        </Link>
      </div>
    );
  }

  const isLowStock = product.quantity < product.min_stock_alert;
  const isOut = product.quantity === 0;

  return (
    <div className="space-y-8">
      {/* Header com Navegação */}
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/inventory" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Estoque
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="text-slate-550 font-mono text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-none uppercase tracking-wider">
                SKU: {product.sku}
              </span>
              {product.name}
            </h1>
            <p className="text-slate-400 mt-1">Ficha de especificação técnica e controle de inventário.</p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 font-semibold py-2.5 px-4 rounded-none text-sm flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-4 h-4 text-slate-400" /> Editar Produto
              </button>
            )}
            <button
              onClick={handleDeleteProduct}
              disabled={deleting}
              className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-400 font-semibold py-2.5 px-4 rounded-none text-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {deleting ? <LoadingSpinner className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir Produto
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Cadastro / Edição */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 md:p-8 shadow-2xl h-fit">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3">
            {isEditing ? 'Editar Especificações' : 'Especificações Técnicas'}
          </h3>

          {isEditing ? (
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-450 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Alterações salvas!
                </div>
              )}
              {saveError && (
                <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-xs text-rose-455">
                  {saveError}
                </div>
              )}

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição / Nome do Produto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div className={`grid grid-cols-1 ${category === 'Memória RAM' || category === 'SSD' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                {/* Categoria */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Marca */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Capacidade (Apenas se não for RAM nem SSD) */}
                {category !== 'Memória RAM' && category !== 'SSD' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacidade</label>
                    <input
                      type="text"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Campos Condicionais para Memória RAM */}
              {category === 'Memória RAM' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-none">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Aplicação</label>
                    <select
                      value={ramApp}
                      onChange={(e) => setRamApp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="PC">PC (Desktop)</option>
                      <option value="Notebook">Notebook</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tecnologia</label>
                    <select
                      value={ramTech}
                      onChange={(e) => setRamTech(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="DDR">DDR</option>
                      <option value="DDR2">DDR2</option>
                      <option value="DDR3">DDR3</option>
                      <option value="DDR4">DDR4</option>
                      <option value="DDR5">DDR5</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Velocidade</label>
                    <input
                      type="text"
                      placeholder="Ex: 3200MHz"
                      value={ramSpeed}
                      onChange={(e) => setRamSpeed(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamanho (GB)</label>
                    <select
                      value={ramGb}
                      onChange={(e) => setRamGb(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="2GB">2GB</option>
                      <option value="4GB">4GB</option>
                      <option value="8GB">8GB</option>
                      <option value="16GB">16GB</option>
                      <option value="32GB">32GB</option>
                      <option value="64GB">64GB</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Campos Condicionais para SSD */}
              {category === 'SSD' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-none">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tecnologia SSD</label>
                    <select
                      value={ssdTech}
                      onChange={(e) => setSsdTech(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="SATA III">SATA III</option>
                      <option value="NVMe">NVMe</option>
                      <option value="M.2 SATA">M.2 SATA</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamanho (GB/TB)</label>
                    <select
                      value={ssdGb}
                      onChange={(e) => setSsdGb(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="120GB">120GB</option>
                      <option value="240GB">240GB</option>
                      <option value="480GB">480GB</option>
                      <option value="500GB">500GB</option>
                      <option value="960GB">960GB</option>
                      <option value="1TB">1TB</option>
                      <option value="2TB">2TB</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU / Código</label>
                  <input
                    type="text"
                    value={sku}
                    disabled
                    className="w-full bg-slate-950/55 border border-slate-850 rounded-none py-2 px-3 text-sm text-slate-400 focus:outline-none cursor-not-allowed opacity-60 transition-colors"
                    required
                  />
                </div>

                {/* Alerta */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Qtd */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qtd. em Estoque</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Custo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Venda */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-850 justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-none text-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  {saving ? <LoadingSpinner className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(product.name);
                    setSku(product.sku);
                    setCategory(product.category || 'SSD');
                    setBrand(product.brand || '');
                    setCapacity(product.capacity || '');
                    setQuantity(product.quantity.toString());
                    setCostPrice(product.cost_price.toString());
                    setSalePrice(product.sale_price.toString());
                    setMinStockAlert(product.min_stock_alert.toString());
                  }}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-white font-semibold py-2 px-6 rounded-none text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detalhes Técnicos */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-none bg-slate-950 text-slate-400 border border-slate-800/50">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categoria</p>
                    <p className="text-sm font-semibold text-slate-200">{product.category || 'Outro'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-none bg-slate-950 text-slate-400 border border-slate-800/50">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca</p>
                    <p className="text-sm font-semibold text-slate-200">{product.brand || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-none bg-slate-950 text-slate-400 border border-slate-800/50">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capacidade / Medida</p>
                    <p className="text-sm font-semibold text-slate-200">{product.capacity || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Detalhes de Registro */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-none bg-slate-950 text-slate-400 border border-slate-800/50">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU Interno</p>
                    <p className="text-sm font-semibold text-slate-200 font-mono">{product.sku}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-none bg-slate-950 text-slate-400 border border-slate-800/50">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data de Cadastro</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {new Date(product.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Painel Financeiro e Controle de Quantidades */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Card de Quantidades / Status */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 shadow-2xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Estado do Estoque</h4>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Saldo Atual</p>
                  <p className="text-2xl font-extrabold text-white mt-0.5">
                    {product.quantity} <span className="text-xs text-slate-500 font-normal">unidades</span>
                  </p>
                </div>
                <div className="shrink-0">
                  {isOut ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase tracking-wide">
                      Esgotado
                    </span>
                  ) : isLowStock ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wide animate-pulse">
                      Crítico
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 uppercase tracking-wide">
                      Saudável
                    </span>
                  )}
                </div>
              </div>

              {/* Indicador visual de alerta */}
              <div className="p-3 bg-slate-950/40 rounded-none border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Ponto de Alerta:</span>
                  <span className="text-slate-200">{product.min_stock_alert} un</span>
                </div>
                {isLowStock && (
                  <p className="text-amber-400/90 text-[10px] leading-relaxed">
                    ⚠️ Este produto está abaixo do limite de segurança. Recomenda-se abrir uma requisição de compras.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card Financeiro / Margens */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 shadow-2xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Análise Comercial</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-850 pb-2">
                <span className="text-slate-450 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Custo Unitário:</span>
                <span className="font-semibold text-slate-300">R$ {Number(product.cost_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-850 pb-2">
                <span className="text-slate-450 flex items-center gap-1"><DollarSign className="w-4 h-4 text-emerald-400" /> Venda Unitária:</span>
                <span className="font-bold text-white">R$ {Number(product.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-850 pb-2">
                <span className="text-slate-450 flex items-center gap-1">Lucro por Peça:</span>
                <span className="font-bold text-emerald-450">R$ {profitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Margem de lucro bruto */}
              <div className="p-3 bg-emerald-500/5 rounded-none border border-emerald-500/10 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-500" /> Margem de Lucro:
                </span>
                <span className="font-extrabold text-emerald-400">{profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
