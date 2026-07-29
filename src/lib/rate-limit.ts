import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
// 15 minutes — a standard lockout window (OWASP's authentication guidance suggests several
// minutes to an hour; this errs toward the shorter end since a wrong guess here only exposes a
// personal practice log, not something high-value).
const WINDOW_MS = 15 * 60 * 1000;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

/**
 * Blocked if EITHER this IP or this username has hit the threshold within the window — IP alone
 * would let an attacker bypass the limit by rotating IPs against one account; username alone
 * would let a botnet spread attempts across many accounts from one IP. Tracking both closes both
 * gaps.
 */
export async function isLoginRateLimited(
  ip: string,
  username: string
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const [ipAttempts, usernameAttempts] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { ip, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.loginAttempt.findMany({
      where: { username, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const oldestTimes: Date[] = [];
  if (ipAttempts.length >= MAX_ATTEMPTS) oldestTimes.push(ipAttempts[0].createdAt);
  if (usernameAttempts.length >= MAX_ATTEMPTS) oldestTimes.push(usernameAttempts[0].createdAt);

  if (oldestTimes.length === 0) {
    return { limited: false };
  }

  const retryAfterMs = Math.max(
    ...oldestTimes.map((createdAt) => WINDOW_MS - (Date.now() - createdAt.getTime()))
  );
  return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

export async function recordFailedLoginAttempt(ip: string, username: string): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  await prisma.loginAttempt.deleteMany({
    where: { OR: [{ ip, createdAt: { lt: windowStart } }, { username, createdAt: { lt: windowStart } }] },
  });
  await prisma.loginAttempt.create({ data: { ip, username } });
}

export async function clearLoginAttempts(ip: string, username: string): Promise<void> {
  // Scoped to this exact ip+username pair, not "any row matching either" — otherwise a
  // legitimate login could wipe out an unrelated attacker's separate failure count sharing
  // only the username (or only the IP).
  await prisma.loginAttempt.deleteMany({ where: { ip, username } });
}
