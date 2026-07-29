import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicAdminUserId } from "@/lib/public-scope";

export async function GET() {
  const adminId = await getPublicAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recordings = await prisma.recording.findMany({
    where: { userId: adminId },
    select: { composer: true, tags: true },
  });

  const composers = Array.from(new Set(recordings.map((r) => r.composer))).sort((a, b) =>
    a.localeCompare(b)
  );
  const tags = Array.from(new Set(recordings.flatMap((r) => r.tags))).sort((a, b) =>
    a.localeCompare(b)
  );

  return NextResponse.json({ composers, tags });
}
