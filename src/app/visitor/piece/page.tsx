import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Recording } from "@/lib/types";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { Badge } from "@/components/ui/badge";
import { getPublicAdminUserId } from "@/lib/public-scope";

export const dynamic = "force-dynamic";

export default async function PublicPiecePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; composer?: string }>;
}) {
  const adminId = await getPublicAdminUserId();
  if (!adminId) notFound();

  const { title, composer } = await searchParams;
  if (!title || !composer) notFound();

  const rows = await prisma.recording.findMany({
    where: {
      userId: adminId,
      title: { equals: title, mode: "insensitive" },
      composer: { equals: composer, mode: "insensitive" },
    },
    orderBy: { recordedAt: "asc" },
  });

  if (rows.length === 0) notFound();

  const recordings: Recording[] = rows.map((r) => ({
    ...r,
    recordedAt: r.recordedAt.toISOString(),
    aiFeedbackAt: r.aiFeedbackAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  const oldest = recordings[0];
  const newest = recordings[recordings.length - 1];
  const allTags = Array.from(new Set(recordings.flatMap((r) => r.tags)));

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">{composer}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {recordings.length} take{recordings.length === 1 ? "" : "s"}
          </Badge>
          {allTags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {recordings.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">First take vs. latest take</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[oldest, newest].map((r, i) => (
              <Link
                key={r.id}
                href={`/visitor/recordings/${r.id}`}
                className="block rounded-xl border p-3 transition-shadow hover:shadow-md"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {i === 0 ? "First take" : "Latest take"} ·{" "}
                  {new Date(r.recordedAt).toLocaleDateString()}
                </p>
                <VideoThumbnail recording={r} />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Difficulty {r.difficulty}/10</span>
                  {r.isFavorite && <span className="text-primary">★ favorite</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <ol className="space-y-4 border-l border-border pl-6">
          {recordings.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-background bg-primary" />
              <Link
                href={`/visitor/recordings/${r.id}`}
                className="group -m-2 flex flex-col gap-3 rounded-lg p-2 hover:bg-muted sm:flex-row sm:items-center"
              >
                <div className="w-full shrink-0 sm:w-40">
                  <VideoThumbnail recording={r} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {new Date(r.recordedAt).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Difficulty {r.difficulty}/10{r.tempoBpm ? ` · ${r.tempoBpm} BPM` : ""}
                  </p>
                  {r.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
