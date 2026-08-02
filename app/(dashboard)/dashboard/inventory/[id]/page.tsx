'use client';
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  Trash2,
  Layers,
  Award,
  Cpu,
  Database,
  Calendar,
  DollarSign,
  Percent,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  useConfirm,
  useToast,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
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
const SSD_SIZES = ['120GB', '240GB', '480GB', '500GB', '960GB', '1TB', '2TB'];

const brl = (value: number) =>
  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const toast = useToast();
  const confirm = useConfirm();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // Especificações dinâmicas de RAM e SSD
  const [ramApp, setRamApp] = useState('PC');
  const [ramTech, setRamTech] = useState('DDR4');
  const [ramSpeed, setRamSpeed] = useState('');
  const [ramGb, setRamGb] = useState('8GB');
  const [ssdTech, setSsdTech] = useState('NVMe');
  const [ssdGb, setSsdGb] = useState('480GB');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Reconstrói as especificações a partir do texto livre de `capacity`. */
  const parseCapacitySpecs = (catVal: string, capVal: string) => {
    if (!capVal) return;
    if (catVal === 'Memória RAM') {
      setRamApp(capVal.toLowerCase().includes('notebook') ? 'Notebook' : 'PC');

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

  // Nome e capacidade se remontam enquanto o usuário edita RAM/SSD.
  useEffect(() => {
    if (!isEditing) return;

    if (category === 'Memória RAM') {
      setCapacity(`${ramGb} ${ramTech}${ramSpeed ? ` ${ramSpeed}` : ''} (${ramApp})`);
      const speedPart = ramSpeed ? ` ${ramSpeed}` : '';
      const brandPart = brand ? ` ${brand}` : '';
      setName(`Memória RAM ${ramTech} ${ramGb}${speedPart}${brandPart}`);
    } else if (category === 'SSD') {
      setCapacity(`${ssdGb} ${ssdTech}`);
      const brandPart = brand ? ` ${brand}` : '';
      setName(`SSD ${ssdGb}${brandPart} ${ssdTech}`);
    }
  }, [category, brand, ramApp, ramTech, ramSpeed, ramGb, ssdTech, ssdGb, isEditing]);

  const hydrateFrom = (data: any) => {
    setProduct(data);
    setName(data.name);
    setSku(data.sku);
    setCategory(data.category || 'SSD');
    setBrand(data.brand || '');
    setCapacity(data.capacity || '');
    setQuantity(data.quantity.toString());
    setCostPrice(data.cost_price.toString());
    setSalePrice(data.sale_price.toString());
    setMinStockAlert(data.min_stock_alert.toString());
    parseCapacitySpecs(data.category || 'SSD', data.capacity || '');
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);

      const { data: productData, error } = await supabase
        .from('products_inventory')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (productData) hydrateFrom(productData);
    } catch (err) {
      console.warn('Erro ao carregar produto do Supabase, usando mock local:', err);

      const localProducts = localStorage.getItem('mock-inventory');
      if (localProducts) {
        const found = JSON.parse(localProducts).find((p: any) => p.id === id);
        if (found) {
          hydrateFrom(found);
          toast.warning('Exibindo dados salvos neste dispositivo', {
            description: 'Não foi possível falar com o servidor.',
          });
        } else {
          setProduct(null);
        }
      } else {
        setProduct(null);
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

        const localProducts = localStorage.getItem('mock-inventory');
        if (localProducts) {
          const updatedList = JSON.parse(localProducts).map((p: any) =>
            p.id === id ? { ...p, ...updatedData } : p,
          );
          localStorage.setItem('mock-inventory', JSON.stringify(updatedList));
        }
        toast.warning('Produto salvo apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.success('Produto atualizado');
      }

      setIsEditing(false);
      fetchProduct();
    } catch (err: any) {
      toast.error('Não foi possível salvar as alterações', {
        description: err.message || 'Erro inesperado.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    const confirmed = await confirm({
      title: `Excluir "${product?.name}" do estoque?`,
      description:
        'O produto some da listagem e deixa de aparecer na hora de alocar peças em uma OS. As OS que já usaram esta peça não são afetadas.',
      confirmLabel: 'Excluir produto',
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);

    try {
      const { error } = await supabase.from('products_inventory').delete().eq('id', id);

      if (error) {
        console.warn('Erro ao deletar no Supabase, deletando do mock local:', error.message);

        const localProducts = localStorage.getItem('mock-inventory');
        if (localProducts) {
          const filtered = JSON.parse(localProducts).filter((p: any) => p.id !== id);
          localStorage.setItem('mock-inventory', JSON.stringify(filtered));
        }
        toast.warning('Exclusão aplicada apenas neste dispositivo', { description: OFFLINE_HINT });
      } else {
        toast.success(`"${product?.name}" excluído`);
      }

      router.push('/dashboard/inventory');
    } catch (err: any) {
      toast.error('Não foi possível excluir o produto', {
        description: err.message || 'Erro inesperado.',
      });
      setDeleting(false);
    }
  };

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const profitValue = sale - cost;
  const profitMargin = sale > 0 ? (profitValue / sale) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Carregando detalhes do produto">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-80" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <Skeleton className="h-5 w-48 mb-6" />
            <Skeleton className="h-40 w-full" />
          </Card>
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-20 w-full" />
            </Card>
            <Card>
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-28 w-full" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-danger" />}
        title="Produto não encontrado"
        description="O item solicitado não existe no estoque."
        action={
          <Link href="/dashboard/inventory" className={buttonClasses({ variant: 'secondary' })}>
            <ArrowLeft className="w-4 h-4" aria-hidden /> Voltar para a listagem
          </Link>
        }
      />
    );
  }

  const isLowStock = product.quantity < product.min_stock_alert;
  const isOut = product.quantity === 0;
  const isRamOrSsd = category === 'Memória RAM' || category === 'SSD';

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/dashboard/inventory"
        backLabel="Voltar para Estoque"
        title={product.name}
        description="Ficha de especificação técnica e controle de inventário."
        badges={<Badge className="font-mono tabular-nums">SKU: {product.sku}</Badge>}
        actions={
          <>
            {!isEditing && (
              <Button
                variant="secondary"
                icon={<Edit className="w-4 h-4" />}
                onClick={() => setIsEditing(true)}
              >
                Editar Produto
              </Button>
            )}
            <Button
              variant="danger"
              loading={deleting}
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDeleteProduct}
            >
              Excluir Produto
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card padding="lg" className="lg:col-span-2 h-fit">
          <CardTitle className="mb-6 border-b border-border pb-3">
            {isEditing ? 'Editar Especificações' : 'Especificações Técnicas'}
          </CardTitle>

          {isEditing ? (
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <Input
                label="Descrição / Nome do Produto"
                required
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
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Marca"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />

                {!isRamOrSsd && (
                  <Input
                    label="Capacidade"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                )}
              </div>

              {category === 'Memória RAM' && (
                <fieldset className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-sunken p-4 border border-border rounded-xl">
                  <legend className="sr-only">Especificações da memória RAM</legend>
                  <Select label="Aplicação" value={ramApp} onChange={(e) => setRamApp(e.target.value)}>
                    <option value="PC">PC (Desktop)</option>
                    <option value="Notebook">Notebook</option>
                  </Select>
                  <Select
                    label="Tecnologia"
                    value={ramTech}
                    onChange={(e) => setRamTech(e.target.value)}
                  >
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
                  <Select label="Tamanho" value={ramGb} onChange={(e) => setRamGb(e.target.value)}>
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
                    value={ssdTech}
                    onChange={(e) => setSsdTech(e.target.value)}
                  >
                    {SSD_TECHS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Select label="Tamanho" value={ssdGb} onChange={(e) => setSsdGb(e.target.value)}>
                    {SSD_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </fieldset>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="SKU / Código" value={sku} disabled className="font-mono" />
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
                  label="Qtd. em Estoque"
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

              <div className="flex gap-3 pt-4 border-t border-border justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    hydrateFrom(product);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={saving}>
                  Salvar Alterações
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <dl className="space-y-4">
                <EspecLinha
                  icon={<Layers className="w-5 h-5" />}
                  label="Categoria"
                  value={product.category || 'Outro'}
                />
                <EspecLinha
                  icon={<Award className="w-5 h-5" />}
                  label="Marca"
                  value={product.brand || '—'}
                />
                <EspecLinha
                  icon={<Cpu className="w-5 h-5" />}
                  label="Capacidade / Medida"
                  value={product.capacity || '—'}
                />
              </dl>

              <dl className="space-y-4">
                <EspecLinha
                  icon={<Database className="w-5 h-5" />}
                  label="SKU Interno"
                  value={product.sku}
                  mono
                />
                <EspecLinha
                  icon={<Calendar className="w-5 h-5" />}
                  label="Data de Cadastro"
                  value={
                    product.created_at
                      ? new Date(product.created_at).toLocaleDateString('pt-BR')
                      : '—'
                  }
                  mono
                />
              </dl>
            </div>
          )}
        </Card>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h2 className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-4">
              Estado do Estoque
            </h2>

            <div className="space-y-6">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-small text-text-subtle">Saldo Atual</p>
                  <p className="text-h1 font-mono tabular-nums text-text mt-0.5">
                    {product.quantity}{' '}
                    <span className="text-small text-text-subtle font-normal">unidades</span>
                  </p>
                </div>
                <div className="shrink-0">
                  {isOut ? (
                    <Badge tone="danger">Esgotado</Badge>
                  ) : isLowStock ? (
                    <Badge tone="warning">Crítico</Badge>
                  ) : (
                    <Badge tone="success">Saudável</Badge>
                  )}
                </div>
              </div>

              <div className="p-3 bg-surface-sunken rounded-xl border border-border text-small text-text-muted space-y-1.5">
                <div className="flex justify-between font-semibold gap-2">
                  <span>Ponto de alerta:</span>
                  <span className="text-text font-mono tabular-nums">
                    {product.min_stock_alert} un
                  </span>
                </div>
                {isLowStock && (
                  <p className="text-caption text-warning leading-relaxed">
                    Abaixo do limite de segurança. Vale abrir uma requisição de compras.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-4">
              Análise Comercial
            </h2>

            <dl className="space-y-4">
              <LinhaFinanceira
                icon={<DollarSign className="w-4 h-4" />}
                label="Custo unitário"
                value={brl(product.cost_price)}
              />
              <LinhaFinanceira
                icon={<DollarSign className="w-4 h-4" />}
                label="Venda unitária"
                value={brl(product.sale_price)}
              />
              <LinhaFinanceira label="Lucro por peça" value={brl(profitValue)} />

              <div className="p-3 bg-brand/5 rounded-xl border border-brand/15 flex justify-between items-center gap-2">
                <span className="text-small text-text-muted font-semibold flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" aria-hidden /> Margem de lucro
                </span>
                <span
                  className={cn(
                    'font-semibold font-mono tabular-nums',
                    profitMargin < 0 ? 'text-danger' : 'text-brand',
                  )}
                >
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EspecLinha({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="p-2.5 rounded-2xl border border-glass-border bg-surface-sunken text-text-muted shrink-0"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-caption text-text-subtle uppercase tracking-wider">{label}</dt>
        <dd
          className={cn(
            'text-small font-semibold text-text truncate',
            mono && 'font-mono tabular-nums',
          )}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function LinhaFinanceira({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2 text-small border-b border-border pb-2">
      <dt className="text-text-muted flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="font-semibold text-text font-mono tabular-nums">{value}</dd>
    </div>
  );
}
