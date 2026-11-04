'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  User,
  Wrench,
  ChevronDown,
  FileSignature,
  Check,
  MessageCircle,
  Printer,
  CreditCard,
  Lock,
  Calendar,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

import { Button, Field, Input, LoadingSpinner } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { getSubdomain } from '@/lib/utils/subdomain';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

/** Formatação monetária rigorosamente localizada para o Brasil (R$ 1.234,56). */
const brl = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'R$ 0,00';
  const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

/** Rótulo de campo de documento — sutil, legível e padronizado. */
function DocLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-xs font-semibold text-text-subtle uppercase tracking-wider block',
        className,
      )}
    >
      {children}
    </span>
  );
}

// Canvas de captura da assinatura do cliente
const SignaturePad = ({
  onSave,
  onClear,
  error,
}: {
  onSave: (base64: string) => void;
  onClear: () => void;
  error?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
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

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawingRef.current) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    setHasDrawn(true);
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
    setHasDrawn(false);
    onClear();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Traço natural com aspecto de caneta esferográfica / assinatura jurídica
    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'border-2 border-dashed bg-surface-sunken p-1 rounded-xl relative transition-all duration-200',
          error
            ? 'border-danger/60 bg-danger/5'
            : hasDrawn
              ? 'border-brand/40 bg-brand/[0.02]'
              : 'border-border hover:border-border-strong',
        )}
      >
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
          aria-label="Painel para assinatura do cliente"
        />

        {/* Linha guia de assinatura para ergonomia */}
        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col justify-end items-center pb-5 pointer-events-none select-none">
            <div className="w-4/5 border-b border-border-strong border-dashed flex items-center justify-start pb-1">
              <span className="text-xs font-mono text-text-subtle mr-2 font-bold">✕</span>
              <span className="text-xs text-text-subtle">Assine aqui com o dedo ou mouse</span>
            </div>
          </div>
        )}

        <span className="absolute top-2 right-2 text-caption font-mono text-text-subtle select-none uppercase tracking-wider pointer-events-none">
          Assinatura Digital
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{hasDrawn ? '✓ Assinatura pronta' : 'Desenhe no quadro acima'}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          disabled={!hasDrawn}
          className="text-xs h-7 px-2.5 text-text-muted hover:text-danger"
        >
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

  // Formulário de aprovação
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
        const activeSubdomain = getSubdomain(
          window.location.hostname,
          new URLSearchParams(window.location.search),
        );
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

      // Auto preenche o nome do cliente na assinatura se existir
      if (payload.client?.name) {
        setClientName(payload.client.name);
      }
    } catch (err: any) {
      console.error('Erro ao buscar orçamento:', err?.message || err);
      setErrorMsg('Falha ao processar orçamento. Verifique se o link está correto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBudgetDetails();
  }, [id]);

  const handleApproveBudget = async () => {
    let invalido = false;
    if (!clientName.trim()) {
      setNameError('Informe seu nome completo.');
      invalido = true;
    }
    if (!signatureBase64) {
      setSignatureError('Assine no painel para autorizar o serviço.');
      invalido = true;
    }
    if (invalido) return;

    setNameError('');
    setSignatureError('');

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await fetch(`/api/orcamento/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName.trim(),
          signature_base64: signatureBase64,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setSuccess(true);
        setOrder((prev: any) => ({
          ...prev,
          status: 'Aprovado',
          client_signature: signatureBase64,
          client_signature_name: clientName.trim(),
          client_signature_ip: data.clientIp || '127.0.0.1',
          client_signature_at: new Date().toISOString(),
        }));
      } else {
        setErrorMsg(
          data?.error ||
            'Não foi possível aprovar este orçamento. Verifique se ele ainda está pendente.',
        );
      }
    } catch (err: any) {
      console.error('Erro na aprovação:', err?.message || err);
      setErrorMsg('Erro interno ao salvar a aprovação. Tente novamente mais tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const parseEquipmentDetails = (details: string = '') => {
    const snRegex = /\s*\(S\/N:\s*([^)]+)\)/i;
    const match = details.match(snRegex);
    const specs = details.replace(snRegex, '').trim();
    const serialNumber = match ? match[1] : null;
    return { specs, serialNumber };
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-6"
        aria-busy="true"
      >
        <LoadingSpinner className="w-8 h-8 text-brand animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide text-text-muted">
          Carregando orçamento...
        </p>
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div
        className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-6"
        role="alert"
      >
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-danger" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-text">Orçamento indisponível</h1>
        <p className="text-sm text-text-muted mt-2 max-w-sm text-center leading-relaxed">
          {errorMsg}
        </p>
      </div>
    );
  }

  const { specs, serialNumber } = parseEquipmentDetails(order?.equipment_details);

  // Link direto para WhatsApp com mensagem contextualizada
  const getWhatsAppUrl = () => {
    if (!company?.phone) return null;
    const cleanPhone = company.phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const orderCode = order?.codigo_os || order?.id?.slice(0, 8);
    const text = encodeURIComponent(
      `Olá! Gostaria de tirar uma dúvida sobre o orçamento da OS #${orderCode} (${specs || 'Equipamento'}) da ${company?.name || 'oficina'}.`,
    );
    return `https://wa.me/${fullPhone}?text=${text}`;
  };

  const whatsappUrl = getWhatsAppUrl();

  // Verifica se a OS já está aprovada
  const isApproved =
    success || order.status === 'Aprovado' || (!!order.client_signature && order.status !== 'Aguardando Aprovação');

  return (
    <div className="min-h-screen bg-surface text-text py-6 sm:py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Cabeçalho do Documento */}
        <header className="bg-surface-raised border border-border p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-12 w-auto max-w-[140px] object-contain rounded-lg"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                {(company?.name || 'TC').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-text">
                {company?.name || 'Trust Care'}
              </h1>
              <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-brand"></span>
                Orçamento & Parecer Técnico Oficial
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
            <DocLabel>Identificação do chamado</DocLabel>
            <span className="text-sm sm:text-base font-mono font-bold text-text tabular-nums bg-surface-sunken px-2.5 py-1 rounded-lg border border-border">
              #OS-{order.codigo_os || order.id.slice(0, 8)}
            </span>
          </div>
        </header>

        {/* TELA DE COMPROVANTE (Se já aprovado) */}
        {isApproved ? (
          <div
            className="bg-surface-raised border border-brand/30 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6"
            role="status"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-text">
                    Orçamento Aprovado com Sucesso!
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    A autorização foi registrada com fé pública digital e os serviços foram liberados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                  icon={<Printer className="w-4 h-4" />}
                  className="print:hidden"
                >
                  Imprimir Comprovante
                </Button>
              </div>
            </div>

            {/* Metadados de Auditoria da Assinatura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-surface-sunken">
                <DocLabel className="mb-1">Signatário Autorizado</DocLabel>
                <p className="text-sm font-semibold text-text">
                  {order.client_signature_name || client?.name || 'Cliente'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-surface-sunken">
                <DocLabel className="mb-1">Data & Hora do Aceite</DocLabel>
                <p className="text-sm font-mono font-medium text-text tabular-nums">
                  {order.client_signature_at
                    ? new Date(order.client_signature_at).toLocaleString('pt-BR')
                    : 'Registrado'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-surface-sunken">
                <DocLabel className="mb-1">Endereço IP Registrado</DocLabel>
                <p className="text-sm font-mono font-medium text-text tabular-nums">
                  {order.client_signature_ip || '127.0.0.1'}
                </p>
              </div>
            </div>

            {/* Imagem da Assinatura */}
            {order.client_signature && (
              <div className="space-y-2">
                <DocLabel>Assinatura Digitalizada</DocLabel>
                <div className="border border-border bg-surface-sunken p-3 h-28 flex items-center justify-center rounded-xl">
                  <img
                    src={order.client_signature}
                    alt="Assinatura digital do cliente"
                    className="h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Resumo Financeiro Aprovado */}
            <div className="p-4 rounded-xl border border-border bg-surface-sunken flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="text-caption font-semibold text-text-subtle uppercase tracking-wider">
                  Valor Total Autorizado
                </p>
                <p className="text-caption text-text-muted mt-0.5">
                  Garantia legal de 90 dias ativa a partir da conclusão
                </p>
              </div>
              <span className="text-2xl font-bold font-mono text-brand tabular-nums">
                {brl(order.total_value)}
              </span>
            </div>

            {/* Próximos Passos */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-small text-text-muted text-center sm:text-left leading-relaxed">
                Nossa equipe técnica já foi notificada e já iniciou os procedimentos de reparo do seu equipamento.
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-text text-small font-medium transition-colors shrink-0 print:hidden"
                >
                  <MessageCircle className="w-4 h-4 text-brand" />
                  <span>Acompanhar pelo WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        ) : order.status !== 'Aguardando Aprovação' ? (
          /* STATUS INVÁLIDO OU JÁ ENCERRADO */
          <div className="bg-surface-raised border border-border p-8 text-center space-y-4 rounded-2xl shadow-sm">
            <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mx-auto text-text-subtle">
              <Shield className="w-7 h-7" aria-hidden />
            </div>
            <h2 className="text-h3 font-bold text-text">Orçamento Não Disponível</h2>
            <p className="text-small text-text-muted max-w-md mx-auto leading-relaxed">
              Este chamado encontra-se atualmente no status{' '}
              <strong className="text-text font-semibold uppercase">{order.status}</strong> e não
              está disponível para alteração de aceite digital.
            </p>
            {whatsappUrl && (
              <div className="pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-text text-small font-medium"
                >
                  <MessageCircle className="w-4 h-4 text-brand" />
                  <span>Entrar em contato com o suporte</span>
                </a>
              </div>
            )}
          </div>
        ) : (
          /* GRID PRINCIPAL: 2 COLUNAS NO DESKTOP / 1 NO MOBILE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: LAUDO TÉCNICO, EQUIPAMENTO E DETALHAMENTO (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card Cliente e Equipamento */}
              <section className="bg-surface-raised border border-border p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Wrench className="w-4 h-4 text-brand shrink-0" aria-hidden />
                  <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                    Dados do Atendimento
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <DocLabel>Proprietário do Equipamento</DocLabel>
                    <p className="text-sm font-semibold text-text mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
                      {client?.name || 'Cliente'}
                    </p>
                  </div>

                  <div>
                    <DocLabel>Equipamento / Modelo</DocLabel>
                    <p className="text-sm font-semibold text-text mt-1 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
                      {specs || 'Equipamento'}
                    </p>
                  </div>

                  {serialNumber && (
                    <div className="sm:col-span-2 pt-2 border-t border-border/60">
                      <DocLabel>Número de Série (S/N)</DocLabel>
                      <p className="text-xs font-mono font-bold text-text mt-0.5 tracking-wider">
                        {serialNumber}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Card Parecer Técnico */}
              <section className="bg-surface-raised border border-border p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <FileSignature className="w-4 h-4 text-brand shrink-0" aria-hidden />
                  <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                    Laudo & Diagnóstico Técnico
                  </h2>
                </div>

                {order.technical_report ? (
                  <div
                    className="text-sm text-text leading-relaxed break-words prose dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-2 prose-li:my-0.5"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(order.technical_report) }}
                  />
                ) : (
                  <p className="text-sm text-text-muted leading-relaxed">
                    Aguardando emissão do laudo técnico detalhado.
                  </p>
                )}

                {/* Badges de Confiança */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div className="p-3 rounded-xl border border-border bg-surface-sunken flex items-center gap-3">
                    <Shield className="w-5 h-5 text-brand shrink-0" aria-hidden />
                    <div>
                      <p className="text-small font-bold text-text">Garantia de 90 dias</p>
                      <p className="text-caption text-text-muted">Cobre mão de obra e peças substituídas</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-surface-sunken flex items-center gap-3">
                    <Lock className="w-5 h-5 text-brand shrink-0" aria-hidden />
                    <div>
                      <p className="text-small font-bold text-text">Privacidade & Sigilo</p>
                      <p className="text-caption text-text-muted">Arquivos pessoais intactos e protegidos</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Demonstrativo Detalhado de Valores */}
              <section className="bg-surface-raised border border-border p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand shrink-0" aria-hidden />
                    <h2 className="text-sm font-bold text-text uppercase tracking-wider">
                      Discriminação dos Serviços e Peças
                    </h2>
                  </div>
                  <DocLabel>Tabela de Itens</DocLabel>
                </div>

                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-surface-sunken">
                  {parseFloat(order.service_value) > 0 && (
                    <div className="p-3.5 flex justify-between items-center text-sm">
                      <span className="text-text font-medium">Serviços técnicos e mão de obra</span>
                      <span className="font-mono font-semibold text-text tabular-nums">
                        {brl(order.service_value)}
                      </span>
                    </div>
                  )}

                  {orderServices.map((item, idx) => (
                    <div key={`serv-${idx}`} className="p-3.5 flex justify-between items-center text-sm">
                      <div>
                        <span className="text-text font-medium">{item.service_name}</span>
                        {item.quantidade > 1 && (
                          <span className="text-xs text-text-subtle ml-2 bg-surface px-2 py-0.5 rounded-full border border-border">
                            x{item.quantidade}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-text tabular-nums">
                        {brl(item.subtotal)}
                      </span>
                    </div>
                  ))}

                  {orderItems.map((item, idx) => (
                    <div key={`prod-${idx}`} className="p-3.5 flex justify-between items-center text-sm">
                      <div>
                        <span className="text-text font-medium">{item.product_name}</span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-text-subtle ml-2 bg-surface px-2 py-0.5 rounded-full border border-border">
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-text tabular-nums">
                        {brl(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Termos Accordion */}
                <div className="border border-border bg-surface-sunken rounded-xl overflow-hidden mt-4">
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(!isTermsOpen)}
                    aria-expanded={isTermsOpen}
                    className="w-full p-4 flex justify-between items-center gap-2 cursor-pointer select-none text-left hover:bg-surface transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
                      <span className="text-xs font-bold text-text uppercase tracking-wider">
                        Termos de autorização & política de garantia
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-text-subtle transition-transform duration-200 shrink-0',
                        isTermsOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>

                  {isTermsOpen && (
                    <div className="p-4 pt-0 border-t border-border text-xs text-text-muted leading-relaxed space-y-3 whitespace-pre-line">
                      {`1. ISENÇÃO DE RESPONSABILIDADE SOBRE DADOS:
A contratada não se responsabiliza por eventuais perdas de dados, softwares ou sistemas operacionais presentes no equipamento. É de total responsabilidade do cliente realizar backup prévio dos arquivos antes da entrega do aparelho.

2. GARANTIA DOS SERVIÇOS E PEÇAS:
Os serviços executados possuem garantia legal de 90 (noventa) dias a contar da data de retirada/entrega do equipamento, cobrindo defeitos exclusivamente relacionados à mão de obra prestada ou peças substituídas constantes neste orçamento. A garantia não cobre danos decorrentes de mau uso, umidade, quedas ou intervenções por terceiros não autorizados.

3. PRAZO DE EXECUÇÃO:
O prazo estimado para início da execução dos serviços é de 2 a 5 dias úteis a partir do aceite digital deste termo, condicionado à disponibilidade de peças em estoque.`}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* COLUNA DIREITA: RESUMO FINANCEIRO, ASSINATURA E APROVAÇÃO (5 cols, sticky no Desktop) */}
            <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-6">
              {/* Card de Fechamento de Valor */}
              <div className="bg-surface-raised border border-border p-5 sm:p-6 rounded-2xl shadow-md space-y-5">
                <div>
                  <DocLabel className="mb-1">Total do Orçamento</DocLabel>
                  <div className="flex items-baseline justify-between">
                    <div>
                      {parseFloat(order.discount) > 0 && (
                        <span className="text-xs text-danger font-semibold block mb-0.5 font-mono">
                          Desconto: - {brl(order.discount)}
                        </span>
                      )}
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-brand tabular-nums tracking-tight">
                        {brl(order.total_value)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Condições de pagamento informativas */}
                <div className="p-3 rounded-xl border border-brand/15 bg-brand/5 text-xs text-text-muted flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-brand shrink-0" aria-hidden />
                  <span>Consulte facilidades de parcelamento no cartão ou condições à vista via Pix.</span>
                </div>

                {/* Formulário de Assinatura */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-brand shrink-0" aria-hidden />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                      Assinatura Eletrônica do Cliente
                    </h3>
                  </div>

                  <Input
                    label="Nome completo do signatário"
                    placeholder="Digite seu nome completo"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    error={nameError}
                    autoComplete="name"
                  />

                  <Field
                    label="Assinatura Digital"
                    hint="Escreva com o dedo ou mouse no quadro"
                    error={signatureError}
                  >
                    <SignaturePad
                      onSave={(base64) => {
                        setSignatureBase64(base64);
                        if (signatureError) setSignatureError('');
                      }}
                      onClear={() => setSignatureBase64('')}
                      error={signatureError}
                    />
                  </Field>

                  {errorMsg && (
                    <p
                      role="alert"
                      className="p-3 border border-danger/25 bg-danger/10 text-danger text-xs leading-relaxed rounded-xl"
                    >
                      {errorMsg}
                    </p>
                  )}

                  {/* Botão Primário de Aprovação (Sem quebra de layout) */}
                  <Button
                    type="button"
                    fullWidth
                    size="lg"
                    loading={submitting}
                    onClick={handleApproveBudget}
                    icon={<Check className="w-5 h-5 shrink-0" />}
                    className="w-full text-base font-semibold py-3.5 shadow-md shadow-brand/20 active:scale-[0.99] transition-all whitespace-normal text-center h-auto"
                  >
                    {submitting ? 'Gravando autorização...' : 'Aprovar Orçamento'}
                  </Button>

                  <p className="text-caption text-text-subtle text-center leading-relaxed">
                    Ao aprovar, você declara estar de acordo com o diagnóstico e autoriza a execução
                    dos serviços sob a garantia legal.
                  </p>
                </div>

                {/* Botão de Dúvidas / WhatsApp */}
                {whatsappUrl && (
                  <div className="pt-3 border-t border-border">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-text text-small font-medium transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-brand shrink-0" />
                      <span>Ficou com alguma dúvida? Fale no WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
