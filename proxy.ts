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

  // Clientes finais autenticam no mesmo pool do Supabase Auth que a equipe,
  // mas não possuem perfil — o metadata portal_client os separa. O acesso ao
  // /dashboard é decidido pela existência de um profile (fonte da verdade no
  // banco), não pelo metadata, que o próprio usuário consegue alterar.
  const isPortalClient = user?.user_metadata?.portal_client === true;

  let hasStaffProfile = false;
  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/backoffice'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    hasStaffProfile = !!profile;
  }

  // Backoffice (God Mode) protection
  if (pathname.startsWith('/backoffice')) {
    const godModeEmail = process.env.BACKOFFICE_ADMIN_EMAIL;
    if (!user || !hasStaffProfile || !godModeEmail || user.email !== godModeEmail) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 2. Admin dashboard route protection
  if (pathname.startsWith('/dashboard') && !hasStaffProfile) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === '/login' || pathname === '/register') && user && !isPortalClient) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 3. Customer Portal route protection
  if (pathname.startsWith('/portal/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    return NextResponse.redirect(url);
  }

  if (pathname === '/portal' && user) {
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
