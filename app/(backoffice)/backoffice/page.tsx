import { supabaseAdmin } from '@/lib/supabase/admin';
import { ShieldAlert, Users, CreditCard, Activity } from 'lucide-react';
import { Badge } from '@/components/ui';

export const revalidate = 0; // Disable cache for god mode

export default async function BackofficePage() {
  // Fetch all companies using Service Role Key (bypassing RLS)
  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select(`
      id, 
      name, 
      subdomain, 
      subscription_plan, 
      subscription_status, 
      created_at,
      profiles (count),
      service_orders (count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies in backoffice:', error);
    return (
      <div className="p-8 text-center bg-red-900/20 border border-red-500/50 rounded-xl text-red-500">
        <h2 className="text-h2 mb-2">Erro Crítico</h2>
        <p>Não foi possível carregar os dados dos tenants. Verifique os logs do servidor.</p>
      </div>
    );
  }

  const activeTenants = companies?.filter(c => c.subscription_status === 'active').length || 0;
  const totalTenants = companies?.length || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h1 text-white">Tenants (Empresas)</h2>
          <p className="text-small text-slate-400 mt-1">Gestão global de todas as empresas cadastradas no SaaS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Total de Empresas</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BuildingIcon className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{totalTenants}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Assinaturas Ativas</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-emerald-500">{activeTenants}</p>
        </div>

        <div className="bg-slate-900 border-red-500/30 border rounded-xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-red-400 font-medium">Status de Segurança</h3>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-500 relative z-10 uppercase tracking-wider">GOD MODE ON</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-h3 text-white">Listagem de Tenants</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Subdomínio</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">O.S. / Usuários</th>
                <th className="px-6 py-4">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {companies?.map((company) => (
                <tr key={company.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{company.name}</td>
                  <td className="px-6 py-4 text-slate-400">{company.subdomain || '-'}</td>
                  <td className="px-6 py-4">
                    <Badge className="capitalize">{company.subscription_plan || 'Nenhum'}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      tone={
                        company.subscription_status === 'active'
                          ? 'success'
                          : company.subscription_status === 'past_due'
                          ? 'warning'
                          : company.subscription_status === 'canceled'
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {company.subscription_status || 'Trial'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="flex items-center text-slate-400" title="Ordens de Serviço">
                        <Activity className="w-3 h-3 mr-1" />
                        {company.service_orders?.[0]?.count || 0}
                      </span>
                      <span className="flex items-center text-slate-400" title="Usuários Ativos">
                        <Users className="w-3 h-3 mr-1" />
                        {company.profiles?.[0]?.count || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(company.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {(!companies || companies.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma empresa encontrada no banco de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Temporary icon component since Building2 might not be imported correctly if I just wrote BuildingIcon
function BuildingIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}
