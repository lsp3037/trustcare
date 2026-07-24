import { Metadata } from 'next';
import OrcamentoClient from './OrcamentoClient';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params;

  // Tenta buscar a OS pelo ID
  try {
    const { data: order } = await supabaseAdmin
      .from('service_orders')
      .select('codigo_os, companies(name)')
      .eq('id', id)
      .single();

    if (order) {
      const companyData: any = order.companies;
      const companyName = companyData?.name || 'Oficina';
      const orderCode = order.codigo_os || id.substring(0, 8);
      
      return {
        title: `Orçamento OS #${orderCode} | ${companyName}`,
        description: `Visualize e aprove o orçamento da sua Ordem de Serviço da ${companyName}.`,
        openGraph: {
          title: `Orçamento OS #${orderCode} | ${companyName}`,
          description: `Visualize e aprove o orçamento da sua Ordem de Serviço da ${companyName}.`,
        },
      };
    }
  } catch (err) {
    // Falha silenciosa para metadados, cai pro default abaixo
  }

  // Fallback genérico
  return {
    title: 'Aprovação de Orçamento | Ordem de Serviço',
    description: 'Visualize e aprove o orçamento da sua Ordem de Serviço online.',
    openGraph: {
      title: 'Aprovação de Orçamento',
      description: 'Visualize e aprove o orçamento da sua Ordem de Serviço online.',
    }
  };
}

export default function OrcamentoPage() {
  return <OrcamentoClient />;
}
