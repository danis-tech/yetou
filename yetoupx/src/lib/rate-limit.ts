const timestamps = new Map<string, number[]>();

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entries = timestamps.get(key) || [];
  const recent = entries.filter((t) => now - t < windowMs);
  recent.push(now);
  timestamps.set(key, recent);

  const allowed = recent.length <= maxRequests;
  return { allowed, remaining: Math.max(0, maxRequests - recent.length) };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}
