'use client';
import { AlertTriangle, CheckCircle2, Shield, User, Wrench, ChevronDown, FileSignature, Check } from 'lucide-react';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

import { Button, Field, Input, LoadingSpinner } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { getSubdomain } from '@/lib/utils/subdomain';
import { cn } from '@/lib/utils';

const brl = (value: number | string) => `R$ ${parseFloat(String(value)).toFixed(2)}`;

/** Rótulo de campo do documento — mono, caixa-alta, no piso de 12px. */
function DocLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-caption text-text-subtle uppercase tracking-wider block',
        className,
      )}
    >
      {children}
    </span>
  );
}

// Canvas de captura da assinatura
const SignaturePad = ({ onSave, onClear }: { onSave: (base64: string) => void; onClear: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref, não state: `draw` é lido em eventos nativos de mouse/touch que podem
  // disparar antes do React commitar um re-render após `startDrawing`.
  const isDrawingRef = useRef(false);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    onSave(canvas.toDataURL('image/png'));
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas pinta em contexto 2D, onde classe Tailwind não chega. O traço
    // lê o token da marca resolvido no elemento para acompanhar o tema.
    const brand = getComputedStyle(canvas).getPropertyValue('--color-brand').trim();
    ctx.strokeStyle = brand || '#10b981';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return (
    <div className="space-y-2">
      <div className="border-2 border-border bg-surface-sunken p-1 rounded-xl relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[150px] cursor-crosshair touch-none rounded-lg"
        />
        <span className="absolute top-2 right-2 text-caption font-mono text-text-subtle select-none uppercase tracking-wider pointer-events-none">
          Painel de Captura
        </span>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={clearCanvas}>
          Limpar painel
        </Button>
      </div>
    </div>
  );
};

export default function PublicOrderBudgetPage() {
  const { id } = useParams() as { id: string };

  const [order, setOrder] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderServices, setOrderServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Aprovação
  const [clientName, setClientName] = useState('');
  const [nameError, setNameError] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const fetchBudgetDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // Leitura pública segura via RPC SECURITY DEFINER — a RLS bloqueia
      // acesso anônimo direto às tabelas (multi-tenant), então todo o
      // conjunto de dados necessário para esta página vem de uma única
      // função server-side com uma lista explícita de campos.
      const { data: payload, error: rpcErr } = await supabase.rpc('get_public_budget_details', {
        p_order_id: id,
      });

      if (rpcErr) throw rpcErr;
      if (!payload) {
        setErrorMsg('Orçamento não encontrado no sistema.');
        return;
      }

      const osData = payload.order;
      const compData = payload.company;

      // Validação de subdomínio para isolamento SaaS
      if (typeof window !== 'undefined') {
        const activeSubdomain = getSubdomain(window.location.hostname, new URLSearchParams(window.location.search));
        if (compData && compData.subdomain && activeSubdomain && compData.subdomain !== activeSubdomain) {
          setErrorMsg('Orçamento não encontrado no sistema.');
          setOrder(null);
          return;
        }
      }

      setOrder(osData);
      setCompany(compData);
      setClient(payload.client);
      setOrderItems(payload.items || []);
      setOrderServices(payload.services || []);
    } catch (err: any) {
      console.error('Erro ao buscar orçamento:', err.message);
      setErrorMsg('Falha ao processar orçamento. Verifique se o link está correto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBudgetDetails();
  }, [id]);

  const handleApproveBudget = async () => {
    // Validação inline, no campo: um `alert()` tirava o cliente da página
    // e não indicava onde estava o problema.
    let invalido = false;
    if (!clientName.trim()) {
      setNameError('Informe seu nome por extenso.');
      invalido = true;
    }
    if (!signatureBase64) {
      setSignatureError('Assine no painel abaixo para autorizar.');
      invalido = true;
    }
    if (invalido) return;

    setNameError('');
    setSignatureError('');

    try {
      setSubmitting(true);
      setErrorMsg('');

      // A. Obter o IP público do cliente de forma resiliente
      let clientIp = '0.0.0.0';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip || '0.0.0.0';
      } catch {
        console.warn('Não foi possível obter o IP público, utilizando fallback.');
      }

      // B. RPC segura que grava a assinatura na OS
      const { data: successRes, error: updateErr } = await supabase.rpc('approve_budget_by_client', {
        order_id: id,
        client_name: clientName.trim(),
        signature_base64: signatureBase64,
        client_ip: clientIp,
      });

      if (updateErr) throw updateErr;

      if (successRes) {
        setSuccess(true);
        setOrder((prev: any) => ({
          ...prev,
          status: 'Aprovado',
          client_signature: signatureBase64,
          client_signature_name: clientName.trim(),
          client_signature_ip: clientIp,
          client_signature_at: new Date().toISOString(),
        }));
        // Sem toast aqui: a página inteira vira o comprovante de aprovação,
        // com signatário, data, IP e assinatura. Um aviso flutuante por cima
        // disso seria ruído — e duplicaria a mensagem na tela.
      } else {
        setErrorMsg('Não foi possível aprovar este orçamento. Verifique se ele ainda está pendente.');
      }
    } catch (err: any) {
      console.error('Erro na aprovação:', err.message);
      setErrorMsg('Erro interno ao salvar a aprovação. Tente novamente mais tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-6 font-mono"
        aria-busy="true"
      >
        <LoadingSpinner className="w-8 h-8 text-brand animate-spin mb-4" />
        <p className="text-small uppercase tracking-widest text-text-muted">
          Carregando orçamento...
        </p>
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div
        className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-6 font-mono"
        role="alert"
      >
        <AlertTriangle className="w-12 h-12 text-danger mb-4" aria-hidden />
        <h1 className="text-h3 uppercase tracking-wider text-text">Orçamento indisponível</h1>
        <p className="text-small text-text-muted mt-2 max-w-sm text-center leading-relaxed">
          {errorMsg}
        </p>
      </div>
    );
  }

  const parseEquipmentDetails = (details: string = '') => {
    const snRegex = /\s*\(S\/N:\s*([^)]+)\)/i;
    const match = details.match(snRegex);
    const specs = details.replace(snRegex, '').trim();
    const serialNumber = match ? match[1] : '—';
    return { specs, serialNumber };
  };

  const { specs, serialNumber } = parseEquipmentDetails(order?.equipment_details);

  return (
    <div className="min-h-screen bg-surface text-text py-10 px-4 flex flex-col items-center font-mono">
      <div className="w-full max-w-xl bg-surface-raised border-2 border-border p-6 space-y-6 shadow-2xl rounded-xl">
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-border">
          <div>
            {company?.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-10 object-contain mb-3"
              />
            )}
            <h1 className="text-h3 text-text uppercase tracking-wider">
              {company?.name || 'Trust Care'}
            </h1>
            <DocLabel className="mt-1">Orçamento & Diagnóstico Técnico</DocLabel>
          </div>
          <div className="text-left sm:text-right">
            <DocLabel>Identificação do chamado</DocLabel>
            <span className="text-small font-semibold text-text tabular-nums">
              #OS-{order.codigo_os || order.id.slice(0, 8)}
            </span>
          </div>
        </header>

        {success ? (
          <div className="border border-brand/25 bg-brand/5 p-5 space-y-4 rounded-xl" role="status">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-brand shrink-0" aria-hidden />
              <div>
                <h2 className="text-small font-semibold text-brand uppercase tracking-wider">
                  Orçamento aprovado
                </h2>
                <p className="text-caption text-text-muted uppercase mt-0.5">
                  Assinatura e auditoria registradas
                </p>
              </div>
            </div>

            <dl className="pt-4 border-t border-border text-small space-y-2 text-text-muted">
              <div className="flex gap-2">
                <dt className="text-text-subtle">Signatário:</dt>
                <dd className="text-text">{order.client_signature_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-text-subtle">Data/hora do aceite:</dt>
                <dd className="text-text tabular-nums">
                  {new Date(order.client_signature_at).toLocaleString('pt-BR')}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-text-subtle">Endereço IP:</dt>
                <dd className="text-text tabular-nums">{order.client_signature_ip}</dd>
              </div>
            </dl>

            <div className="pt-4 border-t border-border">
              <DocLabel className="mb-2">Assinatura digitalizada</DocLabel>
              <div className="border border-border bg-surface-sunken p-2 h-[80px] flex items-center justify-center rounded-lg">
                <img
                  src={order.client_signature}
                  alt="Assinatura digital do cliente"
                  className="h-full object-contain"
                />
              </div>
            </div>

            <p className="text-small text-text-muted leading-relaxed pt-2">
              O técnico responsável já foi notificado e o serviço está autorizado para início.
            </p>
          </div>
        ) : order.status !== 'Aguardando Aprovação' ? (
          <div className="border border-border bg-surface-sunken p-5 text-center space-y-3 rounded-xl">
            <Shield className="w-8 h-8 text-text-subtle mx-auto" aria-hidden />
            <h2 className="text-small font-semibold text-text uppercase tracking-wider">
              Orçamento não disponível
            </h2>
            <p className="text-small text-text-muted leading-relaxed">
              Este orçamento já foi processado ou está no status{' '}
              <strong className="text-text uppercase">{order.status}</strong>, não estando mais
              apto para aprovação.
            </p>
          </div>
        ) : (
          <>
            {/* Cliente e equipamento */}
            <section className="border border-border p-4 space-y-4 bg-surface-sunken rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DocLabel>Proprietário</DocLabel>
                  <p className="text-small text-text mt-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-text-subtle shrink-0" aria-hidden />
                    {client?.name}
                  </p>
                </div>
                <div>
                  <DocLabel>Equipamento / Modelo</DocLabel>
                  <p className="text-small text-text mt-1 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-text-subtle shrink-0" aria-hidden />
                    {specs || '—'}
                  </p>
                </div>
                {serialNumber && serialNumber !== '—' && (
                  <div className="sm:col-span-2">
                    <DocLabel>Número de série</DocLabel>
                    <p className="text-small text-text font-semibold mt-1 tabular-nums">
                      {serialNumber}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Laudo */}
            <section className="border border-border p-4 space-y-2 bg-surface-sunken rounded-xl">
              <DocLabel>Laudo técnico & parecer do diagnóstico</DocLabel>
              <p className="text-small text-text leading-relaxed break-words whitespace-pre-line">
                {order.technical_report || 'Aguardando parecer técnico detalhado...'}
              </p>
            </section>

            {/* Valores */}
            <section className="space-y-3">
              <DocLabel>Demonstrativo de valores</DocLabel>

              <div className="border border-border divide-y divide-border bg-surface-sunken text-small rounded-xl overflow-hidden">
                {parseFloat(order.service_value) > 0 && (
                  <div className="p-3 flex justify-between gap-4">
                    <span className="text-text-muted">Serviços técnicos e mão de obra</span>
                    <span className="text-text font-semibold tabular-nums">
                      {brl(order.service_value)}
                    </span>
                  </div>
                )}

                {orderServices.map((item, idx) => (
                  <div key={`serv-${idx}`} className="p-3 flex justify-between gap-4">
                    <span className="text-text-muted">
                      {item.service_name}
                      <span className="text-caption text-text-subtle ml-1">x{item.quantidade}</span>
                    </span>
                    <span className="text-text font-semibold tabular-nums">
                      {brl(item.subtotal)}
                    </span>
                  </div>
                ))}

                {orderItems.map((item, idx) => (
                  <div key={`prod-${idx}`} className="p-3 flex justify-between gap-4">
                    <span className="text-text-muted">
                      {item.product_name}
                      <span className="text-caption text-text-subtle ml-1">x{item.quantity}</span>
                    </span>
                    <span className="text-text font-semibold tabular-nums">
                      {brl(item.quantity * item.unit_price)}
                    </span>
                  </div>
                ))}

                <div className="p-4 flex justify-between items-center gap-4">
                  <span className="font-semibold text-text uppercase tracking-wider">
                    Valor total
                  </span>
                  <div className="text-right">
                    {parseFloat(order.discount) > 0 && (
                      <span className="text-caption text-danger font-semibold block mb-0.5 tabular-nums">
                        Desconto: - {brl(order.discount)}
                      </span>
                    )}
                    <span className="text-h2 font-semibold text-brand tabular-nums">
                      {brl(order.total_value)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Termos */}
            <section className="border border-border bg-surface-sunken rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsTermsOpen(!isTermsOpen)}
                aria-expanded={isTermsOpen}
                className="w-full p-4 flex justify-between items-center gap-2 cursor-pointer select-none text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
                  <span className="text-small font-semibold text-text uppercase tracking-wider">
                    Termos de autorização & garantia
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-text-subtle transition-transform shrink-0',
                    isTermsOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              {isTermsOpen && (
                <div className="p-4 pt-0 border-t border-border text-small text-text-muted leading-relaxed space-y-3 whitespace-pre-line">
                  {`1. ISENÇÃO DE RESPONSABILIDADE SOBRE DADOS:
A contratada não se responsabiliza por eventuais perdas de dados, softwares ou sistemas operacionais presentes no equipamento. É de total responsabilidade do cliente realizar backup prévio dos arquivos antes da entrega do aparelho.

2. GARANTIA DOS SERVIÇOS E PEÇAS:
Os serviços executados possuem garantia legal de 90 (noventa) dias a contar da data de retirada/entrega do equipamento, cobrindo defeitos exclusivamente relacionados à mão de obra prestada ou peças substituídas constantes neste orçamento. A garantia não cobre danos decorrentes de mau uso, umidade, quedas ou intervenções por terceiros não autorizados.

3. PRAZO DE EXECUÇÃO:
O prazo estimado para início da execução dos serviços é de 2 a 5 dias úteis a partir do aceite digital deste termo, condicionado à disponibilidade de peças em estoque.`}
                </div>
              )}
            </section>

            {/* Assinatura */}
            <section className="border border-border p-4 space-y-4 bg-surface-sunken rounded-xl">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-brand shrink-0" aria-hidden />
                <h2 className="text-small font-semibold text-text uppercase tracking-wider">
                  Assinatura eletrônica do cliente
                </h2>
              </div>

              <Input
                label="Nome completo do signatário"
                placeholder="Digite seu nome por extenso"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (nameError) setNameError('');
                }}
                error={nameError}
                autoComplete="name"
              />

              <Field
                label="Assinatura"
                hint="Escreva com o dedo ou com o mouse no painel abaixo"
                error={signatureError}
              >
                <SignaturePad
                  onSave={(base64) => {
                    setSignatureBase64(base64);
                    if (signatureError) setSignatureError('');
                  }}
                  onClear={() => setSignatureBase64('')}
                />
              </Field>
            </section>

            {errorMsg && (
              <p
                role="alert"
                className="p-3 border border-danger/25 bg-danger/10 text-danger text-small leading-relaxed rounded-xl"
              >
                {errorMsg}
              </p>
            )}

            <Button
              type="button"
              fullWidth
              size="lg"
              loading={submitting}
              onClick={handleApproveBudget}
              icon={<Check className="w-4 h-4" />}
            >
              {submitting ? 'Processando aprovação...' : 'Aprovar orçamento e iniciar serviço'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
