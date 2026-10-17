import { supabaseAdmin } from '@/lib/supabase/admin';

export interface MinimalUser {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

/**
 * Valida se o usuário autenticado possui o papel de super-administrador da plataforma (F-32).
 * Exige:
 * 1. E-mail confirmado (email_confirmed_at)
 * 2. Papel 'platform_admin' em app_metadata (inalterável pelo cliente) OU inclusão na env PLATFORM_ADMIN_EMAILS
 */
export function isPlatformAdmin(user: MinimalUser | null | undefined): boolean {
  if (!user || !user.email) return false;

  // Exige que o e-mail esteja confirmado para ações de super-admin
  if (!user.email_confirmed_at) {
    return false;
  }

  // 1. Verificação via app_metadata (protegido pelo Supabase Auth)
  if (user.app_metadata?.role === 'platform_admin') {
    return true;
  }

  // 2. Verificação via lista configurável de variáveis de ambiente
  const configuredAdmins = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (configuredAdmins.includes(user.email.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Registra auditoria de acessos e ações de super-admin no backoffice (F-32).
 */
export async function logPlatformAudit(params: {
  userId?: string;
  email?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from('platform_audit_logs').insert({
      user_id: params.userId || null,
      email: params.email || null,
      action: params.action,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
    });
  } catch (err) {
    console.error('[Platform Audit] Erro ao gravar log de auditoria:', err);
  }
}
