import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy Router — Trust Care (Next.js 16)
 * Handles admin auth, customer portal auth, and dynamic subdomain routing.
 */
export async function proxy(request: NextRequest) {
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
  if (subdomain) {
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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

  // Authenticate admin/technician session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  
  // Verification flags
  const isMockAuthenticated = request.cookies.get('os-session-mock')?.value === 'true';
  const isAdminAuthenticated = !!user || isMockAuthenticated;

  const isPortalAuthenticated = request.cookies.get('portal-session-mock')?.value === 'true';

  // 2. Admin dashboard route protection
  if (pathname.startsWith('/dashboard') && !isAdminAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === '/login' || pathname === '/register') && isAdminAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 3. Customer Portal route protection
  if (pathname.startsWith('/portal/dashboard') && !isPortalAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    return NextResponse.redirect(url);
  }

  if (pathname === '/portal' && isPortalAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/dashboard';
    return NextResponse.redirect(url);
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
