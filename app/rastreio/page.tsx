import { Metadata } from 'next';
import RastreioClient from './RastreioClient';

export const metadata: Metadata = {
  title: 'Rastrear Ordem de Serviço | Consulta Pública',
  description: 'Acompanhe o status e as atualizações da sua Ordem de Serviço em tempo real.',
  openGraph: {
    title: 'Rastrear Ordem de Serviço',
    description: 'Acompanhe o status e as atualizações da sua Ordem de Serviço em tempo real.',
  },
};

export default function RastreioPage() {
  return <RastreioClient />;
}
