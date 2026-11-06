'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Building,
  Calculator,
  CheckCircle2,
  Fuel,
  Info,
  MapPin,
  Navigation,
  Search,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useUser } from '@/lib/context/UserContext';
import { calculateLogisticsPricing, computeFuelCostPerKm } from '@/lib/logistics/pricing';
import type { CompanyAddress, CompanyLogisticsSettings } from '@/lib/logistics/types';

export default function LogisticsSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { role, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);

  // Endereço da Empresa
  const [address, setAddress] = useState<CompanyAddress>({
    address_zip: '',
    address_street: '',
    address_number: '',
    address_district: '',
    address_city: '',
    address_state: '',
    latitude: null,
    longitude: null,
  });

  // Regras de Precificação e Veículo
  const [settings, setSettings] = useState<CompanyLogisticsSettings>({
    company_id: '',
    base_fee: 15.0,
    price_per_km: 1.5,
    min_fee: 15.0,
    included_km: 10.0,
    max_radius_km: 30.0,
    round_trip: true,
    vehicle_km_per_liter: 7.0,
    fuel_type: 'etanol',
    fuel_price: 4.39,
  });

  // Distância teste para simulação em tempo real
  const [simKm, setSimKm] = useState('8.7');

  useEffect(() => {
    if (!userLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/logistics');
        if (!res.ok) {
          throw new Error('Falha ao carregar configurações de logística.');
        }
        const data = await res.json();
        if (data.address) {
          setAddress({
            address_zip: data.address.address_zip || '',
            address_street: data.address.address_street || '',
            address_number: data.address.address_number || '',
            address_district: data.address.address_district || '',
            address_city: data.address.address_city || '',
            address_state: data.address.address_state || '',
            latitude: data.address.latitude ?? null,
            longitude: data.address.longitude ?? null,
          });
        }
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }

    if (!userLoading && role === 'admin') {
      loadData();
    }
  }, [userLoading, role, toast]);

  // Busca de CEP via ViaCEP
  const handleSearchCep = async () => {
    const rawCep = (address.address_zip || '').replace(/\D/g, '');
    if (rawCep.length !== 8) {
      toast.warning('Informe um CEP válido com 8 dígitos.');
      return;
    }

    try {
      setSearchingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        toast.error('CEP não encontrado.');
        return;
      }

      setAddress((prev) => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_district: data.bairro || prev.address_district,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state,
        // Ao mudar de endereço, invalidamos lat/long para o backend regeocodificar
        latitude: null,
        longitude: null,
      }));

      toast.success('Endereço preenchido pelo CEP. Informe o número e salve.');
    } catch {
      toast.error('Erro ao consultar o ViaCEP.');
    } finally {
      setSearchingCep(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.address_street || !address.address_city || !address.address_state) {
      toast.warning('Preencha ao menos Rua, Cidade e UF da empresa.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings/logistics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            zip: address.address_zip,
            street: address.address_street,
            number: address.address_number,
            district: address.address_district,
            city: address.address_city,
            state: address.address_state,
            latitude: address.latitude,
            longitude: address.longitude,
          },
          settings,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar configurações.');
      }

      if (data.address) {
        setAddress((prev) => ({
          ...prev,
          latitude: data.address.latitude,
          longitude: data.address.longitude,
        }));
      }

      toast.success('Configurações de logística salvas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // Métricas em tempo real
  const fuelCostPerKm = useMemo(() => {
    return computeFuelCostPerKm(Number(settings.fuel_price) || 0, Number(settings.vehicle_km_per_liter) || 1);
  }, [settings.fuel_price, settings.vehicle_km_per_liter]);

  const simulation = useMemo(() => {
    const km = Number(simKm) || 0;
    if (km <= 0) return null;
    return calculateLogisticsPricing({
      oneWayKm: km,
      durationMin: Math.round(km * 2.1), // Estimativa visual
      calcMethod: 'route',
      settings,
    });
  }, [simKm, settings]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const hasCoords = address.latitude !== null && address.longitude !== null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Logística & Custeio de Retiradas</h1>
            <p className="text-sm text-text-muted">
              Configure o ponto de partida da sua empresa, valores cobrados do cliente e o consumo real do veículo.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* BLOCO 1: Localização da Empresa (Ponto de Partida) */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-text">1. Localização da Empresa (Origem do Deslocamento)</h2>
            </div>
            {hasCoords ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-caption font-medium rounded-full bg-success/10 text-success border border-success/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Coordenadas ativas ({address.latitude?.toFixed(4)}, {address.longitude?.toFixed(4)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-caption font-medium rounded-full bg-amber-500/10 text-warning font-semibold border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Aguardando salvamento para geocodificar
              </span>
            )}
          </div>

          <p className="text-caption text-text-muted">
            Todas as distâncias de retirada e entrega na O.S. serão calculadas a partir deste endereço.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">CEP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="00000-000"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={address.address_zip || ''}
                  onChange={(e) => setAddress({ ...address, address_zip: e.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSearchCep}
                  disabled={searchingCep}
                  title="Buscar CEP no ViaCEP"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-caption font-medium text-text-muted mb-1">Logradouro / Rua</label>
              <input
                type="text"
                placeholder="Ex: Av. Historiador Rubens de Mendonça"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={address.address_street || ''}
                onChange={(e) => setAddress({ ...address, address_street: e.target.value, latitude: null, longitude: null })}
                required
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Número</label>
              <input
                type="text"
                placeholder="Ex: 1000"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={address.address_number || ''}
                onChange={(e) => setAddress({ ...address, address_number: e.target.value, latitude: null, longitude: null })}
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Bairro</label>
              <input
                type="text"
                placeholder="Ex: Bosque da Saúde"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={address.address_district || ''}
                onChange={(e) => setAddress({ ...address, address_district: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-caption font-medium text-text-muted mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Ex: Cuiabá"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={address.address_city || ''}
                onChange={(e) => setAddress({ ...address, address_city: e.target.value, latitude: null, longitude: null })}
                required
              />
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">UF (Estado)</label>
              <input
                type="text"
                maxLength={2}
                placeholder="MT"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={address.address_state || ''}
                onChange={(e) => setAddress({ ...address, address_state: e.target.value.toUpperCase(), latitude: null, longitude: null })}
                required
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: Regras de Cobrança ao Cliente */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Navigation className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text">2. Regras de Cobrança ao Cliente</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Taxa Base de Saída (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.base_fee}
                onChange={(e) => setSettings({ ...settings, base_fee: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-caption text-text-muted">Valor de partida (cobre até a franquia de km)</span>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Franquia de KM Inclusa (km)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.included_km ?? 10}
                onChange={(e) => setSettings({ ...settings, included_km: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-caption text-text-muted">KM totais cobertos pela taxa base sem taxa extra</span>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">KM Adicional (R$/km)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.price_per_km}
                onChange={(e) => setSettings({ ...settings, price_per_km: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-caption text-text-muted">Cobrado apenas sobre o excedente da franquia</span>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Taxa Mínima Cobrada (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.min_fee}
                onChange={(e) => setSettings({ ...settings, min_fee: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-caption text-text-muted">Piso mínimo para saídas curtas</span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-caption font-medium text-text-muted mb-1">Raio Máximo de Atendimento (km)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.max_radius_km}
                onChange={(e) => setSettings({ ...settings, max_radius_km: parseFloat(e.target.value) || 1 })}
              />
              <span className="text-caption text-warning font-semibold font-medium flex items-center gap-1 mt-0.5">
                <ShieldAlert className="w-3 h-3" /> Bloqueia retiradas além deste raio (distância em linha reta/rota de ida)
              </span>
            </div>

            <div className="md:col-span-2 flex items-center pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-background/50 w-full">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                  checked={settings.round_trip}
                  onChange={(e) => setSettings({ ...settings, round_trip: e.target.checked })}
                />
                <div>
                  <span className="text-sm font-medium text-text">Cobrar Ida e Volta do Veículo (2x a distância)</span>
                  <p className="text-caption text-text-muted">
                    Recomendado: se o cliente está a 4,9 km, o veículo roda 9,8 km no deslocamento completo.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* BLOCO 3: Custo do Veículo e Combustível (Custo Interno) */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-text">3. Consumo Real do Veículo (Custo Interno)</h2>
            </div>
            <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-caption font-semibold">
              Custo combustível: R$ {fuelCostPerKm.toFixed(2)} / km
            </div>
          </div>

          <p className="text-caption text-text-muted">
            Estes valores são usados para abater o custo real de combustível do relatório de lucro líquido no Financeiro.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Tipo de Combustível</label>
              <select
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.fuel_type}
                onChange={(e) => setSettings({ ...settings, fuel_type: e.target.value as any })}
              >
                <option value="etanol">Etanol (Álcool)</option>
                <option value="gasolina">Gasolina Comum / Aditivada</option>
                <option value="diesel">Diesel</option>
                <option value="gnv">GNV</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Preço Médio do Litro (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.fuel_price}
                onChange={(e) => setSettings({ ...settings, fuel_price: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-caption text-text-muted">Ex: R$ 4,39</span>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">Consumo Médio (km por litro)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={settings.vehicle_km_per_liter}
                onChange={(e) => setSettings({ ...settings, vehicle_km_per_liter: parseFloat(e.target.value) || 1 })}
              />
              <span className="text-caption text-text-muted">Ex: 7.0 km/l na cidade</span>
            </div>
          </div>
        </div>

        {/* BLOCO 4: Simulador em Tempo Real */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text">4. Simulador de Teste Rápido</h2>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-full md:w-64">
              <label className="block text-caption font-medium text-text-muted mb-1">Distância até o Cliente (km só ida)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={simKm}
                onChange={(e) => setSimKm(e.target.value)}
              />
            </div>

            {simulation && (
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full bg-background/60 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-caption text-text-muted block">KM Faturados</span>
                  <span className="text-sm font-semibold text-text">{simulation.billedKm} km</span>
                </div>
                <div>
                  <span className="text-caption text-text-muted block">Custo Combustível</span>
                  <span className="text-sm font-semibold text-danger font-semibold">R$ {simulation.internalCost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-caption text-text-muted block">Preço ao Cliente</span>
                  <span className="text-sm font-semibold text-success font-semibold">R$ {simulation.calculatedPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-caption text-text-muted block">Margem Líquida</span>
                  <span className="text-sm font-semibold text-primary">R$ {simulation.margin.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-caption text-text-muted">
            <Info className="w-4 h-4" />
            Alterações nestas regras não modificam ordens de serviço já salvas (imutabilidade).
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
