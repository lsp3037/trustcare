import type { Metadata } from 'next';
import SistemaAberto from './SistemaAberto';

export const metadata: Metadata = {
  title: 'Trust Care | O sistema da sua assistência técnica, módulo por módulo',
  description:
    'Ordem de serviço com checklist e fotos, orçamento assinado pelo celular, estoque com baixa automática, rastreio público e lucro real por OS. Teste 7 dias grátis, sem cartão.',
};

export default function LandingV2() {
  return <SistemaAberto />;
}
