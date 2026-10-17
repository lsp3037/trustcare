import crypto from 'crypto';

function getSecret(): string {
  return (
    process.env.PORTAL_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'trustcare-portal-session-internal-secret-key-32chars-min'
  );
}

export function signPortalToken(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const payload = JSON.stringify({
    email: normalizedEmail,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias de validade
  });

  const b64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(b64Payload)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

export function verifyPortalToken(token: string | undefined | null): { email: string } | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [b64Payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(b64Payload)
    .digest('base64url');

  if (signature.length !== expectedSignature.length) return null;

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const rawPayload = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(rawPayload);

    if (!parsed.email || typeof parsed.email !== 'string') {
      return null;
    }

    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }

    return { email: parsed.email };
  } catch {
    return null;
  }
}
