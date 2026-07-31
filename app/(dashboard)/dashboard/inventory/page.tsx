'use client';
import { Package, Plus, CheckCircle2, Search, AlertCircle, Boxes, Trash2, Download, MoreHorizontal } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button, Badge, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { exportInventoryToCsv } from '@/lib/utils/csvExport';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

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
      console.error('Erro ao buscar estoque:', err);
      setProducts([]);
    } finally {
      setLoading(false);
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
      if (!user) throw new Error('Sessão expirada. Faça login novamente.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada.');
      const companyId = profile.company_id;

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

      if (error) throw error;

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

      if (error) throw error;

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
      console.error('Erro ao excluir produtos:', err);
      alert(`Não foi possível excluir os produtos: ${(err as Error).message}`);
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
          <h1 className="text-h1 text-text flex items-center gap-2.5">
            <Package className="w-8 h-8 text-emerald-500" /> Estoque de Produtos
          </h1>
          <p className="text-small text-text-muted mt-1">Gerencie peças de reposição e componentes da assistência.</p>
        </div>
        {!isCreating && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4 text-emerald-500" />}
              onClick={() => exportInventoryToCsv(filteredProducts)}
            >
              Exportar CSV
            </Button>
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetForm();
                setIsCreating(true);
              }}
            >
              Cadastrar Produto
            </Button>
          </div>
        )}
      </div>

      {isCreating ? (
        <div className="bg-surface-raised border border-border shadow-sm rounded-xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-h2 text-text">Cadastrar Produto / Peça</h2>
              <p className="text-xs text-text-muted mt-0.5">Cadastre um item no inventário.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Produto cadastrado com sucesso!</p>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                {formError}
              </div>
            )}

            {/* Descrição / Nome do Produto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Descrição / Nome do Produto</label>
              <input
                type="text"
                placeholder="Ex: SSD 1TB Kingston NV2 NVMe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className={`grid grid-cols-1 ${category === 'Memória RAM' || category === 'SSD' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2.5 px-3 text-sm text-text focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Marca</label>
                <input
                  type="text"
                  placeholder="Ex: Kingston"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Capacidade (Apenas se não for RAM nem SSD) */}
              {category !== 'Memória RAM' && category !== 'SSD' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Capacidade</label>
                  <input
                    type="text"
                    placeholder="Ex: 1TB / 8GB / 10m"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Campos Condicionais para Memória RAM */}
            {category === 'Memória RAM' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-sunken/40 p-4 border border-slate-900 rounded-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Aplicação</label>
                  <select
                    value={ramApp}
                    onChange={(e) => setRamApp(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="PC">PC (Desktop)</option>
                    <option value="Notebook">Notebook</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tecnologia</label>
                  <select
                    value={ramTech}
                    onChange={(e) => setRamTech(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Velocidade</label>
                  <input
                    type="text"
                    placeholder="Ex: 3200MHz"
                    value={ramSpeed}
                    onChange={(e) => setRamSpeed(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tamanho (GB)</label>
                  <select
                    value={ramGb}
                    onChange={(e) => setRamGb(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-sunken/40 p-4 border border-slate-900 rounded-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tecnologia SSD</label>
                  <select
                    value={ssdTech}
                    onChange={(e) => setSsdTech(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="SATA III">SATA III</option>
                    <option value="NVMe">NVMe</option>
                    <option value="M.2 SATA">M.2 SATA</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tamanho (GB/TB)</label>
                  <select
                    value={ssdGb}
                    onChange={(e) => setSsdGb(e.target.value)}
                    className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
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
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">SKU / Código</label>
                <input
                  type="text"
                  placeholder="Gerado automaticamente..."
                  value={sku}
                  disabled
                  className="w-full bg-surface-sunken/55 border border-border rounded-xl py-2 px-3 text-sm text-text-muted focus:outline-none cursor-not-allowed opacity-60 transition-colors"
                  required
                />
              </div>

              {/* Alerta de Estoque Mínimo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Estoque Mínimo (Alerta)</label>
                <input
                  type="number"
                  min="0"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quantidade Inicial */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Qtd. Inicial</label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Preço de Custo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Preço de Venda */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-surface-sunken border border-border rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="submit" loading={submitting} disabled={formSuccess}>
                Salvar Produto
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Barra de Busca e Filtro Ativo */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full md:max-w-md bg-surface-raised p-1 rounded-xl border border-border/60 shadow-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
              <input
                type="text"
                placeholder="Buscar por produto, marca, categoria ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-xl py-2 pl-11 pr-4 text-sm text-text placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {showLowStockOnly && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-400">
                <span>Filtro: Apenas Estoque Baixo</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 px-0.5 h-auto text-danger hover:text-danger"
                  onClick={() => {
                    setShowLowStockOnly(false);
                    if (typeof window !== 'undefined') {
                      window.history.replaceState({}, '', window.location.pathname);
                    }
                  }}
                >
                  ✕
                </Button>
              </div>
            )}
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
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
              >
                Limpar Filtros das Colunas
              </Button>
            )}
          </div>

          {/* Listagem de Estoque */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface-raised border border-border rounded-2xl">
              <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-text-muted">Carregando inventário...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-surface-raised border border-border rounded-2xl">
              <EmptyState
                icon={<AlertCircle />}
                title="Nenhum produto em estoque"
                description="Tente redefinir seus filtros ou cadastrar peças."
              />
            </div>
          ) : (
            <div className="bg-surface-raised border border-border shadow-sm/60 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-semibold text-xs uppercase tracking-wider bg-surface-overlay">
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
                          className="w-4 h-4 rounded border-border bg-surface-sunken text-blue-500 focus:ring-blue-500 cursor-pointer"
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
                    <tr className="bg-surface-sunken/30 border-b border-border/80">
                      <td className="py-2 px-6"></td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="Filtrar produto..."
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          className="w-full bg-surface-sunken/80 border border-border rounded px-2 py-1 text-xs text-text placeholder:text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="SKU..."
                          value={filterSku}
                          onChange={(e) => setFilterSku(e.target.value)}
                          className="w-full bg-surface-sunken/80 border border-border rounded px-2 py-1 text-xs text-text placeholder:text-slate-700 text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full bg-surface-sunken/80 border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
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
                          className="w-full bg-surface-sunken/80 border border-border rounded px-2 py-1 text-xs text-text placeholder:text-slate-700 text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <input
                          type="text"
                          placeholder="Qtd..."
                          value={filterQuantity}
                          onChange={(e) => setFilterQuantity(e.target.value)}
                          className="w-full bg-surface-sunken/80 border border-border rounded px-2 py-1 text-xs text-text placeholder:text-slate-700 text-center focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2 px-6">
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full bg-surface-sunken/80 border border-border rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-blue-500 cursor-pointer"
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
                              className="w-4 h-4 rounded border-border bg-surface-sunken text-blue-500 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-full backdrop-blur-md border border-white/5 shrink-0 ${isOut ? 'bg-rose-500/10 text-rose-500' : isLowStock ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                <Boxes className="w-4 h-4" />
                              </div>
                              <Link href={`/dashboard/inventory/${p.id}`} className="truncate max-w-[280px] md:max-w-md lg:max-w-lg hover:text-blue-400 hover:underline transition-colors">
                                {p.name}
                              </Link>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-semibold text-text-muted text-xs font-mono">{p.sku}</td>
                          <td className="py-4 px-6">
                            <Badge>{p.category || 'Outro'}</Badge>
                          </td>
                          <td className="py-4 px-6 text-center text-text font-semibold">{p.brand || '—'}</td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-slate-200">
                            {p.quantity} <span className="text-[10px] text-text-subtle font-normal">/ {p.min_stock_alert}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {isOut ? (
                              <Badge tone="danger">
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" /> Esgotado
                              </Badge>
                            ) : isLowStock ? (
                              <Badge tone="warning">
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-pulse" /> Reabastecer
                              </Badge>
                            ) : (
                              <Badge tone="success">
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" /> Saudável
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center relative">
                            <button
                              type="button"
                              aria-label={`Ações do produto ${p.name}`}
                              aria-expanded={activeDropdownId === p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === p.id ? null : p.id);
                              }}
                              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeDropdownId === p.id && (
                              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-44 bg-surface-raised border border-border rounded-xl shadow-xl z-50 p-1.5 text-left">
                                <Link
                                  href={`/dashboard/inventory/${p.id}`}
                                  className="block w-full text-left px-3 py-2 text-small font-medium text-text hover:bg-surface-sunken hover:text-brand rounded-lg transition-colors cursor-pointer"
                                >
                                  Ver Detalhes
                                </Link>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                    handleDeleteProduct(p.id);
                                  }}
                                  className="w-full text-left px-3 py-2 text-small font-medium text-danger hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  Excluir Produto
                                </button>
                              </div>
                            )}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-border rounded-xl py-3.5 px-6 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-semibold text-text">
            <strong className="text-white">{selectedProductIds.length}</strong> {selectedProductIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <Button
            variant="danger"
            size="sm"
            loading={deletingBulk}
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleBulkDeleteProducts}
          >
            Excluir Selecionados
          </Button>
          <div className="h-4 w-px bg-slate-800" />
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] uppercase tracking-wider"
            onClick={() => setSelectedProductIds([])}
          >
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
