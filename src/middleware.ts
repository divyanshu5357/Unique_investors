import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Only apply rate limiting to API calls, not page views
  
  // Apply rate limiting to auth API calls
  if (pathname.startsWith('/api/auth')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.LOGIN);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  // Apply rate limiting to password reset API calls
  if (pathname.startsWith('/api/forgot-password') || pathname.startsWith('/api/reset-password')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.PASSWORD_RESET);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  // Apply rate limiting to withdrawal API calls
  if (pathname.includes('/api/') && pathname.includes('withdrawal')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.WITHDRAWAL);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  // Apply default rate limit to all other API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.API_DEFAULT);
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
// Only match API routes, not page routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
