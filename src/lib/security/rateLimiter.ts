const requestCounts = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  resetTime: number;
}

export function checkRateLimit(
  ip: string,
  options: { limit: number; windowMs: number } = { limit: 120, windowMs: 60000 }
): RateLimitResult {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    const resetTime = now + options.windowMs;
    requestCounts.set(ip, { count: 1, resetAt: resetTime });
    return { allowed: true, resetTime };
  }

  if (entry.count >= options.limit) {
    return { allowed: false, resetTime: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, resetTime: entry.resetAt };
}
