'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ProductModalProps {
  isNewProductModalOpen: boolean;
  setIsNewProductModalOpen: (open: boolean) => void;
  productModalError: string;
  newProdName: string;
  setNewProdName: (name: string) => void;
  newProdCategory: string;
  setNewProdCategory: (cat: string) => void;
  newProdBrand: string;
  setNewProdBrand: (brand: string) => void;
  newProdCapacity: string;
  setNewProdCapacity: (cap: string) => void;
  newProdSsdTech: string;
  setNewProdSsdTech: (tech: string) => void;
  newProdSsdGb: string;
  setNewProdSsdGb: (gb: string) => void;
  newProdRamApp: string;
  setNewProdRamApp: (app: string) => void;
  newProdRamTech: string;
  setNewProdRamTech: (tech: string) => void;
  newProdRamSpeed: string;
  setNewProdRamSpeed: (speed: string) => void;
  newProdRamGb: string;
  setNewProdRamGb: (gb: string) => void;
  newProdSalePrice: string;
  setNewProdSalePrice: (price: string) => void;
  newProdQty: string;
  setNewProdQty: (qty: string) => void;
  savingProduct: boolean;
  handleSaveProduct: (e: React.FormEvent) => void;
}

/** Categorias em que o nome é derivado dos atributos, não digitado. */
const DERIVED_NAME_CATEGORIES = ['Memória RAM', 'SSD'];

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

const SSD_TECHS = ['SATA III', 'NVMe', 'M.2 SATA'];
const SSD_SIZES = ['120GB', '240GB', '256GB', '480GB', '500GB', '960GB', '1TB', '2TB'];
const RAM_TECHS = ['DDR', 'DDR2', 'DDR3', 'DDR4', 'DDR5'];
const RAM_SIZES = ['2GB', '4GB', '8GB', '16GB', '32GB', '64GB'];

/** Bloco de atributos específicos da categoria. */
function AttributeGroup({
  columns,
  children,
}: {
  columns: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('grid gap-4 bg-surface-sunken p-4 border border-border', columns)}>
      {children}
    </div>
  );
}

export function ProductModal({
  isNewProductModalOpen,
  setIsNewProductModalOpen,
  productModalError,
  newProdName, setNewProdName,
  newProdCategory, setNewProdCategory,
  newProdBrand, setNewProdBrand,
  newProdCapacity, setNewProdCapacity,
  newProdSsdTech, setNewProdSsdTech,
  newProdSsdGb, setNewProdSsdGb,
  newProdRamApp, setNewProdRamApp,
  newProdRamTech, setNewProdRamTech,
  newProdRamSpeed, setNewProdRamSpeed,
  newProdRamGb, setNewProdRamGb,
  newProdSalePrice, setNewProdSalePrice,
  newProdQty, setNewProdQty,
  savingProduct,
  handleSaveProduct,
}: ProductModalProps) {
  const hasDerivedName = DERIVED_NAME_CATEGORIES.includes(newProdCategory);

  return (
    <Modal
      open={isNewProductModalOpen}
      onClose={() => setIsNewProductModalOpen(false)}
      title="Cadastrar Nova Peça"
      description="A peça entra no estoque e fica disponível para vincular à OS."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setIsNewProductModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="new-product-form"
            loading={savingProduct}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Salvar Peça
          </Button>
        </>
      }
    >
      <form id="new-product-form" onSubmit={handleSaveProduct} className="space-y-4">
        {productModalError && (
          <p
            role="alert"
            className="p-4 bg-danger/10 border border-danger/25 text-danger text-small flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            <span>{productModalError}</span>
          </p>
        )}

        <Input
          label="Descrição / Nome da Peça"
          required
          type="text"
          value={newProdName}
          onChange={(e) => setNewProdName(e.target.value)}
          disabled={hasDerivedName}
          hint={hasDerivedName ? 'O nome é montado a partir dos atributos abaixo.' : undefined}
          placeholder={
            hasDerivedName
              ? 'Gerado automaticamente com base nos atributos...'
              : 'Ex: HD Externo 1TB Seagate Expansion'
          }
        />

        <div className={cn('grid grid-cols-1 gap-4', hasDerivedName ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
          <Select
            label="Categoria"
            required
            value={newProdCategory}
            onChange={(e) => {
              setNewProdCategory(e.target.value);
              setNewProdBrand('');
              setNewProdCapacity('');
              setNewProdSsdTech('');
              setNewProdSsdGb('');
              setNewProdRamApp('');
              setNewProdRamTech('');
              setNewProdRamSpeed('');
              setNewProdRamGb('');
              if (DERIVED_NAME_CATEGORIES.includes(e.target.value)) {
                setNewProdName('');
              }
            }}
          >
            <option value="">Selecione...</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>

          <Input
            label="Marca"
            required
            type="text"
            placeholder="Ex: Kingston"
            value={newProdBrand}
            onChange={(e) => setNewProdBrand(e.target.value)}
          />

          {!hasDerivedName && (
            <Input
              label="Capacidade"
              type="text"
              placeholder="Ex: 1TB / 8GB"
              value={newProdCapacity}
              onChange={(e) => setNewProdCapacity(e.target.value)}
            />
          )}
        </div>

        {newProdCategory === 'SSD' && (
          <AttributeGroup columns="grid-cols-2">
            <Select
              label="Tecnologia SSD"
              required
              value={newProdSsdTech}
              onChange={(e) => setNewProdSsdTech(e.target.value)}
            >
              <option value="">Selecione...</option>
              {SSD_TECHS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select
              label="Tamanho (GB/TB)"
              required
              value={newProdSsdGb}
              onChange={(e) => setNewProdSsdGb(e.target.value)}
            >
              <option value="">Selecione...</option>
              {SSD_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </AttributeGroup>
        )}

        {newProdCategory === 'Memória RAM' && (
          <AttributeGroup columns="grid-cols-2 md:grid-cols-4">
            <Select
              label="Aplicação"
              required
              value={newProdRamApp}
              onChange={(e) => setNewProdRamApp(e.target.value)}
            >
              <option value="">Selecione...</option>
              <option value="PC">PC (Desktop)</option>
              <option value="Notebook">Notebook</option>
            </Select>
            <Select
              label="Tecnologia"
              required
              value={newProdRamTech}
              onChange={(e) => setNewProdRamTech(e.target.value)}
            >
              <option value="">Selecione...</option>
              {RAM_TECHS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input
              label="Velocidade"
              type="text"
              placeholder="Ex: 3200MHz"
              value={newProdRamSpeed}
              onChange={(e) => setNewProdRamSpeed(e.target.value)}
              className="font-mono"
            />
            <Select
              label="Tamanho"
              required
              value={newProdRamGb}
              onChange={(e) => setNewProdRamGb(e.target.value)}
            >
              <option value="">Selecione...</option>
              {RAM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </AttributeGroup>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço de Venda (R$)"
            required
            type="number"
            step="0.01"
            min="0"
            value={newProdSalePrice}
            onChange={(e) => setNewProdSalePrice(e.target.value)}
            placeholder="0.00"
            className="font-mono tabular-nums"
          />
          <Input
            label="Qtd. Inicial em Estoque"
            type="number"
            min="0"
            value={newProdQty}
            onChange={(e) => setNewProdQty(e.target.value)}
            className="font-mono tabular-nums"
          />
        </div>
      </form>
    </Modal>
  );
}
