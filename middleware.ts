import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Auth Middleware — Trust Care
 *
 * Protege todas as rotas /dashboard/* e /api/* (exceto as públicas).
 * Usa @supabase/ssr para validar o cookie de sessão server-side,
 * sem round-trip ao banco — apenas verificação de JWT.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresca a sessão se o access token expirou (silencioso)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redireciona para /login se tentar acessar rotas protegidas sem sessão
  if (!user && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redireciona para /dashboard se já autenticado e acessar /login ou /register
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas exceto:
     * - _next/static (arquivos estáticos do build)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - Rotas públicas: /rastreio, /orcamento/*
     * - API pública: /api/rate-limit (chamada pelo middleware do rastreio)
     */
    '/((?!_next/static|_next/image|favicon.ico|rastreio|orcamento|api/rate-limit).*)',
  ],
};
