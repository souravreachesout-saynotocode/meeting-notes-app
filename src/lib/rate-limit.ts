interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}

// Preset configs
export const RATE_LIMITS = {
  transcribe: { maxRequests: 5, windowMs: 60 * 1000 },       // 5 per minute
  summarize: { maxRequests: 10, windowMs: 60 * 1000 },       // 10 per minute
  chat: { maxRequests: 20, windowMs: 60 * 1000 },            // 20 per minute
  search: { maxRequests: 30, windowMs: 60 * 1000 },          // 30 per minute
  export: { maxRequests: 10, windowMs: 60 * 1000 },          // 10 per minute
  meetings: { maxRequests: 30, windowMs: 60 * 1000 },        // 30 per minute
  calendar: { maxRequests: 10, windowMs: 60 * 1000 },        // 10 per minute
} as const;
