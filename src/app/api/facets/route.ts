import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const recordings = await prisma.recording.findMany({
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
