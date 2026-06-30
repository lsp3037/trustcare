'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Building, 
  Phone, 
  Mail, 
  FileText, 
  ClipboardList, 
  Calendar, 
  DollarSign, 
  Loader2, 
  Edit, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  Laptop,
  QrCode
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para edição do Cliente
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('PF');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para cadastro de Equipamento
  const [eqName, setEqName] = useState('');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [addingEq, setAddingEq] = useState(false);
  const [eqError, setEqError] = useState('');
  const [eqSuccess, setEqSuccess] = useState(false);

  const fetchClientAndOrders = async () => {
    try {
      setLoading(true);
      
      // 1. Tenta buscar dados do cliente no Supabase
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientErr) throw clientErr;

      if (clientData) {
        // Busca todos os clientes para calcular o ID numérico sequencial se estiver em branco
        const { data: allClients } = await supabase.from('clients').select('id').order('created_at', { ascending: true });
        const index = allClients ? allClients.findIndex(c => c.id === clientData.id) : 0;
        
        const processedClient = {
          ...clientData,
          client_number: clientData.client_number || (1001 + (index >= 0 ? index : 0))
        };

        setClient(processedClient);
        setName(processedClient.name);
        setType(processedClient.type);
        setDocument(processedClient.document || '');
        setPhone(processedClient.phone || '');
        setEmail(processedClient.email || '');

        // Busca OSs do cliente
        const { data: ordersData } = await supabase
          .from('service_orders')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });

        if (ordersData) {
          setOrders(ordersData);
        }

        // Busca Equipamentos do cliente
        const { data: eqData } = await supabase
          .from('client_equipments')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });

        if (eqData) {
          setEquipments(eqData);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar do Supabase, buscando mock local:', err);
      
      // Fallback para localStorage
      const localClients = localStorage.getItem('mock-clients');
      if (localClients) {
        const parsedClients = JSON.parse(localClients);
        const index = parsedClients.findIndex((c: any) => c.id === id);
        const foundClient = parsedClients[index];
        
        if (foundClient) {
          const processedClient = {
            ...foundClient,
            client_number: foundClient.client_number || (1001 + (index >= 0 ? index : 0))
          };

          setClient(processedClient);
          setName(processedClient.name);
          setType(processedClient.type);
          setDocument(processedClient.document || '');
          setPhone(processedClient.phone || '');
          setEmail(processedClient.email || '');
          
          // Busca ordens mockadas
          const mockOrders = localStorage.getItem('mock-orders');
          const allOrders = mockOrders ? JSON.parse(mockOrders) : [
            { id: '1', client_id: 'c1', clients: { name: 'Tech Solutions Ltda' }, equipment_details: 'Notebook Dell Latitude 3420', reported_problem: 'Tela azul intermitente e desligamento automático', technical_report: 'Realizado limpeza interna e troca de pasta térmica.', status: 'Análise', total_value: 450.00, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: '2', client_id: 'c2', clients: { name: 'Carlos Henrique Souza' }, equipment_details: 'Desktop Gamer Custom', reported_problem: 'Placa de vídeo liga mas não dá vídeo', technical_report: null, status: 'Aguardando Peça', total_value: 1250.00, created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
            { id: '3', client_id: 'c3', clients: { name: 'Clínica Sorriso Perfeito' }, equipment_details: 'Servidor de Arquivos HP ProLiant', reported_problem: 'Backup automático falhando', technical_report: 'Reconfiguração do script de backup.', status: 'Concluído', total_value: 2800.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
            { id: '4', client_id: 'c4', clients: { name: 'Juliana Mendes' }, equipment_details: 'MacBook Air M1', reported_problem: 'Teclado com teclas travadas', technical_report: null, status: 'Novo', total_value: 350.00, created_at: new Date(Date.now() - 3600000 * 28).toISOString() },
          ];
          
          const filteredOrders = allOrders.filter((o: any) => o.client_id === id);
          setOrders(filteredOrders);

          // Busca equipamentos mockados
          const mockEqs = localStorage.getItem('mock-equipments');
          const allEqs = mockEqs ? JSON.parse(mockEqs) : [
            { id: 'eq1', client_id: 'c1', name: 'Notebook Dell Latitude 3420', brand: 'Dell', model: 'Latitude 3420', serial_number: 'PE091728' },
            { id: 'eq2', client_id: 'c2', name: 'Desktop Gamer Custom', brand: 'Custom', model: 'Custom Intel i7', serial_number: 'N/A' },
            { id: 'eq3', client_id: 'c3', name: 'Servidor HP ProLiant DL360 Gen10', brand: 'HP', model: 'ProLiant DL360 Gen10', serial_number: 'SGH817A29B' },
            { id: 'eq4', client_id: 'c4', name: 'MacBook Air M1', brand: 'Apple', model: 'MacBook Air M1 2020', serial_number: 'FVFDR899Q6L5' },
          ];
          const filteredEqs = allEqs.filter((e: any) => e.client_id === id);
          setEquipments(filteredEqs);
        } else {
          setClient(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientAndOrders();
  }, [id]);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const updatedData = {
        name,
        type,
        document,
        phone,
        email,
      };

      const { error } = await supabase
        .from('clients')
        .update(updatedData)
        .eq('id', id);

      if (error) {
        console.warn('Falha no Supabase, atualizando mock local:', error.message);
        
        // Atualiza mock
        const localClients = localStorage.getItem('mock-clients');
        if (localClients) {
          const parsed = JSON.parse(localClients);
          const updatedList = parsed.map((c: any) => {
            if (c.id === id) {
              return { ...c, ...updatedData };
            }
            return c;
          });
          localStorage.setItem('mock-clients', JSON.stringify(updatedList));
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
        fetchClientAndOrders();
      }, 1000);

    } catch (err: any) {
      setSaveError(err.message || 'Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingEq(true);
    setEqError('');
    setEqSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
        if (profile?.company_id) companyId = profile.company_id;
      }

      const newEq = {
        company_id: companyId,
        client_id: id,
        name: eqName,
        brand: eqBrand,
        model: eqModel,
        serial_number: eqSerial,
      };

      const { error } = await supabase.from('client_equipments').insert(newEq);

      if (error) {
        console.warn('Falha Supabase, inserindo equipamento mock local:', error.message);
        
        const mockEqs = localStorage.getItem('mock-equipments');
        const allEqs = mockEqs ? JSON.parse(mockEqs) : [
          { id: 'eq1', client_id: 'c1', name: 'Notebook Dell Latitude 3420', brand: 'Dell', model: 'Latitude 3420', serial_number: 'PE091728' },
          { id: 'eq2', client_id: 'c2', name: 'Desktop Gamer Custom', brand: 'Custom', model: 'Custom Intel i7', serial_number: 'N/A' },
          { id: 'eq3', client_id: 'c3', name: 'Servidor HP ProLiant DL360 Gen10', brand: 'HP', model: 'ProLiant DL360 Gen10', serial_number: 'SGH817A29B' },
          { id: 'eq4', client_id: 'c4', name: 'MacBook Air M1', brand: 'Apple', model: 'MacBook Air M1 2020', serial_number: 'FVFDR899Q6L5' },
        ];
        allEqs.push({
          id: `mock-eq-${Date.now()}`,
          ...newEq
        });
        localStorage.setItem('mock-equipments', JSON.stringify(allEqs));
      }

      setEqSuccess(true);
      setEqName('');
      setEqBrand('');
      setEqModel('');
      setEqSerial('');
      
      setTimeout(() => {
        setEqSuccess(false);
      }, 3000);

      fetchClientAndOrders();
    } catch (err: any) {
      setEqError(err.message || 'Erro ao adicionar equipamento.');
    } finally {
      setAddingEq(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Equipamento': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Em Análise': return 'bg-blue-500/10 text-blue-450 border-blue-500/20';
      case 'Aguardando Aprovação': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Aguardando Peças': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Em Execução': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Em Testes': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Pronto para Retirada': return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'Finalizado': return 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20';
      case 'Cancelado': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Carregando detalhes do cliente...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Cliente não encontrado</h2>
        <p className="text-slate-400">O cliente solicitado não existe ou foi excluído.</p>
        <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para a listagem
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb e Back Link */}
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Clientes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="text-slate-550 font-mono text-xl bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                #{client.client_number || 'Mock'}
              </span>
              {client.name}
            </h1>
            <p className="text-slate-400 mt-1">Dados de cadastro, equipamentos e histórico de chamados técnicos.</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 font-semibold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Edit className="w-4 h-4 text-slate-400" /> Editar Dados
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Detalhes do Cliente / Formulário de Edição */}
        <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl h-fit">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3">
            {isEditing ? 'Editar Cadastro' : 'Ficha de Cadastro'}
          </h3>

          {isEditing ? (
            <form onSubmit={handleUpdateClient} className="space-y-4">
              {saveSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-450 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Alterações salvas!
                </div>
              )}
              {saveError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-450">
                  {saveError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      checked={type === 'PF'}
                      onChange={() => setType('PF')}
                      className="accent-blue-500 h-4 w-4 bg-slate-950 border border-slate-800"
                    />
                    PF
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      checked={type === 'PJ'}
                      onChange={() => setType('PJ')}
                      className="accent-blue-500 h-4 w-4 bg-slate-950 border border-slate-800"
                    />
                    PJ
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome / Razão Social</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documento (CPF/CNPJ)</label>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder={type === 'PF' ? 'Ex: 123.456.789-00' : 'Ex: 12.345.678/0001-90'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: cliente@empresa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Restaura estados
                    setName(client.name);
                    setType(client.type);
                    setDocument(client.document || '');
                    setPhone(client.phone || '');
                    setEmail(client.email || '');
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-white font-semibold py-2 rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Tipo de Cadastro */}
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${client.type === 'PJ' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {client.type === 'PJ' ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Cadastro</p>
                  <p className="text-sm font-semibold text-slate-200">{client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                </div>
              </div>

              {/* Documento */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-800/50">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{client.type === 'PF' ? 'CPF' : 'CNPJ'}</p>
                  <p className="text-sm font-semibold text-slate-200 font-mono">{client.document || '—'}</p>
                </div>
              </div>

              {/* Telefone */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-800/50">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telefone</p>
                  <p className="text-sm font-semibold text-slate-200">{client.phone || '—'}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950 text-slate-400 border border-slate-800/50">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail Corporativo</p>
                  <p className="text-sm font-semibold text-slate-200 truncate hover:text-blue-400 cursor-pointer">{client.email || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Histórico e Equipamentos */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Equipamentos Cadastrados */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-455" /> Equipamentos do Cliente
            </h3>

            {/* Listagem de Equipamentos */}
            {equipments.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nenhum equipamento cadastrado para este cliente.
              </div>
            ) : (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-semibold uppercase tracking-wider bg-slate-950/20">
                      <th className="py-2.5 px-3">Equipamento</th>
                      <th className="py-2.5 px-3">Marca</th>
                      <th className="py-2.5 px-3">Modelo</th>
                      <th className="py-2.5 px-3 text-right">N/S (Serial)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {equipments.map((eq) => (
                      <tr key={eq.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{eq.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{eq.brand || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-400">{eq.model || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-350">{eq.serial_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Formulário para adicionar Equipamento */}
            <form onSubmit={handleCreateEquipment} className="border-t border-slate-850 pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-slate-200">Cadastrar Novo Equipamento</h4>
              
              {eqSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-450 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Equipamento adicionado!
                </div>
              )}
              {eqError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-450">
                  {eqError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identificação / Nome</label>
                  <input
                    type="text"
                    placeholder="Ex: Notebook Luan"
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Dell"
                    value={eqBrand}
                    onChange={(e) => setEqBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Latitude 3420"
                    value={eqModel}
                    onChange={(e) => setEqModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nº de Série / Tag</label>
                  <div className="relative">
                    <QrCode className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Ex: PE091728"
                      value={eqSerial}
                      onChange={(e) => setEqSerial(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingEq || eqSuccess}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-650/10"
                >
                  {addingEq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Adicionar Equipamento
                </button>
              </div>
            </form>
          </div>

          {/* Histórico de Ordens de Serviço */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-500" /> Ordens de Serviço
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Chamados técnicos abertos para este cliente.</p>
                </div>
                <Link 
                  href={`/dashboard/orders?new=true&clientId=${client.id}`}
                  className="bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 font-semibold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Abrir OS
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <ClipboardList className="w-10 h-10 text-slate-700 mb-3" />
                  <h4 className="text-sm font-bold text-slate-400">Nenhuma Ordem de Serviço</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">Não há chamados associados a este cliente no momento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-550 font-semibold text-[10px] uppercase tracking-wider bg-slate-950/20">
                        <th className="py-3 px-4">OS ID</th>
                        <th className="py-3 px-4">Equipamento</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Data</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {orders.map((order) => (
                        <tr 
                          key={order.id} 
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                          className="hover:bg-slate-800/20 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-semibold text-slate-400 font-mono text-xs">
                            #{order.codigo_os || order.id.slice(0, 8)}
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-medium truncate max-w-[180px]">
                            {order.equipment_details}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-450 text-xs">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-200">
                            R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
