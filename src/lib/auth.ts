export const SESSION_COOKIE = "plog_session";

export type Role = "owner" | "visitor";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function passwordForRole(role: Role): string {
  return (role === "owner" ? process.env.SITE_PASSWORD : process.env.VISITOR_PASSWORD) ?? "";
}

async function computeRoleToken(role: Role): Promise<string> {
  return sha256Hex(`plog:${role}:${passwordForRole(role)}`);
}

/** Checks a submitted password against both roles' passwords. Returns the matching role, or null. */
export async function roleForPassword(password: string): Promise<Role | null> {
  if (process.env.SITE_PASSWORD && constantTimeEqual(password, process.env.SITE_PASSWORD)) {
    return "owner";
  }
  if (process.env.VISITOR_PASSWORD && constantTimeEqual(password, process.env.VISITOR_PASSWORD)) {
    return "visitor";
  }
  return null;
}

export async function createSessionCookieValue(role: Role): Promise<string> {
  return `${role}:${await computeRoleToken(role)}`;
}

/** Verifies a session cookie value and returns the authenticated role, or null. */
export async function verifySessionCookie(value: string | undefined): Promise<Role | null> {
  if (!value) return null;
  const separatorIndex = value.indexOf(":");
  if (separatorIndex === -1) return null;

  const role = value.slice(0, separatorIndex) as Role;
  const token = value.slice(separatorIndex + 1);
  if (role !== "owner" && role !== "visitor") return null;
  if (!passwordForRole(role)) return null;

  const expected = await computeRoleToken(role);
  return constantTimeEqual(token, expected) ? role : null;
}
