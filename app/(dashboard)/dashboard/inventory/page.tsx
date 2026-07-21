'use client';
import { Package, Plus, CheckCircle2, Search, AlertCircle, Boxes, Trash2 } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const filterParam = new URLSearchParams(window.location.search).get('filter');
      if (filterParam === 'low_stock') {
        setShowLowStockOnly(true);
      }
    }
  }, []);

  // Estados para adicionar item no estoque
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [capacity, setCapacity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('');

  // Estados para especificações dinâmicas de RAM e SSD
  const [ramApp, setRamApp] = useState('');
  const [ramTech, setRamTech] = useState('');
  const [ramSpeed, setRamSpeed] = useState('');
  const [ramGb, setRamGb] = useState('');

  const [ssdTech, setSsdTech] = useState('');
  const [ssdGb, setSsdGb] = useState('');

  // Estados dos Filtros por Coluna
  const [filterName, setFilterName] = useState('');
  const [filterSku, setFilterSku] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCapacity, setFilterCapacity] = useState('');
  const [filterQuantity, setFilterQuantity] = useState('');
  const [filterCost, setFilterCost] = useState('');
  const [filterSale, setFilterSale] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Escuta o clique de navegação no menu lateral para voltar ao listado
  useEffect(() => {
    const handleNavClick = () => {
      setIsCreating(false);
    };
    window.addEventListener('nav-estoque-click', handleNavClick);
    return () => {
      window.removeEventListener('nav-estoque-click', handleNavClick);
    };
  }, []);

  const resetForm = () => {
    setName('');
    setSku('');
    setCategory('');
    setBrand('');
    setCapacity('');
    setQuantity('');
    setCostPrice('');
    setSalePrice('');
    setMinStockAlert('');
    setRamApp('');
    setRamTech('');
    setRamSpeed('');
    setRamGb('');
    setSsdTech('');
    setSsdGb('');
  };

  // Auto-preenchimento dinâmico de Nome e Capacidade
  useEffect(() => {
    if (category === 'Memória RAM') {
      if (!ramGb || !ramTech || !ramApp) {
        setCapacity('');
        setName('');
        return;
      }
      const computedCapacity = `${ramGb} ${ramTech}${ramSpeed ? ` ${ramSpeed}` : ''} (${ramApp})`;
      setCapacity(computedCapacity);

      const speedPart = ramSpeed ? ` ${ramSpeed}` : '';
      const brandPart = brand ? ` ${brand}` : '';
      setName(`Memória RAM ${ramTech} ${ramGb}${speedPart}${brandPart}`);
    } else if (category === 'SSD') {
      if (!ssdGb || !ssdTech) {
        setCapacity('');
        setName('');
        return;
      }
      const computedCapacity = `${ssdGb} ${ssdTech}`;
      setCapacity(computedCapacity);

      const brandPart = brand ? ` ${brand}` : '';
      setName(`SSD ${ssdGb}${brandPart} ${ssdTech}`);
    }
  }, [category, brand, ramApp, ramTech, ramSpeed, ramGb, ssdTech, ssdGb]);

  // Geração automática e inteligente de SKU
  useEffect(() => {
    if (!category || !brand) {
      setSku('');
      return;
    }

    // 1. Iniciais da categoria
    const catClean = category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
    const catCode = catClean.slice(0, 3).padEnd(3, 'X');

    // 2. Iniciais da marca
    const brandClean = brand.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
    const brandCode = brandClean.slice(0, 3).padEnd(3, 'X');

    const prefix = `${catCode}-${brandCode}-`;

    // 3. Busca o sequencial inteligente na listagem atual de produtos
    const matchingProducts = products.filter(p => p.sku && p.sku.startsWith(prefix));
    const numbers = matchingProducts.map(p => {
      const parts = p.sku.split('-');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart);
      return isNaN(num) ? 0 : num;
    });

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const paddedNum = String(nextNum).padStart(3, '0');

    setSku(`${prefix}${paddedNum}`);
  }, [category, brand, products]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

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

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_inventory')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (err) {
      console.warn('Erro ao buscar estoque do Supabase, usando fallback local:', err);
      loadLocalProducts();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalProducts = () => {
    const localProducts = localStorage.getItem('mock-inventory');
    if (localProducts) {
      setProducts(JSON.parse(localProducts));
    } else {
      // Fallback de dados mockados com as novas propriedades para T.I.
      const initialMock = [
        { id: 'p1', name: 'SSD 480GB Kingston SATA III', sku: 'SSD-KG-480', category: 'SSD', brand: 'Kingston', capacity: '480GB', quantity: 12, cost_price: 120.00, sale_price: 249.90, min_stock_alert: 5 },
        { id: 'p2', name: 'Memória RAM DDR4 8GB 3200MHz Corsair', sku: 'MEM-CS-8G', category: 'Memória RAM', brand: 'Corsair', capacity: '8GB', quantity: 3, cost_price: 90.00, sale_price: 199.00, min_stock_alert: 5 },
        { id: 'p3', name: 'Cabo de Rede CAT6 Furukawa 10m', sku: 'CAB-FK-10M', category: 'Cabo / Acessório', brand: 'Furukawa', capacity: '10 metros', quantity: 25, cost_price: 15.00, sale_price: 45.00, min_stock_alert: 10 },
        { id: 'p4', name: 'Roteador TP-Link Archer C6 AC1200', sku: 'ROT-TP-C6', category: 'Outro', brand: 'TP-Link', capacity: 'N/A', quantity: 1, cost_price: 110.00, sale_price: 229.00, min_stock_alert: 3 },
        { id: 'p5', name: 'Pasta Térmica Arctic MX-4 4g', sku: 'PST-AR-MX4', category: 'Outro', brand: 'Arctic', capacity: '4g', quantity: 8, cost_price: 25.00, sale_price: 65.00, min_stock_alert: 2 },
      ];
      localStorage.setItem('mock-inventory', JSON.stringify(initialMock));
      setProducts(initialMock);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          companyId = profile.company_id;
        }
      }

      const newProductData = {
        company_id: companyId,
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

      const { error } = await supabase.from('products_inventory').insert(newProductData);

      if (error) {
        console.warn('Falha Supabase, inserindo mock local:', error.message);

        // Salva mock
        const currentMock = [...products];
        currentMock.push({
          id: `mock-prod-${Date.now()}`,
          ...newProductData
        });
        localStorage.setItem('mock-inventory', JSON.stringify(currentMock));
      }

      setFormSuccess(true);
      setTimeout(() => {
        setIsCreating(false);
        resetForm();
        setFormSuccess(false);
        fetchInventory();
      }, 1000);

    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este produto do estoque?')) {
      return;
    }

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

      // Recarrega o estoque
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto.');
    }
  };

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const handleBulkDeleteProducts = async () => {
    const confirmDelete = window.confirm(`Deseja realmente excluir os ${selectedProductIds.length} produtos selecionados do estoque? Esta ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    try {
      setDeletingBulk(true);

      const { error } = await supabase
        .from('products_inventory')
        .delete()
        .in('id', selectedProductIds);

      if (error) throw error;

      setProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)));
      alert('Produtos excluídos com sucesso!');
    } catch (err) {
      console.warn('Erro ao excluir online, aplicando localmente:', err);

      const localProducts = localStorage.getItem('mock-inventory');
      if (localProducts) {
        const parsed = JSON.parse(localProducts);
        const filtered = parsed.filter((p: any) => !selectedProductIds.includes(p.id));
        localStorage.setItem('mock-inventory', JSON.stringify(filtered));
        setProducts(filtered);
        alert('[Offline] Produtos excluídos localmente com sucesso!');
      }
    } finally {
      setSelectedProductIds([]);
      setDeletingBulk(false);
    }
  };

  const hasActiveFilters =
    filterName !== '' ||
    filterSku !== '' ||
    filterCategory !== '' ||
    filterBrand !== '' ||
    filterCapacity !== '' ||
    filterQuantity !== '' ||
    filterCost !== '' ||
    filterSale !== '' ||
    filterStatus !== '';

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLowStock = !showLowStockOnly || (p.quantity < p.min_stock_alert);

    const matchesName = p.name.toLowerCase().includes(filterName.toLowerCase());
    const matchesSku = p.sku.toLowerCase().includes(filterSku.toLowerCase());
    const matchesCategory = filterCategory === '' || (p.category && p.category.toLowerCase() === filterCategory.toLowerCase());
    const matchesBrand = p.brand.toLowerCase().includes(filterBrand.toLowerCase());
    const matchesCapacity = (p.capacity || '').toLowerCase().includes(filterCapacity.toLowerCase());

    let matchesQuantity = true;
    if (filterQuantity === 'low') {
      matchesQuantity = p.quantity < p.min_stock_alert;
    } else if (filterQuantity === 'out') {
      matchesQuantity = p.quantity === 0;
    } else if (filterQuantity === 'ok') {
      matchesQuantity = p.quantity >= p.min_stock_alert;
    } else if (filterQuantity !== '') {
      matchesQuantity = String(p.quantity) === filterQuantity;
    }

    const matchesCost = filterCost === '' || String(p.cost_price).includes(filterCost);
    const matchesSale = filterSale === '' || String(p.sale_price).includes(filterSale);

    let matchesStatus = true;
    if (filterStatus === 'SAUDÁVEL') {
      matchesStatus = p.quantity >= p.min_stock_alert;
    } else if (filterStatus === 'REABASTECER') {
      matchesStatus = p.quantity < p.min_stock_alert && p.quantity > 0;
    } else if (filterStatus === 'ESGOTADO') {
      matchesStatus = p.quantity === 0;
    }

    return (
      matchesSearch &&
      matchesLowStock &&
      matchesName &&
      matchesSku &&
      matchesCategory &&
      matchesBrand &&
      matchesCapacity &&
      matchesQuantity &&
      matchesCost &&
      matchesSale &&
      matchesStatus
    );
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-8 h-8 text-emerald-500" /> Estoque de Produtos
          </h1>
          <p className="text-slate-400 mt-1">Gerencie peças de reposição e componentes da assistência.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-5 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Cadastrar Produto
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">Cadastrar Produto / Peça</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre um item no inventário.</p>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-none hover:bg-slate-800/40 transition-colors"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            {formSuccess && (
              <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Produto cadastrado com sucesso!</p>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-xs text-rose-455">
                {formError}
              </div>
            )}

            {/* Descrição / Nome do Produto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição / Nome do Produto</label>
              <input
                type="text"
                placeholder="Ex: SSD 1TB Kingston NV2 NVMe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className={`grid grid-cols-1 ${category === 'Memória RAM' || category === 'SSD' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  required
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                <input
                  type="text"
                  placeholder="Ex: Kingston"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Capacidade (Apenas se não for RAM nem SSD) */}
              {category !== 'Memória RAM' && category !== 'SSD' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacidade</label>
                  <input
                    type="text"
                    placeholder="Ex: 1TB / 8GB / 10m"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
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
                    required
                  >
                    <option value="">Selecione...</option>
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
                    required
                  >
                    <option value="">Selecione...</option>
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
                    required
                  >
                    <option value="">Selecione...</option>
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
                    required
                  >
                    <option value="">Selecione...</option>
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
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="120GB">120GB</option>
                    <option value="240GB">240GB</option>
                    <option value="256GB">256GB</option>
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SKU / Código</label>
                <input
                  type="text"
                  placeholder="Gerado automaticamente..."
                  value={sku}
                  disabled
                  className="w-full bg-slate-950/55 border border-slate-850 rounded-none py-2 px-3 text-sm text-slate-400 focus:outline-none cursor-not-allowed opacity-60 transition-colors"
                  required
                />
              </div>

              {/* Alerta de Estoque Mínimo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estoque Mínimo (Alerta)</label>
                <input
                  type="number"
                  min="0"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quantidade Inicial */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd. Inicial</label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Preço de Custo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Preço de Venda */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <button
                type="submit"
                disabled={submitting || formSuccess}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-6 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 transition-all duration-200 disabled:opacity-55"
              >
                {submitting ? (
                  <LoadingSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  'Salvar Produto'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Barra de Busca e Filtro Ativo */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full md:max-w-md bg-slate-900/40 p-1 rounded-none border border-slate-800/60 shadow-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por produto, marca, categoria ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {showLowStockOnly && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-none text-xs font-semibold text-rose-400">
                <span>Filtro: Apenas Estoque Baixo</span>
                <button
                  onClick={() => {
                    setShowLowStockOnly(false);
                    if (typeof window !== 'undefined') {
                      window.history.replaceState({}, '', window.location.pathname);
                    }
                  }}
                  className="hover:text-rose-300 font-bold transition-colors ml-1 p-0.5 rounded hover:bg-rose-500/10"
                >
                  ✕
                </button>
              </div>
            )}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterName('');
                  setFilterSku('');
                  setFilterCategory('');
                  setFilterBrand('');
                  setFilterCapacity('');
                  setFilterQuantity('');
                  setFilterCost('');
                  setFilterSale('');
                  setFilterStatus('');
                }}
                className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white px-3 py-2 text-xs font-semibold rounded-none border border-slate-800 transition-all cursor-pointer"
              >
                Limpar Filtros das Colunas
              </button>
            )}
          </div>

          {/* Listagem de Estoque */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900">
              <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-slate-400">Carregando inventário...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-none border border-slate-900 text-center px-4">
              <AlertCircle className="w-12 h-12 text-slate-650 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">Nenhum produto em estoque</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">Tente redefinir seus filtros ou cadastrar peças.</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-950/45">
                      <th className="py-4 px-6 text-center w-12">
                        <input
                          type="checkbox"
                          checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(filteredProducts.map(p => p.id));
                            } else {
                              setSelectedProductIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-4 px-6">Produto</th>
                      <th className="py-4 px-6 text-center">SKU</th>
                      <th className="py-4 px-6">Categoria</th>
                      <th className="py-4 px-6 text-center">Marca</th>
                      <th className="py-4 px-6 text-center">Qtd</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Ações</th>
                    </tr>
                    <tr className="bg-slate-950/30 border-b border-slate-800/80">
                      <td className="py-2 px-6"></td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="Filtrar produto..."
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="SKU..."
                          value={filterSku}
                          onChange={(e) => setFilterSku(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="">Todos</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="Marca..."
                          value={filterBrand}
                          onChange={(e) => setFilterBrand(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="Qtd..."
                          value={filterQuantity}
                          onChange={(e) => setFilterQuantity(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="">Todos</option>
                          <option value="SAUDÁVEL">Saudável</option>
                          <option value="REABASTECER">Reabastecer</option>
                          <option value="ESGOTADO">Esgotado</option>
                        </select>
                      </td>
                      <td className="py-2 px-6"></td>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredProducts.map((p) => {
                      const isLowStock = p.quantity < p.min_stock_alert;
                      const isOut = p.quantity === 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-4 px-6 text-center">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds([...selectedProductIds, p.id]);
                                } else {
                                  setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-none shrink-0 ${isOut ? 'bg-rose-500/10 text-rose-450' : isLowStock ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-450'}`}>
                                <Boxes className="w-4 h-4" />
                              </div>
                              <Link href={`/dashboard/inventory/${p.id}`} className="truncate max-w-[280px] md:max-w-md lg:max-w-lg hover:text-blue-400 hover:underline transition-colors">
                                {p.name}
                              </Link>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-semibold text-slate-400 text-xs font-mono">{p.sku}</td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-950 border border-slate-800 text-slate-350">
                              {p.category || 'Outro'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-300 font-semibold">{p.brand || '—'}</td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-slate-200">
                            {p.quantity} <span className="text-[10px] text-slate-500 font-normal">/ {p.min_stock_alert}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950/80 border border-slate-800/60 text-slate-350 light:bg-slate-100 light:border-slate-200 light:text-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-rose-500" />
                                Esgotado
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950/80 border border-slate-800/60 text-slate-350 light:bg-slate-100 light:border-slate-200 light:text-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500 animate-pulse" />
                                Reabastecer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950/80 border border-slate-800/60 text-slate-350 light:bg-slate-100 light:border-slate-200 light:text-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-500" />
                                Saudável
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-none transition-colors"
                              title="Excluir produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Barra de Ações em Massa - Estoque */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-none py-3.5 px-6 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-semibold text-slate-300">
            <strong className="text-white">{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={handleBulkDeleteProducts}
            disabled={deletingBulk}
            className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-450 font-bold py-1.5 px-3 rounded-none text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir Selecionados
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setSelectedProductIds([])}
            className="text-[11px] font-bold text-slate-450 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
