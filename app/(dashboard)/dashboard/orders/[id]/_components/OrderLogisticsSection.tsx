'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Fuel,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
} from 'lucide-react';
import { Button, Card, CardTitle, Input, useToast } from '@/components/ui';
import type {
  DestinationAddress,
  LogisticsLeg,
  LogisticsPricingResult,
  LogisticsStatus,
  ServiceOrderLogisticsLeg,
} from '@/lib/logistics/types';

interface OrderLogisticsSectionProps {
  orderId: string;
  onLogisticsTotalChange?: (newTotal: number) => void;
  disabled?: boolean;
}

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`;

interface LegFormState {
  enabled: boolean;
  address: DestinationAddress;
  status: LogisticsStatus;
  quote: LogisticsPricingResult | null;
  chargedPrice: string;
  overrideReason: string;
  savedLeg: ServiceOrderLogisticsLeg | null;
  calculating: boolean;
  saving: boolean;
  searchingCep: boolean;
  errorMessage: string | null;
}

const initialLegState = (): LegFormState => ({
  enabled: false,
  address: {
    zip: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  },
  status: 'pendente',
  quote: null,
  chargedPrice: '',
  overrideReason: '',
  savedLeg: null,
  calculating: false,
  saving: false,
  searchingCep: false,
  errorMessage: null,
});

export function OrderLogisticsSection({
  orderId,
  onLogisticsTotalChange,
  disabled = false,
}: OrderLogisticsSectionProps) {
  const toast = useToast();
  const lastSearchedCep = React.useRef<{ pickup?: string; delivery?: string }>({});
  const [loading, setLoading] = useState(true);
  const [pickup, setPickup] = useState<LegFormState>({ ...initialLegState(), enabled: true });
  const [delivery, setDelivery] = useState<LegFormState>(initialLegState());
  const [expanded, setExpanded] = useState(true);

  // Carregar dados existentes
  useEffect(() => {
    async function loadLogistics() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${orderId}/logistics`);
        if (!res.ok) return;
        const data = await res.json();
        const legs: ServiceOrderLogisticsLeg[] = data.legs || [];

        let currentTotal = 0;

        legs.forEach((l) => {
          if (l.status !== 'descartada') {
            currentTotal += Number(l.charged_price) || 0;
          }

          const stateObj: LegFormState = {
            enabled: true,
            address: {
              zip: l.address_zip || '',
              street: l.address_street || '',
              number: l.address_number || '',
              complement: l.address_complement || '',
              district: l.address_district || '',
              city: l.address_city || '',
              state: l.address_state || '',
            },
            status: l.status,
            quote: {
              oneWayKm: Number(l.distance_km),
              billedKm: Number(l.billed_km),
              durationMin: l.duration_min ?? null,
              calcMethod: l.calc_method,
              calculatedPrice: Number(l.calculated_price),
              internalCost: Number(l.internal_cost),
              fuelCostPerKm: Number(l.fuel_price) / (Number(l.km_per_liter) || 1),
              margin: Number(l.charged_price) - Number(l.internal_cost),
              isOutOfRadius: false,
              maxRadiusKm: 30,
            },
            chargedPrice: Number(l.charged_price).toFixed(2),
            overrideReason: l.override_reason || '',
            savedLeg: l,
            calculating: false,
            saving: false,
            searchingCep: false,
            errorMessage: null,
          };

          if (l.leg === 'pickup') setPickup(stateObj);
          if (l.leg === 'delivery') setDelivery(stateObj);
        });

        if (onLogisticsTotalChange) {
          onLogisticsTotalChange(currentTotal);
        }
      } catch (err: any) {
        console.warn('[OrderLogisticsSection] Erro ao carregar logística:', err);
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadLogistics();
    }
  }, [orderId]);

  // Consulta ViaCEP (Silenciosa e Automática)
  const handleSearchCep = async (targetLeg: 'pickup' | 'delivery', explicitCep?: string) => {
    const state = targetLeg === 'pickup' ? pickup : delivery;
    const setState = targetLeg === 'pickup' ? setPickup : setDelivery;
    const rawCep = (explicitCep ?? state.address.zip ?? '').replace(/\D/g, '');

    if (rawCep.length !== 8) {
      if (!explicitCep) {
        toast.warning('Informe um CEP válido com 8 dígitos.');
      }
      return;
    }

    if (lastSearchedCep.current[targetLeg] === rawCep) {
      return;
    }

    try {
      lastSearchedCep.current[targetLeg] = rawCep;
      setState((prev) => ({ ...prev, searchingCep: true, errorMessage: null }));
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        if (!explicitCep) toast.error('CEP não encontrado no ViaCEP.');
        return;
      }

      setState((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          zip: rawCep.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
          street: data.logradouro || prev.address.street,
          district: data.bairro || prev.address.district,
          city: data.localidade || prev.address.city,
          state: data.uf || prev.address.state,
        },
        quote: null, // Força recálculo
      }));
    } catch {
      if (!explicitCep) toast.error('Erro ao consultar ViaCEP.');
    } finally {
      setState((prev) => ({ ...prev, searchingCep: false }));
    }
  };

  // Copiar endereço de Retirada para Devolução
  const handleCopyPickupAddress = () => {
    if (!pickup.address.street || !pickup.address.city) {
      toast.warning('Preencha o endereço de retirada primeiro.');
      return;
    }

    setDelivery((prev) => ({
      ...prev,
      enabled: true,
      address: { ...pickup.address },
      quote: pickup.quote,
      chargedPrice: pickup.chargedPrice,
      overrideReason: pickup.overrideReason,
      errorMessage: null,
    }));

    toast.info('Endereço da retirada copiado para a devolução.');
  };

  // Calcular Custo e Rota
  const handleCalculateQuote = async (targetLeg: 'pickup' | 'delivery') => {
    const state = targetLeg === 'pickup' ? pickup : delivery;
    const setState = targetLeg === 'pickup' ? setPickup : setDelivery;

    if (!state.address.street || !state.address.city || !state.address.state) {
      toast.warning('Informe ao menos Rua, Cidade e Estado para calcular.');
      return;
    }

    try {
      setState((prev) => ({ ...prev, calculating: true, errorMessage: null }));
      const res = await fetch(`/api/orders/${orderId}/logistics/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: state.address,
          leg: targetLeg,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'OUT_OF_RADIUS') {
          setState((prev) => ({
            ...prev,
            errorMessage: data.message,
            quote: data.quote || null,
          }));
          toast.error(data.message);
          return;
        }
        throw new Error(data.message || data.error || 'Erro ao calcular rota.');
      }

      const q = data.quote as LogisticsPricingResult;
      setState((prev) => ({
        ...prev,
        quote: q,
        chargedPrice: q.calculatedPrice.toFixed(2),
        errorMessage: null,
      }));

      toast.success(`Cálculo concluído: ${q.oneWayKm} km (${q.calcMethod === 'route' ? 'rota real' : 'estimativa'}).`);
    } catch (err: any) {
      toast.error(err.message || 'Falha no cálculo.');
      setState((prev) => ({ ...prev, errorMessage: err.message }));
    } finally {
      setState((prev) => ({ ...prev, calculating: false }));
    }
  };

  // Salvar Trecho
  const handleSaveLeg = async (targetLeg: 'pickup' | 'delivery') => {
    const state = targetLeg === 'pickup' ? pickup : delivery;
    const setState = targetLeg === 'pickup' ? setPickup : setDelivery;

    if (!state.quote) {
      toast.warning('Calcule a rota antes de salvar.');
      return;
    }

    const chargedNum = parseFloat(state.chargedPrice);
    if (isNaN(chargedNum) || chargedNum < 0) {
      toast.warning('Informe um valor válido a ser cobrado.');
      return;
    }

    if (chargedNum !== state.quote.calculatedPrice && state.overrideReason.trim().length < 3) {
      toast.warning('Informe a justificativa da alteração de preço (mínimo 3 caracteres).');
      return;
    }

    try {
      setState((prev) => ({ ...prev, saving: true }));
      const res = await fetch(`/api/orders/${orderId}/logistics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leg: targetLeg,
          address: state.address,
          status: state.status,
          charged_price: chargedNum,
          override_reason: state.overrideReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar trecho.');
      }

      setState((prev) => ({ ...prev, savedLeg: data.leg }));
      toast.success(`Logística de ${targetLeg === 'pickup' ? 'Retirada' : 'Devolução'} salva com sucesso!`);

      // Notifica alteração do total
      recalculateAndNotify(targetLeg, data.leg);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  // Remover Trecho
  const handleDeleteLeg = async (targetLeg: 'pickup' | 'delivery') => {
    const setState = targetLeg === 'pickup' ? setPickup : setDelivery;

    try {
      setState((prev) => ({ ...prev, saving: true }));
      const res = await fetch(`/api/orders/${orderId}/logistics?leg=${targetLeg}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao remover trecho.');
      }

      setState(initialLegState());
      toast.info(`Trecho de ${targetLeg === 'pickup' ? 'retirada' : 'devolução'} removido.`);

      recalculateAndNotify(targetLeg, null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover.');
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const recalculateAndNotify = (
    changedLeg: 'pickup' | 'delivery',
    savedLeg: ServiceOrderLogisticsLeg | null
  ) => {
    if (!onLogisticsTotalChange) return;
    const otherLeg = changedLeg === 'pickup' ? delivery.savedLeg : pickup.savedLeg;
    let sum = 0;
    if (savedLeg && savedLeg.status !== 'descartada') {
      sum += Number(savedLeg.charged_price) || 0;
    }
    if (otherLeg && otherLeg.status !== 'descartada') {
      sum += Number(otherLeg.charged_price) || 0;
    }
    onLogisticsTotalChange(sum);
  };

  const totalLogisticsValue =
    (pickup.savedLeg && pickup.savedLeg.status !== 'descartada' ? Number(pickup.savedLeg.charged_price) : 0) +
    (delivery.savedLeg && delivery.savedLeg.status !== 'descartada' ? Number(delivery.savedLeg.charged_price) : 0);

  const renderLegCard = (targetLeg: 'pickup' | 'delivery') => {
    const isPickup = targetLeg === 'pickup';
    const shortTitle = isPickup ? 'Retirada no Cliente' : 'Devolução no Cliente';
    const state = isPickup ? pickup : delivery;
    const setState = isPickup ? setPickup : setDelivery;

    if (!state.enabled) {
      return (
        <div className="p-3.5 border border-dashed border-border rounded-xl bg-surface-sunken/40 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-surface border border-border text-text-muted shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">{shortTitle}</p>
              <p className="text-caption text-text-muted">
                {isPickup
                  ? 'Retirar equipamento no endereço do cliente?'
                  : 'Entregar equipamento reparado no cliente?'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-0.5">
            {!isPickup && pickup.enabled && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyPickupAddress}
                disabled={disabled}
                className="flex-1 text-caption justify-center font-medium"
              >
                Copiar da Retirada
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setState((prev) => ({ ...prev, enabled: true }))}
              disabled={disabled}
              className="flex-1 text-caption justify-center font-semibold text-primary"
            >
              + {isPickup ? 'Habilitar Retirada' : 'Habilitar Devolução'}
            </Button>
          </div>
        </div>
      );
    }

    const isOutOfRadius = state.quote?.isOutOfRadius;
    const chargedNum = parseFloat(state.chargedPrice) || 0;
    const isOverridden = state.quote && chargedNum !== state.quote.calculatedPrice;
    const lowMarginAlert =
      state.quote && state.quote.internalCost > 0 && chargedNum < state.quote.internalCost * 1.5;

    return (
      <div className="p-4 border border-border rounded-xl bg-surface space-y-4">
        {/* Topo do Bloco */}
        <div className="flex items-center justify-between border-b border-border pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-semibold text-text">{shortTitle}</h3>
                {state.savedLeg && (
                  <span className="text-caption font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                    Salvo
                  </span>
                )}
              </div>
              <p className="text-caption text-text-muted">
                {isPickup ? 'Coleta do aparelho' : 'Entrega após reparo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status do Trecho */}
            <select
              aria-label="Status do trecho logístico"
              className="text-caption px-2 py-1 rounded-lg bg-surface-sunken border border-border text-text font-medium outline-none focus:border-primary"
              value={state.status}
              onChange={(e) => setState({ ...state, status: e.target.value as any })}
              disabled={disabled}
            >
              <option value="pendente">Pendente</option>
              <option value="agendada">Agendada</option>
              <option value="concluida">Concluída</option>
              <option value="descartada">Descartada</option>
            </select>

            <button
              type="button"
              className="p-1.5 rounded-lg text-text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
              onClick={() => handleDeleteLeg(targetLeg)}
              disabled={disabled || state.saving}
              title="Remover trecho"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inputs de Endereço - Layout Flexível 100% Imune a Esmagamento */}
        <div className="space-y-3">
          {/* Linha 1: CEP (com busca integrada) + Número */}
          <div className="flex gap-2.5">
            <div className="flex-1 min-w-0">
              <label className="block text-caption font-medium text-text-muted mb-1">CEP</label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="00000-000"
                  value={state.address.zip || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setState((prev) => ({
                      ...prev,
                      address: { ...prev.address, zip: val },
                      quote: null,
                    }));
                    const digits = val.replace(/\D/g, '');
                    if (digits.length === 8) {
                      handleSearchCep(targetLeg, digits);
                    }
                  }}
                  onBlur={() => {
                    const digits = (state.address.zip || '').replace(/\D/g, '');
                    if (digits.length === 8) {
                      handleSearchCep(targetLeg, digits);
                    }
                  }}
                  disabled={disabled}
                  className="font-mono text-caption"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSearchCep(targetLeg)}
                  disabled={disabled || state.searchingCep}
                  title="Buscar no ViaCEP"
                  className="shrink-0 px-2.5"
                >
                  <Search className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="w-24 shrink-0">
              <label className="block text-caption font-medium text-text-muted mb-1">Número</label>
              <Input
                placeholder="Nº"
                value={state.address.number || ''}
                onChange={(e) =>
                  setState({
                    ...state,
                    address: { ...state.address, number: e.target.value },
                    quote: null,
                  })
                }
                disabled={disabled}
                className="text-caption"
              />
            </div>
          </div>

          {/* Linha 2: Rua / Logradouro (LARGURA TOTAL) */}
          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">Rua / Logradouro</label>
            <Input
              placeholder="Ex: Rua das Flores"
              value={state.address.street}
              onChange={(e) =>
                setState({
                  ...state,
                  address: { ...state.address, street: e.target.value },
                  quote: null,
                })
              }
              disabled={disabled}
              className="text-caption"
            />
          </div>

          {/* Linha 3: Bairro (LARGURA TOTAL - SEM CORTES) */}
          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">Bairro</label>
            <Input
              placeholder="Ex: Quilombo"
              value={state.address.district || ''}
              onChange={(e) =>
                setState({
                  ...state,
                  address: { ...state.address, district: e.target.value },
                  quote: null,
                })
              }
              disabled={disabled}
              className="text-caption"
            />
          </div>

          {/* Linha 4: Cidade (flex-1) + UF (w-16) */}
          <div className="flex gap-2.5">
            <div className="flex-1 min-w-0">
              <label className="block text-caption font-medium text-text-muted mb-1">Cidade</label>
              <Input
                placeholder="Ex: Cuiabá"
                value={state.address.city}
                onChange={(e) =>
                  setState({
                    ...state,
                    address: { ...state.address, city: e.target.value },
                    quote: null,
                  })
                }
                disabled={disabled}
                className="text-caption"
              />
            </div>

            <div className="w-16 shrink-0">
              <label className="block text-caption font-medium text-text-muted mb-1 text-center">UF</label>
              <Input
                maxLength={2}
                placeholder="MT"
                value={state.address.state}
                onChange={(e) =>
                  setState({
                    ...state,
                    address: { ...state.address, state: e.target.value.toUpperCase() },
                    quote: null,
                  })
                }
                disabled={disabled}
                className="text-caption font-mono text-center uppercase"
              />
            </div>
          </div>

          {/* Linha 5: Complemento opcional */}
          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">Complemento (opcional)</label>
            <Input
              placeholder="Apto, Bloco, Ponto de referência..."
              value={state.address.complement || ''}
              onChange={(e) =>
                setState({
                  ...state,
                  address: { ...state.address, complement: e.target.value },
                })
              }
              disabled={disabled}
              className="text-caption"
            />
          </div>

          {/* Botão de Calcular Rota e Custos */}
          <div className="pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleCalculateQuote(targetLeg)}
              disabled={disabled || state.calculating}
              className="w-full flex items-center justify-center gap-2 py-2"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{state.calculating ? 'Calculando Rota...' : 'Calcular Rota e Custos'}</span>
            </Button>
            <p className="text-caption text-text-subtle text-center mt-1.5">
              Cálculo de rota rodoviária a partir da sede da empresa.
            </p>
          </div>
        </div>

        {/* Mensagem de Erro / Bloqueio por Raio */}
        {state.errorMessage && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-caption text-danger">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Bloqueio de Logística</p>
              <p>{state.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Resultados do Cálculo - Painel Financeiro e Metrificação */}
        {state.quote && !isOutOfRadius && (
          <div className="space-y-3 pt-3 border-t border-border">
            {/* Bloco de Distância e Tempo */}
            <div className="bg-surface-sunken rounded-lg border border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-text font-mono">{state.quote.oneWayKm} km</span>
                    {state.quote.durationMin && (
                      <span className="text-caption text-text-muted flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> ~{state.quote.durationMin} min
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-text-subtle">Trajeto de ida • {state.quote.billedKm} km ida e volta</p>
                </div>
              </div>
              <span className="text-caption px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                Dentro do raio ({state.quote.maxRadiusKm}km)
              </span>
            </div>

            {/* Custos e Margem (dl/dd alinhado com FinancialSection) */}
            <dl className="bg-surface-sunken rounded-lg border border-border p-3 space-y-2 text-caption">
              <div className="flex justify-between items-center text-text-muted">
                <span>Custo combustível ({brl(state.quote.fuelCostPerKm)}/km)</span>
                <span className="font-mono text-danger font-semibold">{brl(state.quote.internalCost)}</span>
              </div>
              <div className="flex justify-between items-center text-text-muted">
                <span>Preço calculado pela tabela</span>
                <span className="font-mono text-text font-semibold">{brl(state.quote.calculatedPrice)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border text-primary font-semibold">
                <span>Margem líquida estimada</span>
                <span className="font-mono">
                  + {brl(state.quote.margin)}
                  <span className="text-caption text-text-muted font-normal ml-1">
                    ({Math.round((state.quote.margin / (state.quote.calculatedPrice || 1)) * 100)}%)
                  </span>
                </span>
              </div>
            </dl>

            {/* Ajuste de Preço ao Cliente */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between gap-3">
                <label className="text-caption font-semibold text-text">
                  Valor a Cobrar do Cliente:
                </label>
                <div className="relative w-36">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={state.chargedPrice}
                    onChange={(e) => setState({ ...state, chargedPrice: e.target.value })}
                    disabled={disabled}
                    className="font-mono text-sm font-semibold text-right text-primary"
                  />
                </div>
              </div>

              {isOverridden && (
                <div>
                  <label className="block text-caption font-medium text-warning mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Justificativa do ajuste (obrigatória)
                  </label>
                  <Input
                    placeholder="Ex: Cortesia comercial, cliente parceiro..."
                    value={state.overrideReason}
                    onChange={(e) => setState({ ...state, overrideReason: e.target.value })}
                    disabled={disabled}
                    className="text-caption"
                  />
                </div>
              )}

              {lowMarginAlert && (
                <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-caption text-warning flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Aviso: O valor cobrado é próximo ao custo de combustível ({brl(state.quote.internalCost)}).
                </div>
              )}

              {/* Botão Salvar Trecho */}
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveLeg(targetLeg)}
                  disabled={disabled || state.saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {state.saving ? 'Salvando...' : `Salvar ${isPickup ? 'Retirada' : 'Devolução'} na OS`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Truck className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold truncate">Logística & Retiradas</CardTitle>
            <p className="text-caption text-text-muted truncate">
              Cálculo de rota a partir da sede
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalLogisticsValue > 0 && (
            <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-primary/10 text-primary border border-primary/20">
              Total Logística: {brl(totalLogisticsValue)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-text-muted hover:text-text"
            aria-label={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 pt-2">
          {renderLegCard('pickup')}
          {renderLegCard('delivery')}

          <div className="flex items-center justify-between text-caption text-text-subtle pt-2 border-t border-border">
            <span>© openrouteservice by HeiGIT | Dados de OpenStreetMap</span>
            <span>Cálculo seguro executado no servidor</span>
          </div>
        </div>
      )}
    </Card>
  );
}
