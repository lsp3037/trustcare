import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore if called from a Server Component
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If we are coming from a reset password email, redirect to update password page
      if (next === '/update-password' || request.url.includes('type=recovery')) {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Error exchanging code for session:', error.message);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid_Token`);
}
