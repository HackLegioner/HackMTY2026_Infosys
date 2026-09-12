import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from './lib/security/rateLimiter';
import { getAuditTier } from './lib/security/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply to /api/* routes
  if (pathname.startsWith('/api')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(ip, { limit: 120, windowMs: 60 * 1000 });

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

    // Audit Tier check forwarding
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
