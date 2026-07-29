import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password-hash";

export class PasswordInUseError extends Error {
  constructor() {
    super("That password is already in use — pick a different one.");
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super("Current password is incorrect.");
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found.");
  }
}

export class CannotDeleteAdminError extends Error {
  constructor() {
    super("The admin account can't be deleted.");
  }
}

interface ExcludedField {
  userId: string;
  field: "passwordHash" | "visitorPasswordHash";
}

async function isPasswordInUse(candidate: string, exclude: ExcludedField[] = []): Promise<boolean> {
  const users = await prisma.user.findMany({
    select: { id: true, passwordHash: true, visitorPasswordHash: true },
  });

  for (const user of users) {
    const skipOwner = exclude.some((e) => e.userId === user.id && e.field === "passwordHash");
    if (!skipOwner && (await verifyPassword(candidate, user.passwordHash))) {
      return true;
    }

    if (user.visitorPasswordHash) {
      const skipVisitor = exclude.some(
        (e) => e.userId === user.id && e.field === "visitorPasswordHash"
      );
      if (!skipVisitor && (await verifyPassword(candidate, user.visitorPasswordHash))) {
        return true;
      }
    }
  }

  return false;
}

export async function findUserByCredential(
  candidate: string
): Promise<{ id: string; role: "owner" | "visitor"; isAdmin: boolean } | null> {
  const users = await prisma.user.findMany({
    select: { id: true, isAdmin: true, passwordHash: true, visitorPasswordHash: true },
  });

  for (const user of users) {
    if (await verifyPassword(candidate, user.passwordHash)) {
      return { id: user.id, role: "owner", isAdmin: user.isAdmin };
    }
  }

  for (const user of users) {
    if (user.visitorPasswordHash && (await verifyPassword(candidate, user.visitorPasswordHash))) {
      return { id: user.id, role: "visitor", isAdmin: user.isAdmin };
    }
  }

  return null;
}

export async function createUser(input: { label: string; password: string }) {
  if (await isPasswordInUse(input.password)) {
    throw new PasswordInUseError();
  }

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: { label: input.label, isAdmin: false, passwordHash },
    select: { id: true, label: true, createdAt: true },
  });
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, createdAt: true, visitorPasswordHash: true },
  });

  return users.map((u) => ({
    id: u.id,
    label: u.label,
    createdAt: u.createdAt,
    hasVisitorPassword: u.visitorPasswordHash !== null,
  }));
}

export async function deleteUserCascade(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();
  if (user.isAdmin) throw new CannotDeleteAdminError();

  const recordings = await prisma.recording.findMany({
    where: { userId, videoSource: "UPLOAD" },
    select: { videoUrl: true },
  });
  await Promise.all(recordings.map((r) => del(r.videoUrl).catch(() => {})));

  await prisma.user.delete({ where: { id: userId } });
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new WrongPasswordError();
  }

  if (await isPasswordInUse(newPassword, [{ userId, field: "passwordHash" }])) {
    throw new PasswordInUseError();
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function resetUserPassword(targetUserId: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new UserNotFoundError();

  if (await isPasswordInUse(newPassword, [{ userId: targetUserId, field: "passwordHash" }])) {
    throw new PasswordInUseError();
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
}

export async function setVisitorPassword(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();

  if (await isPasswordInUse(password, [{ userId, field: "visitorPasswordHash" }])) {
    throw new PasswordInUseError();
  }

  const visitorPasswordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { visitorPasswordHash } });
}

export async function clearVisitorPassword(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { visitorPasswordHash: null } });
}
