// One-time, idempotent rollout script for the multi-tenant users feature.
// Creates the admin User row from SITE_PASSWORD/VISITOR_PASSWORD (hashing them the same way
// src/lib/password-hash.ts does) and attaches any existing userId-less recordings to it.
// Optional ADMIN_USERNAME env var sets the admin's username (defaults to "admin").
// Run with: node scripts/seed-admin.js
require("dotenv").config({ path: [".env.local", ".env"] });
const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");
const { PrismaClient } = require("@prisma/client");

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  const prisma = new PrismaClient();

  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    throw new Error("SITE_PASSWORD must be set to seed the admin account.");
  }

  let admin = await prisma.user.findFirst({ where: { isAdmin: true } });

  if (!admin) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const passwordHash = await hashPassword(sitePassword);
    const visitorPasswordHash = process.env.VISITOR_PASSWORD
      ? await hashPassword(process.env.VISITOR_PASSWORD)
      : null;

    admin = await prisma.user.create({
      data: { username, isAdmin: true, passwordHash, visitorPasswordHash },
    });
    console.log(`Created admin user ${admin.id} (username: ${username})`);
  } else {
    console.log(`Admin user already exists: ${admin.id} (skipping creation)`);
  }

  const result = await prisma.recording.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  console.log(`Attached ${result.count} existing recording(s) to the admin account.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
