import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicAdminUserId } from "@/lib/public-scope";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const adminId = await getPublicAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const tag = params.get("tag")?.trim();
  const composer = params.get("composer")?.trim();
  const difficulty = params.get("difficulty");
  const favorite = params.get("favorite");
  const sort = params.get("sort") ?? "date";
  const order = params.get("order") === "asc" ? "asc" : "desc";

  const where: Prisma.RecordingWhereInput = { userId: adminId };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { composer: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tag) where.tags = { has: tag };
  if (composer) where.composer = { equals: composer, mode: "insensitive" };
  if (difficulty) where.difficulty = Number(difficulty);
  if (favorite === "true") where.isFavorite = true;

  const orderBy: Prisma.RecordingOrderByWithRelationInput =
    sort === "difficulty"
      ? { difficulty: order }
      : sort === "piece"
        ? { title: order }
        : { recordedAt: order };

  const recordings = await prisma.recording.findMany({ where, orderBy });
  return NextResponse.json(recordings);
}
