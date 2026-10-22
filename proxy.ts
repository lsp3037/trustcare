import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyPortalToken } from '@/lib/utils/portalSession';
import { isPlatformAdmin } from '@/lib/auth/platformAdmin';

/**
 * Proxy Router — Trust Care (Next.js 16)
 * Handles admin auth, customer portal auth, and dynamic subdomain routing.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Bypassa imediatamente rotas isoladas de prévia visual para não travar na chamada do Supabase
  if (pathname.startsWith('/design-preview') || pathname === '/preview.html') {
    return NextResponse.next();
  }

  // 1. Detect dynamic subdomains
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  
  let subdomain = '';
  if (parts.length > 2 && parts[0] !== 'www') {
    subdomain = parts[0];
  } else if (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'www') {
    subdomain = parts[0];
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-subdomain');
  if (subdomain) {
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const needsAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/backoffice') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/portal/dashboard') ||
    pathname === '/portal';

  if (!needsAuth) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Authenticate admin/technician session (F-29: estritamente Supabase Auth; mock apenas se PLAYWRIGHT_TEST=true).
  // Timeout de 3s evita que o proxy trave quando o Supabase está inacessível.
  let user = null;
  try {
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 3000)
    );
    const result = await Promise.race([userPromise, timeoutPromise]);
    user = result.data?.user ?? null;
  } catch {
    user = null;
  }

  const isTest = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true';
  const isMockAuthenticated = isTest && request.cookies.get('os-session-mock')?.value === 'true';
  const isAdminAuthenticated = !!user || isMockAuthenticated;

  const portalSessionToken = request.cookies.get('portal-session')?.value;
  const isPortalAuthenticated = !!verifyPortalToken(portalSessionToken);

  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Backoffice (God Mode) protection via role platform_admin (F-32)
  if (pathname.startsWith('/backoffice')) {
    if (!user || !isPlatformAdmin(user)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return redirectWithCookies(url);
    }
  }

  // 2. Admin dashboard route protection
  if (pathname.startsWith('/dashboard') && !isAdminAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return redirectWithCookies(url);
  }

  if ((pathname === '/login' || pathname === '/register') && isAdminAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return redirectWithCookies(url);
  }

  // 3. Customer Portal route protection
  if (pathname.startsWith('/portal/dashboard') && !isPortalAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    return redirectWithCookies(url);
  }

  if (pathname === '/portal' && isPortalAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/dashboard';
    return redirectWithCookies(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Intercepts all routes except static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
