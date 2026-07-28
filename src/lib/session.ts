import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionCookie, type Role } from "@/lib/auth";

/** Server-component helper: reads and verifies the session cookie, returning the role. */
export async function getSessionRole(): Promise<Role | null> {
  const store = await cookies();
  return verifySessionCookie(store.get(SESSION_COOKIE)?.value);
}
