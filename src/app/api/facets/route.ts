import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recordings = await prisma.recording.findMany({
    where: { userId: session.userId },
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
