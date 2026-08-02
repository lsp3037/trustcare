'use client';
import { Package, Plus, AlertCircle, Boxes, Trash2, Download } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  Badge,
  BulkActionBar,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  SkeletonTable,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Toolbar,
  ToolbarGroup,
  ToolbarSearch,
  useConfirm,
  useToast,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { exportInventoryToCsv } from '@/lib/utils/csvExport';
import { cn } from '@/lib/utils';

const OFFLINE_HINT = 'Sem conexão com o servidor. A alteração ficou só neste dispositivo.';

const CATEGORIES = [
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
  'Outro',
];

const RAM_TECHS = ['DDR', 'DDR2', 'DDR3', 'DDR4', 'DDR5'];
const RAM_SIZES = ['2GB', '4GB', '8GB', '16GB', '32GB', '64GB'];
const SSD_TECHS = ['SATA III', 'NVMe', 'M.2 SATA'];
const SSD_SIZES = ['120GB', '240GB', '256GB', '480GB', '500GB', '960GB', '1TB', '2TB'];

export default function InventoryPage() {
  const toast = useToast();
  const confirm = useConfirm();

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

  // Cadastro de produto
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

  // Especificações dinâmicas de RAM e SSD
  const [ramApp, setRamApp] = useState('');
  const [ramTech, setRamTech] = useState('');
  const [ramSpeed, setRamSpeed] = useState('');
  const [ramGb, setRamGb] = useState('');
  const [ssdTech, setSsdTech] = useState('');
  const [ssdGb, setSsdGb] = useState('');

  // Filtros por coluna
  const [filterName, setFilterName] = useState('');
  const [filterSku, setFilterSku] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCapacity, setFilterCapacity] = useState('');
  const [filterQuantity, setFilterQuantity] = useState('');
  const [filterCost, setFilterCost] = useState('');
  const [filterSale, setFilterSale] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // O menu lateral avisa quando "Estoque" é clicado, para sair do formulário.
  useEffect(() => {
    const handleNavClick = () => setIsCreating(false);
    window.addEventListener('nav-estoque-click', handleNavClick);
    return () => window.removeEventListener('nav-estoque-click', handleNavClick);
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

  // Nome e capacidade se montam sozinhos para RAM e SSD.
  useEffect(() => {
    if (category === 'Memória RAM') {
      if (!ramGb || !ramTech || !ramApp) {
        setCapacity('');
        setName('');
        return;
      }
      setCapacity(`${ramGb} ${ramTech}${ramSpeed ? ` ${ramSpeed}` : ''} (${ramApp})`);
      const speedPart = ramSpeed ? ` ${ramSpeed}` : '';
      const brandPart = brand ? ` ${brand}` : '';
      setName(`Memória RAM ${ramTech} ${ramGb}${speedPart}${brandPart}`);
    } else if (category === 'SSD') {
      if (!ssdGb || !ssdTech) {
        setCapacity('');
        setName('');
        return;
      }
      setCapacity(`${ssdGb} ${ssdTech}`);
      const brandPart = brand ? ` ${brand}` : '';
      setName(`SSD ${ssdGb}${brandPart} ${ssdTech}`);
    }
  }, [category, brand, ramApp, ramTech, ramSpeed, ramGb, ssdTech, ssdGb]);

  // SKU sequencial a partir de categoria + marca.
  useEffect(() => {
    if (!category || !brand) {
      setSku('');
      return;
    }

    const initials = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 3)
        .padEnd(3, 'X');

    const prefix = `${initials(category)}-${initials(brand)}-`;

    const numbers = products
      .filter((p) => p.sku && p.sku.startsWith(prefix))
      .map((p) => {
        const num = parseInt(p.sku.split('-').pop());
        return isNaN(num) ? 0 : num;
      });

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    setSku(`${prefix}${String(nextNum).padStart(3, '0')}`);
  }, [category, brand, products]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products_inventory').select('*').order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (err) {
      console.warn('Erro ao buscar estoque do Supabase, usando fallback local:', err);
      loadLocalProducts();
      toast.warning('Exibindo dados salvos neste dispositivo', {
        description: 'Não foi possível falar com o servidor. O estoque pode estar desatualizado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocalProducts = () => {
    const localProducts = localStorage.getItem('mock-inventory');
    if (localProducts) {
      setProducts(JSON.parse(localProducts));
    } else {
      const initialMock = [
        { id: 'p1', name: 'SSD 480GB Kingston SATA III', sku: 'SSD-KG-480', category: 'SSD', brand: 'Kingston', capacity: '480GB', quantity: 12, cost_price: 120.0, sale_price: 249.9, min_stock_alert: 5 },
        { id: 'p2', name: 'Memória RAM DDR4 8GB 3200MHz Corsair', sku: 'MEM-CS-8G', category: 'Memória RAM', brand: 'Corsair', capacity: '8GB', quantity: 3, cost_price: 90.0, sale_price: 199.0, min_stock_alert: 5 },
        { id: 'p3', name: 'Cabo de Rede CAT6 Furukawa 10m', sku: 'CAB-FK-10M', category: 'Cabo / Acessório', brand: 'Furukawa', capacity: '10 metros', quantity: 25, cost_price: 15.0, sale_price: 45.0, min_stock_alert: 10 },
        { id: 'p4', name: 'Roteador TP-Link Archer C6 AC1200', sku: 'ROT-TP-C6', category: 'Outro', brand: 'TP-Link', capacity: 'N/A', quantity: 1, cost_price: 110.0, sale_price: 229.0, min_stock_alert: 3 },
        { id: 'p5', name: 'Pasta Térmica Arctic MX-4 4g', sku: 'PST-AR-MX4', category: 'Outro', brand: 'Arctic', capacity: '4g', quantity: 8, cost_price: 25.0, sale_price: 65.0, min_stock_alert: 2 },
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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        if (profile?.company_id) companyId = profile.company_id;
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
        const currentMock = [...products, { id: `mock-prod-${Date.now()}`, ...newProductData }];
        localStorage.setItem('mock-inventory', JSON.stringify(currentMock));
        toast.warning('Produto salvo apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.success(`"${newProductData.name}" cadastrado`);
      }

      setIsCreating(false);
      resetForm();
      fetchInventory();
    } catch (err: any) {
      toast.error('Não foi possível salvar o produto', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    const confirmed = await confirm({
      title: `Excluir "${product.name}" do estoque?`,
      description:
        'O produto some da listagem e deixa de aparecer na hora de alocar peças em uma OS. As OS que já usaram esta peça não são afetadas.',
      confirmLabel: 'Excluir produto',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('products_inventory').delete().eq('id', product.id);

      if (error) {
        console.warn('Erro ao deletar no Supabase, deletando do mock local:', error.message);
        const localProducts = localStorage.getItem('mock-inventory');
        if (localProducts) {
          const filtered = JSON.parse(localProducts).filter((p: any) => p.id !== product.id);
          localStorage.setItem('mock-inventory', JSON.stringify(filtered));
        }
        toast.warning('Exclusão aplicada apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.success(`"${product.name}" excluído`);
      }

      fetchInventory();
    } catch (err: any) {
      toast.error('Não foi possível excluir o produto', {
        description: err.message || 'Erro inesperado.',
      });
    }
  };

  const handleBulkDeleteProducts = async () => {
    const count = selectedProductIds.length;

    const confirmed = await confirm({
      title:
        count === 1 ? 'Excluir este produto do estoque?' : `Excluir ${count} produtos do estoque?`,
      description:
        'Eles somem da listagem e deixam de aparecer na hora de alocar peças em uma OS. Esta ação não pode ser desfeita.',
      confirmLabel: count === 1 ? 'Excluir produto' : `Excluir ${count} produtos`,
      destructive: true,
    });
    if (!confirmed) return;

    try {
      setDeletingBulk(true);

      const { error } = await supabase
        .from('products_inventory')
        .delete()
        .in('id', selectedProductIds);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => !selectedProductIds.includes(p.id)));
      toast.success(count === 1 ? 'Produto excluído' : `${count} produtos excluídos`);
    } catch (err) {
      console.warn('Erro ao excluir online, aplicando localmente:', err);

      const localProducts = localStorage.getItem('mock-inventory');
      if (localProducts) {
        const filtered = JSON.parse(localProducts).filter(
          (p: any) => !selectedProductIds.includes(p.id),
        );
        localStorage.setItem('mock-inventory', JSON.stringify(filtered));
        setProducts(filtered);
        toast.warning('Exclusão aplicada apenas neste dispositivo', {
          description: 'Os produtos continuam no servidor até a próxima sincronização.',
        });
      } else {
        toast.error('Não foi possível excluir os produtos');
      }
    } finally {
      setSelectedProductIds([]);
      setDeletingBulk(false);
    }
  };

  const clearColumnFilters = () => {
    setFilterName('');
    setFilterSku('');
    setFilterCategory('');
    setFilterBrand('');
    setFilterCapacity('');
    setFilterQuantity('');
    setFilterCost('');
    setFilterSale('');
    setFilterStatus('');
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

    const matchesLowStock = !showLowStockOnly || p.quantity < p.min_stock_alert;

    const matchesName = p.name.toLowerCase().includes(filterName.toLowerCase());
    const matchesSku = p.sku.toLowerCase().includes(filterSku.toLowerCase());
    const matchesCategory =
      filterCategory === '' ||
      (p.category && p.category.toLowerCase() === filterCategory.toLowerCase());
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

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.includes(p.id));
  const someVisibleSelected = filteredProducts.some((p) => selectedProductIds.includes(p.id));

  const isRamOrSsd = category === 'Memória RAM' || category === 'SSD';

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Package />}
        title="Estoque de Produtos"
        description="Gerencie peças de reposição e componentes da assistência."
        actions={
          !isCreating && (
            <>
              <Button
                variant="secondary"
                icon={<Download className="w-4 h-4" />}
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
            </>
          )
        }
      />

      {isCreating ? (
        <Card padding="lg" className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start gap-4 mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-h2 text-text">Cadastrar Produto / Peça</h2>
              <p className="text-small text-text-muted mt-0.5">Cadastre um item no inventário.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <Input
              label="Descrição / Nome do Produto"
              required
              placeholder="Ex: SSD 1TB Kingston NV2 NVMe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint={isRamOrSsd ? 'Montado automaticamente pelas especificações abaixo' : undefined}
            />

            <div
              className={cn(
                'grid grid-cols-1 gap-4',
                isRamOrSsd ? 'md:grid-cols-2' : 'md:grid-cols-3',
              )}
            >
              <Select
                label="Categoria"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Selecione uma categoria...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>

              <Input
                label="Marca"
                required
                placeholder="Ex: Kingston"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />

              {!isRamOrSsd && (
                <Input
                  label="Capacidade"
                  placeholder="Ex: 1TB / 8GB / 10m"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              )}
            </div>

            {category === 'Memória RAM' && (
              <fieldset className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-sunken p-4 border border-border rounded-xl">
                <legend className="sr-only">Especificações da memória RAM</legend>
                <Select
                  label="Aplicação"
                  required
                  value={ramApp}
                  onChange={(e) => setRamApp(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="PC">PC (Desktop)</option>
                  <option value="Notebook">Notebook</option>
                </Select>
                <Select
                  label="Tecnologia"
                  required
                  value={ramTech}
                  onChange={(e) => setRamTech(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {RAM_TECHS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Velocidade"
                  placeholder="Ex: 3200MHz"
                  value={ramSpeed}
                  onChange={(e) => setRamSpeed(e.target.value)}
                />
                <Select
                  label="Tamanho"
                  required
                  value={ramGb}
                  onChange={(e) => setRamGb(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {RAM_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </fieldset>
            )}

            {category === 'SSD' && (
              <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-sunken p-4 border border-border rounded-xl">
                <legend className="sr-only">Especificações do SSD</legend>
                <Select
                  label="Tecnologia SSD"
                  required
                  value={ssdTech}
                  onChange={(e) => setSsdTech(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {SSD_TECHS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Tamanho"
                  required
                  value={ssdGb}
                  onChange={(e) => setSsdGb(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {SSD_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </fieldset>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SKU / Código"
                placeholder="Gerado automaticamente..."
                value={sku}
                disabled
                hint="Derivado da categoria e da marca"
                className="font-mono"
              />
              <Input
                label="Estoque Mínimo (Alerta)"
                type="number"
                min="0"
                required
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Qtd. Inicial"
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Input
                label="Preço de Custo (R$)"
                type="number"
                step="0.01"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
              <Input
                label="Preço de Venda (R$)"
                type="number"
                step="0.01"
                min="0"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="submit" loading={submitting}>
                Salvar Produto
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <Toolbar>
            <ToolbarSearch
              aria-label="Buscar produtos"
              placeholder="Buscar por produto, marca, categoria ou SKU..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />

            <ToolbarGroup>
              {showLowStockOnly && (
                <Badge tone="danger" className="gap-2">
                  Apenas estoque baixo
                  <button
                    type="button"
                    aria-label="Remover filtro de estoque baixo"
                    onClick={() => {
                      setShowLowStockOnly(false);
                      window.history.replaceState({}, '', window.location.pathname);
                    }}
                    className="cursor-pointer hover:opacity-70"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={clearColumnFilters}>
                  Limpar filtros das colunas
                </Button>
              )}
            </ToolbarGroup>
          </Toolbar>

          {loading ? (
            <Card padding="none">
              <SkeletonTable rows={6} columns={6} />
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <EmptyState
                icon={<AlertCircle />}
                title={
                  hasActiveFilters || searchTerm || showLowStockOnly
                    ? 'Nenhum produto com esses filtros'
                    : 'Nenhum produto em estoque'
                }
                description={
                  hasActiveFilters || searchTerm || showLowStockOnly
                    ? 'Tente limpar a busca ou os filtros das colunas.'
                    : 'Cadastre as peças de reposição que você mantém em estoque para acompanhar quantidade e alerta de reposição.'
                }
                action={
                  hasActiveFilters || searchTerm || showLowStockOnly ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        clearColumnFilters();
                        setSearchTerm('');
                        setShowLowStockOnly(false);
                      }}
                    >
                      Limpar filtros
                    </Button>
                  ) : (
                    <Button
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        resetForm();
                        setIsCreating(true);
                      }}
                    >
                      Cadastrar primeiro produto
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <Card padding="none">
              <Table>
                <THead>
                  <tr className="border-b border-border">
                    <TH align="center" className="w-12">
                      <Checkbox
                        aria-label="Selecionar todos os produtos visíveis"
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected && !allVisibleSelected}
                        onChange={(e) =>
                          setSelectedProductIds(
                            e.target.checked ? filteredProducts.map((p) => p.id) : [],
                          )
                        }
                      />
                    </TH>
                    <TH>Produto</TH>
                    <TH align="center">SKU</TH>
                    <TH>Categoria</TH>
                    <TH align="center">Marca</TH>
                    <TH align="center">Qtd</TH>
                    <TH align="center">Status</TH>
                    <TH align="center" className="w-12">
                      <span className="sr-only">Ações</span>
                    </TH>
                  </tr>
                  {/* Linha de filtros por coluna. Era feita com <td> dentro do
                      <thead>, o que é HTML inválido e confunde leitor de tela. */}
                  <tr className="border-b border-border bg-surface-sunken/40">
                    <TH />
                    <TH>
                      <Input
                        aria-label="Filtrar por produto"
                        placeholder="Filtrar produto..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="py-1 text-caption"
                      />
                    </TH>
                    <TH>
                      <Input
                        aria-label="Filtrar por SKU"
                        placeholder="SKU..."
                        value={filterSku}
                        onChange={(e) => setFilterSku(e.target.value)}
                        className="py-1 text-caption text-center"
                      />
                    </TH>
                    <TH>
                      <Select
                        aria-label="Filtrar por categoria"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="py-1 text-caption"
                      >
                        <option value="">Todos</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </Select>
                    </TH>
                    <TH>
                      <Input
                        aria-label="Filtrar por marca"
                        placeholder="Marca..."
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                        className="py-1 text-caption text-center"
                      />
                    </TH>
                    <TH>
                      <Input
                        aria-label="Filtrar por quantidade"
                        placeholder="Qtd..."
                        value={filterQuantity}
                        onChange={(e) => setFilterQuantity(e.target.value)}
                        className="py-1 text-caption text-center"
                      />
                    </TH>
                    <TH>
                      <Select
                        aria-label="Filtrar por status de estoque"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="py-1 text-caption"
                      >
                        <option value="">Todos</option>
                        <option value="SAUDÁVEL">Saudável</option>
                        <option value="REABASTECER">Reabastecer</option>
                        <option value="ESGOTADO">Esgotado</option>
                      </Select>
                    </TH>
                    <TH />
                  </tr>
                </THead>
                <TBody>
                  {filteredProducts.map((p) => {
                    const isLowStock = p.quantity < p.min_stock_alert;
                    const isOut = p.quantity === 0;

                    return (
                      <tr key={p.id} className="transition-colors hover:bg-surface-overlay">
                        <TD align="center">
                          <Checkbox
                            aria-label={`Selecionar ${p.name}`}
                            checked={selectedProductIds.includes(p.id)}
                            onChange={(e) =>
                              setSelectedProductIds(
                                e.target.checked
                                  ? [...selectedProductIds, p.id]
                                  : selectedProductIds.filter((id) => id !== p.id),
                              )
                            }
                          />
                        </TD>
                        <TD className="font-semibold">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'p-1.5 rounded-2xl border border-glass-border shrink-0',
                                isOut
                                  ? 'bg-danger/10 text-danger'
                                  : isLowStock
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-info/10 text-info',
                              )}
                              aria-hidden
                            >
                              <Boxes className="w-4 h-4" />
                            </div>
                            <Link
                              href={`/dashboard/inventory/${p.id}`}
                              className="truncate max-w-[280px] md:max-w-md hover:text-brand hover:underline transition-colors rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                              {p.name}
                            </Link>
                          </div>
                        </TD>
                        <TD align="center" numeric className="text-text-muted">
                          {p.sku}
                        </TD>
                        <TD>
                          <Badge>{p.category || 'Outro'}</Badge>
                        </TD>
                        <TD align="center" className="font-semibold">
                          {p.brand || '—'}
                        </TD>
                        <TD align="center" numeric className="font-semibold">
                          {p.quantity}{' '}
                          <span className="text-caption text-text-subtle font-normal">
                            / {p.min_stock_alert}
                          </span>
                        </TD>
                        <TD align="center">
                          {isOut ? (
                            <Badge tone="danger">
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              Esgotado
                            </Badge>
                          ) : isLowStock ? (
                            <Badge tone="warning">
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              Reabastecer
                            </Badge>
                          ) : (
                            <Badge tone="success">
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              Saudável
                            </Badge>
                          )}
                        </TD>
                        <TD align="center">
                          <DropdownMenu label={`Ações do produto ${p.name}`}>
                            <DropdownMenuItem href={`/dashboard/inventory/${p.id}`}>
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive onSelect={() => handleDeleteProduct(p)}>
                              Excluir produto
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </TD>
                      </tr>
                    );
                  })}
                </TBody>
              </Table>
            </Card>
          )}
        </>
      )}

      <BulkActionBar
        count={selectedProductIds.length}
        itemLabel={['produto selecionado', 'produtos selecionados']}
        onClear={() => setSelectedProductIds([])}
      >
        <Button
          variant="danger"
          size="sm"
          loading={deletingBulk}
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={handleBulkDeleteProducts}
        >
          Excluir selecionados
        </Button>
      </BulkActionBar>
    </div>
  );
}
