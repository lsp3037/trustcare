import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// O token de Service Role (segredo do backend) permite contornar as políticas RLS para ações administrativas
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && typeof window === 'undefined') {
  console.warn(
    'AVISO: SUPABASE_SERVICE_ROLE_KEY não está definida no ambiente do servidor. ' +
    'Ações administrativas do webhook usarão a chave anônima como fallback para evitar quebra no import.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
