import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/security/rateLimiter';
import { getAuditTier } from '@/lib/security/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Health check & SSE stream bypass: NEVER rate-limit cloud health probes or real-time streams
  if (
    pathname === '/api/health' ||
    pathname === '/health' ||
    pathname.startsWith('/api/ws')
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip =
      request.ip ||
      (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1';

    const rateCheck = await checkRateLimit(ip, { limit: 300, windowMs: 60 * 1000 });

    if (!rateCheck.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Rate limit exceeded.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    if (pathname.startsWith('/api/audit')) {
      const apiKey = request.headers.get('x-api-key');
      const tier = getAuditTier(apiKey);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-audit-tier', tier);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
