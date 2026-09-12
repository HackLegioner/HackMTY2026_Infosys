interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  resetTime: number;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

const clients = new Map<string, ClientRecord>();

export function checkRateLimit(ip: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const record = clients.get(ip);

  if (!record || now > record.resetTime) {
    const resetTime = now + options.windowMs;
    clients.set(ip, { count: 1, resetTime });
    return { allowed: true, resetTime };
  }

  if (record.count >= options.limit) {
    return { allowed: false, resetTime: record.resetTime };
  }

  record.count += 1;
  return { allowed: true, resetTime: record.resetTime };
}
