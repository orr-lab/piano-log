import { prisma } from "@/lib/prisma";
import type { Recording } from "@/lib/types";

export async function getAllRecordings(): Promise<Recording[]> {
  const rows = await prisma.recording.findMany({ orderBy: { recordedAt: "desc" } });
  return rows.map((r) => ({
    ...r,
    recordedAt: r.recordedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
