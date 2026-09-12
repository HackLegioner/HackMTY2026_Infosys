export interface RateLimitResult {
  allowed: boolean;
  resetTime: number;
}

const inMemoryCounts = new Map<string, { count: number; resetAt: number }>();

function checkInMemory(ip: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    const resetTime = now + windowMs;
    inMemoryCounts.set(ip, { count: 1, resetAt: resetTime });
    return { allowed: true, resetTime };
  }

  if (entry.count >= limit) {
    return { allowed: false, resetTime: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, resetTime: entry.resetAt };
}

export async function checkRateLimit(
  ip: string,
  options: { limit: number; windowMs: number } = { limit: 120, windowMs: 60000 }
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const windowSec = Math.ceil(options.windowMs / 1000);
      const cleanIp = ip.replace(/[^a-zA-Z0-9:_-]/g, '');
      const key = `ratelimit:${cleanIp}`;
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSec],
        ]),
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data = await res.json();
        const currentCount = Number(data[0]?.result || 1);
        return {
          allowed: currentCount <= options.limit,
          resetTime: Date.now() + options.windowMs,
        };
      }
    } catch (_err) {
      // Fallback to local in-memory
    }
  }

  return checkInMemory(ip, options.limit, options.windowMs);
}
