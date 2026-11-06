import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyPortalToken } from '@/lib/utils/portalSession';
import { isPlatformAdmin } from '@/lib/auth/platformAdmin';

/**
 * Proxy Router — Trust Care SaaS (Next.js 16)
 * Handles perimeter authentication, session renewal, customer portal auth,
 * platform admin authorization, and tenant subdomain routing.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Immediate bypass for preview/design tools
  if (pathname.startsWith('/design-preview')) {
    return NextResponse.next();
  }

  // 1. Detect dynamic subdomains for tenant isolation
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
    pathname === '/forgot-password' ||
    pathname.startsWith('/portal/dashboard') ||
    pathname === '/portal';

  // Fast path for non-auth public routes (API, landing, tracking, budgets)
  if (!needsAuth) {
    return supabaseResponse;
  }

  // 2. Initialize Supabase SSR Client with cookie synchronization
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // Authenticate admin/technician session (F-29: strictly Supabase Auth; mock only if test mode).
  // 3-second timeout prevents network hangs if Supabase Auth is unreachable.
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
    const redirectResponse = NextResponse.redirect(url, 307);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  const search = request.nextUrl.search || '';
  const targetNext = `${pathname}${search}`;

  // 3. Backoffice (God Mode) protection via role platform_admin (F-32)
  if (pathname.startsWith('/backoffice')) {
    if (!isAdminAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(targetNext)}`;
      return redirectWithCookies(url);
    }

    if (!user || !isPlatformAdmin(user)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return redirectWithCookies(url);
    }
  }

  // 4. Admin / Technician dashboard route protection
  if (pathname.startsWith('/dashboard') && !isAdminAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(targetNext)}`;
    return redirectWithCookies(url);
  }

  // 5. Public auth routes redirect to /dashboard if already authenticated
  if (
    (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') &&
    isAdminAuthenticated
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return redirectWithCookies(url);
  }

  // 6. Customer Portal route protection
  if (pathname.startsWith('/portal/dashboard') && !isPortalAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    url.search = '';
    return redirectWithCookies(url);
  }

  if (pathname === '/portal' && isPortalAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/dashboard';
    url.search = '';
    return redirectWithCookies(url);
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static asset extensions (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
