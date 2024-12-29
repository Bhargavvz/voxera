import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    console.log('Middleware processing request:', request.nextUrl.pathname);
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });

    // Refresh session if expired - required for Server Components
    console.log('Getting session...');
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    console.log('Session status:', session ? 'Active' : 'No session');

    // Auth condition
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register');
    const isProtectedPage = request.nextUrl.pathname.startsWith('/feed') ||
      request.nextUrl.pathname.startsWith('/profile') ||
      request.nextUrl.pathname.startsWith('/messages') ||
      request.nextUrl.pathname.startsWith('/notifications') ||
      request.nextUrl.pathname.startsWith('/search');

    // If user is signed in and tries to access auth pages, redirect to feed
    if (session && isAuthPage) {
      console.log('Authenticated user trying to access auth page, redirecting to feed');
      const response = NextResponse.redirect(new URL('/feed', request.url));
      return response;
    }

    // If user is not signed in and tries to access protected pages, redirect to login
    if (!session && isProtectedPage) {
      console.log('Unauthenticated user trying to access protected page, redirecting to login');
      const returnUrl = encodeURIComponent(request.nextUrl.pathname);
      const response = NextResponse.redirect(new URL(`/login?returnUrl=${returnUrl}`, request.url));
      return response;
    }

    // Handle root path redirect
    if (request.nextUrl.pathname === '/') {
      if (session) {
        console.log('Root path access with session, redirecting to feed');
        const response = NextResponse.redirect(new URL('/feed', request.url));
        return response;
      }
      console.log('Root path access without session, redirecting to login');
      const response = NextResponse.redirect(new URL('/login', request.url));
      return response;
    }

    // Set session cookie and return
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 