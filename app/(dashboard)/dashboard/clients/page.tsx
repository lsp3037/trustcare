'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  Plus, 
  Loader2, 
  AlertCircle,
  Building,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  X,
  Laptop,
  QrCode
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.358 5.03l-1.373 5.016 5.137-1.348a9.97 9.97 0 004.866 1.28h.004c5.507 0 9.99-4.478 9.99-9.986 0-2.67-1.04-5.18-2.932-7.07A9.92 9.92 0 0012.012 2zm5.72 14.242c-.25.706-1.464 1.294-2.007 1.348-.48.047-.946.064-3.03-.755-2.668-1.05-4.388-3.766-4.52-3.942-.136-.176-1.1-1.464-1.1-2.79 0-1.328.697-1.98.946-2.242.25-.262.544-.328.726-.328h.518c.163 0 .385-.062.59.43.21.503.714 1.742.775 1.868.062.126.103.272.019.44-.083.167-.126.272-.25.419-.126.146-.263.327-.376.44-.126.126-.26.262-.11.517.15.25.666 1.097 1.428 1.776.98.874 1.802 1.144 2.057 1.272.25.126.398.106.545-.062.146-.17.63-.732.8-.98.17-.25.337-.21.562-.126.224.084 1.428.673 1.674.797.247.126.41.188.47.293.06.104.06.602-.19 1.308z"/>
  </svg>
);

