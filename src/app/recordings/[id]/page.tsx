import Link from "next/link";
import { notFound } from "next/navigation";
import { ListMusic } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Recording } from "@/lib/types";
import { VideoPlayer } from "@/components/video-player";
import { RecordingActions } from "@/components/recording-actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.recording.findUnique({ where: { id } });
  if (!row) notFound();

  const recording: Recording = {
    ...row,
    recordedAt: row.recordedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  const pieceHref = `/piece?title=${encodeURIComponent(recording.title)}&composer=${encodeURIComponent(
    recording.composer
  )}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <VideoPlayer recording={recording} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{recording.composer}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{recording.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(recording.recordedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {recording.tempoBpm ? ` · ${recording.tempoBpm} BPM` : ""}
          </p>
        </div>
        <RecordingActions id={recording.id} isFavorite={recording.isFavorite} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Difficulty {recording.difficulty}/5</Badge>
        {recording.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      {recording.notes && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground">Practice notes</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{recording.notes}</p>
        </div>
      )}

      <Link
        href={pieceHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ListMusic className="size-4" />
        See every take of this piece
      </Link>
    </div>
  );
}
