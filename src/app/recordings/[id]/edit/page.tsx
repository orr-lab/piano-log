import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Recording } from "@/lib/types";
import { RecordingForm } from "@/components/recording-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditRecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await prisma.recording.findUnique({
    where: { id, userId: session.userId },
  });
  if (!row) notFound();

  const recording: Recording = {
    ...row,
    recordedAt: row.recordedAt.toISOString(),
    aiFeedbackAt: row.aiFeedbackAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit take</h1>
        <p className="text-muted-foreground">
          {recording.title} · {recording.composer}
        </p>
      </div>
      <RecordingForm mode="edit" initialData={recording} userId={session.userId} />
    </div>
  );
}
