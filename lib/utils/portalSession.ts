import crypto from 'crypto';

// Fail-closed: a known static fallback would let anyone forge portal sessions.
function getSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Portal session secret ausente: defina PORTAL_SESSION_SECRET no ambiente do servidor.');
  }
  return secret;
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
  let expectedSignature: string;
  try {
    expectedSignature = crypto
      .createHmac('sha256', getSecret())
      .update(b64Payload)
      .digest('base64url');
  } catch {
    // Misconfigured secret: deny the session instead of crashing the proxy.
    return null;
  }

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
