'use client';
import { AlertTriangle, CheckCircle2, Shield, User, Wrench, ChevronDown, FileSignature, Check } from 'lucide-react';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';
import { getSubdomain } from '@/lib/utils/subdomain';

// Componente do Canvas para Desenho da Assinatura
const SignaturePad = ({ onSave, onClear }: { onSave: (base64: string) => void; onClear: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
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
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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

    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return (
    <div className="space-y-2">
      <div className="border-2 border-slate-850 bg-slate-950 p-1 rounded-none relative">
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
          className="w-full h-[150px] bg-slate-950 cursor-crosshair touch-none"
        />
        <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-700 select-none uppercase tracking-wider">
          Painel de Captura
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearCanvas}
          className="text-[10px] font-mono border border-slate-850 bg-slate-950 hover:bg-slate-900 text-slate-400 px-3 py-1.5 uppercase tracking-wider rounded-none transition-colors cursor-pointer"
        >
          Limpar Painel
        </button>
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
  
  // Estados da aprovação
  const [clientName, setClientName] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const fetchBudgetDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // A. Buscar a OS pública
      const { data: osData, error: osErr } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (osErr) throw osErr;
      if (!osData) {
        setErrorMsg('Orçamento não encontrado no sistema.');
        return;
      }
      setOrder(osData);

      // B. Buscar dados da Empresa
      const { data: compData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', osData.company_id)
        .single();
      
      // Validação de subdomínio para isolamento SaaS
      if (typeof window !== 'undefined') {
        const activeSubdomain = getSubdomain(window.location.hostname, new URLSearchParams(window.location.search));
        if (compData && compData.subdomain && activeSubdomain && compData.subdomain !== activeSubdomain) {
          setErrorMsg('Orçamento não encontrado no sistema.');
          setOrder(null);
          return;
        }
      }
      
      setCompany(compData);

      // C. Buscar dados do Cliente
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', osData.client_id)
        .single();
      setClient(clientData);

      // D. Buscar Peças do Orçamento
      const { data: itemsData } = await supabase
        .from('service_order_items')
        .select('*, products_inventory(*)')
        .eq('service_order_id', id);
      setOrderItems(itemsData || []);

      // E. Buscar Serviços do Orçamento
      const { data: servicesData } = await supabase
        .from('order_services')
        .select('*, services(*)')
        .eq('os_id', id);
      setOrderServices(servicesData || []);

    } catch (err: any) {
      console.error('Erro ao buscar orçamento:', err.message);
      setErrorMsg('Falha ao processar orçamento. Verifique se o link está correto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBudgetDetails();
    }
  }, [id]);

  const handleApproveBudget = async () => {
    if (!clientName.trim()) {
      alert('Por favor, informe seu nome por extenso.');
      return;
    }
    if (!signatureBase64) {
      alert('Por favor, faça sua assinatura digital no painel.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      // A. Obter o IP público do cliente de forma resiliente
      let clientIp = '0.0.0.0';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip || '0.0.0.0';
      } catch (ipErr) {
        console.warn('Não foi possível obter o IP público, utilizando fallback.');
      }

      // B. Chamar a RPC segura do Supabase para atualizar a OS com a assinatura
      const { data: successRes, error: updateErr } = await supabase.rpc('approve_budget_by_client', {
        order_id: id,
        client_name: clientName.trim(),
        signature_base64: signatureBase64,
        client_ip: clientIp
      });

      if (updateErr) throw updateErr;

      if (successRes) {
        setSuccess(true);
        // Atualiza estado local da OS
        setOrder((prev: any) => ({
          ...prev,
          status: 'Aprovado',
          client_signature: signatureBase64,
          client_signature_name: clientName.trim(),
          client_signature_ip: clientIp,
          client_signature_at: new Date().toISOString()
        }));
      } else {
        setErrorMsg('Não foi possível aprovar este orçamento. Verifique se o mesmo ainda encontra-se pendente.');
      }

    } catch (err: any) {
      console.error('Erro na aprovação:', err.message);
      setErrorMsg('Erro interno ao tentar salvar a aprovação. Tente novamente mais tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 font-mono">
        <LoadingSpinner className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-slate-500">Acessando central de orçamentos...</p>
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 font-mono">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Falha na Conexão</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm text-center leading-relaxed">{errorMsg}</p>
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
    <div className="min-h-screen bg-black text-slate-100 py-10 px-4 flex flex-col items-center font-mono">
      <div className="w-full max-w-xl bg-zinc-950 border-2 border-zinc-900 p-6 space-y-6 shadow-2xl relative">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-zinc-900">
          <div>
            {company?.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="h-10 object-contain mb-3 grayscale contrast-200" 
              />
            )}
            <h1 className="text-base font-bold text-white uppercase tracking-wider">{company?.name || 'TRUST CARE'}</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Orçamento & Diagnóstico Técnico</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[9px] text-zinc-500 block">Identificação do Chamado</span>
            <span className="text-xs font-bold text-zinc-300">#OS-{order.codigo_os || order.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* FEEDBACK DE SUCESSO */}
        {success ? (
          <div className="border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-pulse" />
              <div>
                <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Orçamento Aprovado</h2>
                <p className="text-[10px] text-emerald-600 uppercase mt-0.5">Assinatura e Auditoria Registradas</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-900 text-[10px] space-y-2 text-zinc-400">
              <p><strong className="text-zinc-500">Signatário:</strong> {order.client_signature_name}</p>
              <p><strong className="text-zinc-500">Data/Hora do Aceite:</strong> {new Date(order.client_signature_at).toLocaleString('pt-BR')}</p>
              <p><strong className="text-zinc-500">Endereço IP de Registro:</strong> {order.client_signature_ip}</p>
            </div>
            
            <div className="pt-4 border-t border-zinc-900">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">Assinatura Digitalizada:</p>
              <div className="border border-zinc-900 bg-slate-950 p-2 h-[80px] flex items-center justify-center">
                <img src={order.client_signature} alt="Assinatura Digital" className="h-full object-contain invert brightness-200" />
              </div>
            </div>
            
            <div className="text-[10px] text-zinc-650 leading-relaxed pt-2">
              [Nota: O técnico responsável já foi notificado. A Ordem de Serviço foi atualizada no banco de dados da Trust Care e o serviço foi autorizado para início na bancada.]
            </div>
          </div>
        ) : order.status !== 'Aguardando Aprovação' ? (
          <div className="border border-zinc-800 bg-zinc-950 p-5 text-center space-y-3">
            <Shield className="w-8 h-8 text-zinc-500 mx-auto" />
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Orçamento não Disponível</h2>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Este orçamento já foi processado ou encontra-se no status <strong className="text-zinc-400 uppercase">[{order.status}]</strong>, não estando mais apto para aprovação pública.
            </p>
          </div>
        ) : (
          <>
            {/* INFORMAÇÕES DO CLIENTE E EQUIPAMENTO */}
            <div className="border border-zinc-900 p-4 space-y-4 bg-zinc-950">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-550 uppercase tracking-wider block">Proprietário</span>
                  <div className="text-xs text-zinc-300 mt-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-550" />
                    {client?.name}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-550 uppercase tracking-wider block">Equipamento / Modelo</span>
                  <div className="text-xs text-zinc-300 mt-1 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-zinc-550" />
                    {specs || '—'}
                  </div>
                </div>
                {serialNumber && serialNumber !== '—' && (
                  <div className="sm:col-span-2">
                    <span className="text-[9px] text-zinc-550 uppercase tracking-wider block">Número de Série</span>
                    <span className="text-xs text-zinc-300 font-bold block mt-1">{serialNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* DIAGNÓSTICO TÉCNICO */}
            <div className="border border-zinc-900 p-4 space-y-2 bg-zinc-950">
              <span className="text-[9px] text-zinc-550 uppercase tracking-widest block">Laudo Técnico & Parecer do Diagnóstico</span>
              <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-pre-line">
                {order.technical_report || 'Aguardando parecer técnico detalhado...'}
              </p>
            </div>

            {/* ITENS E SERVIÇOS DETALHADOS */}
            <div className="space-y-3">
              <span className="text-[9px] text-zinc-550 uppercase tracking-widest block">Demonstrativo de Valores</span>
              
              <div className="border border-zinc-900 divide-y divide-zinc-900 bg-zinc-950 text-xs">
                
                {/* Mão de Obra */}
                {parseFloat(order.service_value) > 0 && (
                  <div className="p-3 flex justify-between gap-4">
                    <span className="text-zinc-400">Serviços Técnicos e Mão de Obra</span>
                    <span className="text-zinc-300 font-bold">R$ {parseFloat(order.service_value).toFixed(2)}</span>
                  </div>
                )}

                {/* Serviços do Catálogo */}
                {orderServices.map((item, idx) => (
                  <div key={`serv-${idx}`} className="p-3 flex justify-between gap-4">
                    <span className="text-zinc-450">{item.services?.nome} <span className="text-[9px] text-zinc-600 ml-1">x{item.quantidade}</span></span>
                    <span className="text-zinc-300 font-bold">R$ {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}

                {/* Peças / Produtos */}
                {orderItems.map((item, idx) => (
                  <div key={`prod-${idx}`} className="p-3 flex justify-between gap-4">
                    <span className="text-zinc-450">{item.products_inventory?.nome} <span className="text-[9px] text-zinc-600 ml-1">x{item.quantity}</span></span>
                    <span className="text-zinc-300 font-bold">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}

                {/* Total */}
                <div className="p-4 bg-zinc-950 flex justify-between items-center text-sm">
                  <span className="font-bold text-white uppercase tracking-wider">Valor Total</span>
                  <div className="text-right">
                    {parseFloat(order.discount) > 0 && (
                      <span className="text-[10px] text-rose-500 font-bold block mb-0.5">
                        Desconto: - R$ {parseFloat(order.discount).toFixed(2)}
                      </span>
                    )}
                    <span className="text-base font-extrabold text-emerald-500">
                      R$ {parseFloat(order.total_value).toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* ACCORDION: TERMOS DE AUTORIZAÇÃO */}
            <div className="border border-zinc-900 bg-zinc-950">
              <button
                type="button"
                onClick={() => setIsTermsOpen(!isTermsOpen)}
                className="w-full p-4 flex justify-between items-center cursor-pointer select-none text-left focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-zinc-550" />
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Termos de Autorização & Garantia</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isTermsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTermsOpen && (
                <div className="p-4 pt-0 border-t border-zinc-900 text-[10px] text-zinc-500 leading-relaxed space-y-3 whitespace-pre-line font-mono">
                  {`1. ISENÇÃO DE RESPONSABILIDADE SOBRE DADOS:
A contratada não se responsabiliza por eventuais perdas de dados, softwares ou sistemas operacionais presentes no equipamento. É de total responsabilidade do cliente realizar backup prévio dos arquivos antes da entrega do aparelho.

2. GARANTIA DOS SERVIÇOS E PEÇAS:
Os serviços executados possuem garantia legal de 90 (noventa) dias a contar da data de retirada/entrega do equipamento, cobrindo defeitos exclusivamente relacionados à mão de obra prestada ou peças substituídas constantes neste orçamento. A garantia não cobre danos decorrentes de mau uso, umidade, quedas ou intervenções por terceiros não autorizados.

3. PRAZO DE EXECUÇÃO:
O prazo estimado para início da execução dos serviços é de 2 a 5 dias úteis a partir do aceite digital deste termo, condicionado à disponibilidade de peças em estoque.`}
                </div>
              )}
            </div>

            {/* ASSINATURA DIGITAL */}
            <div className="border border-zinc-900 p-4 space-y-4 bg-zinc-950">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Assinatura Eletrônica do Cliente</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-550 uppercase tracking-wider block">Nome Completo do Signatário</label>
                <input
                  type="text"
                  placeholder="[Digite seu nome por extenso]"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-650 px-2 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-550 uppercase tracking-wider block">Escreva sua assinatura digital com o dedo na tela</label>
                <SignaturePad 
                  onSave={setSignatureBase64} 
                  onClear={() => setSignatureBase64('')} 
                />
              </div>
            </div>

            {/* ERRO NO FORMULÁRIO */}
            {errorMsg && (
              <div className="p-3 border border-rose-500/30 bg-rose-950/10 text-rose-500 text-xs leading-relaxed uppercase">
                {errorMsg}
              </div>
            )}

            {/* BOTÃO DE APROVAÇÃO */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleApproveBudget}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 text-black font-bold uppercase tracking-wider text-xs py-4 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none border-b-4 border-emerald-800 hover:border-emerald-500 active:border-b-0 active:translate-y-[2px]"
            >
              {submitting ? (
                <>
                  <LoadingSpinner className="w-4 h-4 animate-spin" />
                  <span>Processando Aprovação...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Aprovar Orçamento e Iniciar Serviço</span>
                </>
              )}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
