import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Apply rate limiting to sensitive endpoints
  if (pathname.startsWith('/api/auth') || pathname.includes('/login')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.LOGIN);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  if (pathname.includes('/forgot-password') || pathname.includes('/reset-password')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.PASSWORD_RESET);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  if (pathname.includes('/withdrawal')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.WITHDRAWAL);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  // Apply default rate limit to all API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.API_DEFAULT);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    '/api/:path*',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/(admin|broker)/:path*/withdrawal/:path*',
  ],
};
