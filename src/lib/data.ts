import { prisma } from "@/lib/prisma";
import type { Recording } from "@/lib/types";

export async function getAllRecordings(userId: string): Promise<Recording[]> {
  const rows = await prisma.recording.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" },
  });
  return rows.map((r) => ({
    ...r,
    recordedAt: r.recordedAt.toISOString(),
    aiFeedbackAt: r.aiFeedbackAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
