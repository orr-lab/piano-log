import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 2 * 60 * 1000;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

export async function isLoginRateLimited(
  ip: string
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const attempts = await prisma.loginAttempt.findMany({
    where: { ip, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "asc" },
  });

  if (attempts.length < MAX_ATTEMPTS) {
    return { limited: false };
  }

  const oldest = attempts[0];
  const retryAfterMs = WINDOW_MS - (Date.now() - oldest.createdAt.getTime());
  return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

export async function recordFailedLoginAttempt(ip: string): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  await prisma.loginAttempt.deleteMany({ where: { ip, createdAt: { lt: windowStart } } });
  await prisma.loginAttempt.create({ data: { ip } });
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } });
}
