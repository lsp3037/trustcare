import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redireciona diretamente para a tela de login como página de entrada
  redirect('/login');
}