const getWhatsAppLink = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  let cleanPhone = digits;
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}`;
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estados para formulário de Novo Cliente
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('PF');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Estados adicionais para fluxo de Equipamento integrado
  const [createdClient, setCreatedClient] = useState<any | null>(null);
  const [addedEquipments, setAddedEquipments] = useState<any[]>([]);
  const [eqName, setEqName] = useState('');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [addingEq, setAddingEq] = useState(false);
  const [eqError, setEqError] = useState('');
  const [eqSuccess, setEqSuccess] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      const processed = (data || []).map((c: any, index: number) => ({
        ...c,
        client_number: c.client_number || (1001 + index)
      }));
      setClients(processed);
    } catch (err) {
      console.warn('Erro ao carregar clientes do Supabase, usando fallback local:', err);
      loadLocalClients();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalClients = () => {
    const localClients = localStorage.getItem('mock-clients');
    if (localClients) {
      const parsed = JSON.parse(localClients);
      const processed = parsed.map((c: any, index: number) => ({
        ...c,
        client_number: c.client_number || (1001 + index)
      }));
      setClients(processed);
    } else {
      const initialMock = [
        { id: 'c1', client_number: 1001, type: 'PJ', name: 'Tech Solutions Ltda', document: '12.345.678/0001-90', phone: '(11) 98765-4321', email: 'contato@techsolutions.com' },
        { id: 'c2', client_number: 1002, type: 'PF', name: 'Carlos Henrique Souza', document: '123.456.789-00', phone: '(21) 99999-8888', email: 'carlos.souza@gmail.com' },
        { id: 'c3', client_number: 1003, type: 'PJ', name: 'Clínica Sorriso Perfeito', document: '98.765.432/0001-21', phone: '(11) 5555-4444', email: 'financeiro@sorrisoperfeito.com.br' },
        { id: 'c4', client_number: 1004, type: 'PF', name: 'Juliana Mendes', document: '987.654.321-11', phone: '(31) 98888-7777', email: 'juliana.mendes@outlook.com' },
      ];
      localStorage.setItem('mock-clients', JSON.stringify(initialMock));
      setClients(initialMock);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          companyId = profile.company_id;
        }
      }

      const newClientData = {
        company_id: companyId,
        type,
        name,
        document,
        phone,
        email,
      };

      const { data: insertedClient, error } = await supabase
        .from('clients')
        .insert(newClientData)
        .select()
        .single();

      let finalClient = insertedClient;

      if (error) {
        console.warn('Falha Supabase, salvando mock local:', error.message);
        
        // Salva mock com número sequencial
        const currentMock = [...clients];
        const nextNumber = Math.max(...currentMock.map(c => c.client_number || 1000), 1000) + 1;
        const mockId = `mock-client-${Date.now()}`;
        finalClient = {
          id: mockId,
          client_number: nextNumber,
          ...newClientData
        };
        currentMock.push(finalClient);
        localStorage.setItem('mock-clients', JSON.stringify(currentMock));
      }

      setCreatedClient(finalClient);
      setFormSuccess(true);
      fetchClients();

    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdClient) return;

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
        client_id: createdClient.id,
        name: eqName,
        brand: eqBrand,
        model: eqModel,
        serial_number: eqSerial,
      };

      const { data: insertedEq, error } = await supabase
        .from('client_equipments')
        .insert(newEq)
        .select()
        .single();

      let finalEq = insertedEq;

      if (error) {
        console.warn('Falha Supabase, inserindo equipamento mock local:', error.message);
        
        const mockEqs = localStorage.getItem('mock-equipments');
        const allEqs = mockEqs ? JSON.parse(mockEqs) : [
          { id: 'eq1', client_id: 'c1', name: 'Notebook Dell Latitude 3420', brand: 'Dell', model: 'Latitude 3420', serial_number: 'PE091728' },
          { id: 'eq2', client_id: 'c2', name: 'Desktop Gamer Custom', brand: 'Custom', model: 'Custom Intel i7', serial_number: 'N/A' },
          { id: 'eq3', client_id: 'c3', name: 'Servidor HP ProLiant DL360 Gen10', brand: 'HP', model: 'ProLiant DL360 Gen10', serial_number: 'SGH817A29B' },
          { id: 'eq4', client_id: 'c4', name: 'MacBook Air M1', brand: 'Apple', model: 'MacBook Air M1 2020', serial_number: 'FVFDR899Q6L5' },
        ];
        
        finalEq = {
          id: `mock-eq-${Date.now()}`,
          ...newEq
        };
        allEqs.push(finalEq);
        localStorage.setItem('mock-equipments', JSON.stringify(allEqs));
      }

      setAddedEquipments((prev) => [...prev, finalEq || newEq]);
      setEqSuccess(true);
      setEqName('');
      setEqBrand('');
      setEqModel('');
      setEqSerial('');
      
      setTimeout(() => {
        setEqSuccess(false);
      }, 3000);

    } catch (err: any) {
      setEqError(err.message || 'Erro ao adicionar equipamento.');
    } finally {
      setAddingEq(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreating(false);
    setCreatedClient(null);
    setAddedEquipments([]);
    setName('');
    setDocument('');
    setPhone('');
    setEmail('');
    setType('PF');
    setFormSuccess(false);
    setFormError('');
    setEqName('');
    setEqBrand('');
    setEqModel('');
    setEqSerial('');
    setEqSuccess(false);
    setEqError('');
    fetchClients();
  };

  const filteredClients = clients.filter((client) => {
    return (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.document && client.document.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-8 h-8 text-blue-500" /> Clientes
          </h1>
          <p className="text-slate-400 mt-1">Gerencie a base de contatos e clientes da sua empresa.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">Adicionar Novo Cliente</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre uma pessoa física ou jurídica.</p>
            </div>
            <button
              onClick={handleCloseModal}
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleCreateClient} className="space-y-5">
            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Cliente cadastrado com sucesso!</p>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-455">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      name="client-type"
                      checked={type === 'PF'}
                      onChange={() => setType('PF')}
                      disabled={submitting || createdClient !== null}
                      className="accent-blue-500 h-4 w-4 bg-slate-950 border border-slate-800 disabled:opacity-50"
                    />
                    Pessoa Física (PF)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-350 cursor-pointer">
                    <input
                      type="radio"
                      name="client-type"
                      checked={type === 'PJ'}
                      onChange={() => setType('PJ')}
                      disabled={submitting || createdClient !== null}
                      className="accent-blue-500 h-4 w-4 bg-slate-950 border border-slate-800 disabled:opacity-50"
                    />
                    Pessoa Jurídica (PJ)
                  </label>
                </div>
              </div>

              {/* Documento (CPF/CNPJ) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {type === 'PF' ? 'CPF' : 'CNPJ'}
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={type === 'PF' ? 'Ex: 123.456.789-00' : 'Ex: 12.345.678/0001-90'}
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    disabled={submitting || createdClient !== null}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Nome / Razão Social */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {type === 'PF' ? 'Nome Completo' : 'Razão Social'}
              </label>
              <div className="relative">
                {type === 'PF' ? (
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                ) : (
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                )}
                <input
                  type="text"
                  placeholder={type === 'PF' ? 'Ex: Carlos Henrique de Souza' : 'Ex: Tech Solutions Ltda'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting || createdClient !== null}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting || createdClient !== null}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Ex: cliente@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || createdClient !== null}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Ações */}
            {!createdClient && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="submit"
                  disabled={submitting || formSuccess}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-6 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200 disabled:opacity-55"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Salvar Cliente'
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Seção de Equipamentos (exibida após o cliente ser salvo com sucesso) */}
          {createdClient && (
            <div className="mt-8 pt-8 border-t border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-400" /> Equipamentos do Cliente
                </h3>
                <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-semibold">
                  {addedEquipments.length} {addedEquipments.length === 1 ? 'equipamento adicionado' : 'equipamentos adicionados'}
                </span>
              </div>

              {/* Lista de equipamentos adicionados na sessão */}
              {addedEquipments.length > 0 && (
                <div className="bg-slate-950/45 rounded-xl border border-slate-800/80 overflow-hidden shadow-md">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/30">
                        <th className="py-2.5 px-3">Equipamento</th>
                        <th className="py-2.5 px-3">Marca</th>
                        <th className="py-2.5 px-3">Modelo</th>
                        <th className="py-2.5 px-3 text-right">Serial</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {addedEquipments.map((eq, idx) => (
                        <tr key={eq.id || idx} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{eq.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{eq.brand || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-400">{eq.model || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-350">{eq.serial_number || '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreating(false);
                                router.push(`/dashboard/orders?new=true&client_id=${createdClient?.id}&equipment_id=${eq.id}`);
                              }}
                              className="inline-flex items-center gap-1 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 font-bold px-2 py-1 rounded transition-colors text-[10px]"
                            >
                              <Plus className="w-3 h-3" /> Abrir O.S.
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formulário de novo equipamento */}
              <form onSubmit={handleCreateEquipment} className="space-y-4 bg-slate-950/45 p-5 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Novo Equipamento</h4>

                {eqSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Equipamento adicionado com sucesso!
                  </div>
                )}
                {eqError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-455">
                    {eqError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identificação / Nome</label>
                    <input
                      type="text"
                      placeholder="Ex: Notebook do Cliente"
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
                      placeholder="Ex: Lenovo"
                      value={eqBrand}
                      onChange={(e) => setEqBrand(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modelo</label>
                    <input
                      type="text"
                      placeholder="Ex: ThinkPad E14"
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
                        placeholder="Ex: PF1A2B3C"
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
                    disabled={addingEq}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-650/10 disabled:opacity-50"
                  >
                    {addingEq ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Adicionar Equipamento
                  </button>
                </div>
              </form>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  Concluir Cadastro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lastEqId = addedEquipments.length > 0 ? addedEquipments[addedEquipments.length - 1].id : '';
                    setIsCreating(false);
                    router.push(`/dashboard/orders?new=true&client_id=${createdClient?.id}${lastEqId ? `&equipment_id=${lastEqId}` : ''}`);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/15 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Concluir e Criar O.S.
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Campo de Busca */}
          <div className="relative w-full md:max-w-md bg-slate-900/40 p-1 rounded-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Listagem de Clientes */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-slate-400">Carregando clientes...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900 text-center px-4">
              <AlertCircle className="w-12 h-12 text-slate-650 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">Nenhum cliente encontrado</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">Tente ajustar seus termos de pesquisa.</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-950/45">
                      <th className="py-4 px-6 text-center">ID</th>
                      <th className="py-4 px-6">Nome</th>
                      <th className="py-4 px-6">Tipo</th>
                      <th className="py-4 px-6">Documento</th>
                      <th className="py-4 px-6">Contato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 text-center font-semibold text-slate-450 text-xs font-mono">
                          #{client.client_number || client.id.toString().slice(0, 4)}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-200">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg shrink-0 ${client.type === 'PJ' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {client.type === 'PJ' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <Link href={`/dashboard/clients/${client.id}`} className="truncate max-w-[200px] md:max-w-xs hover:text-blue-400 hover:underline transition-colors">
                              {client.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${client.type === 'PJ' ? 'bg-indigo-550/20 text-indigo-400 border border-indigo-500/20' : 'bg-blue-550/20 text-blue-400 border border-blue-500/20'}`}>
                            {client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-350 font-mono text-xs">{client.document || '—'}</td>
                        <td className="py-4 px-6 space-y-1 text-slate-400 text-xs">
                          {client.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              <span>{client.phone}</span>
                              <a 
                                href={getWhatsAppLink(client.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500 hover:text-emerald-400 p-0.5 hover:bg-emerald-500/10 rounded transition-colors ml-1"
                                title="Enviar mensagem no WhatsApp"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hover:text-blue-400 cursor-pointer">{client.email}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
