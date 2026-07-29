import Link from "next/link";
import { Star } from "lucide-react";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Recording } from "@/lib/types";

export function RecordingCard({
  recording,
  count = 1,
  href,
  basePath = "",
}: {
  recording: Recording;
  /** Number of takes this card represents. >1 renders a stacked-card look. */
  count?: number;
  /** Override the default /recordings/[id] link, e.g. to the piece progression view. */
  href?: string;
  /** Prefix for the default recording link, e.g. "/visitor" for the public read-only mirror. */
  basePath?: string;
}) {
  const date = new Date(recording.recordedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const isStack = count > 1;

  return (
    <div className="relative">
      {isStack && (
        <>
          <div className="pointer-events-none absolute inset-0 translate-x-2 translate-y-2 rounded-xl border border-border/50 bg-card" />
          <div className="pointer-events-none absolute inset-0 translate-x-1 translate-y-1 rounded-xl border border-border/65 bg-card" />
        </>
      )}
      <Link
        href={href ?? `${basePath}/recordings/${recording.id}`}
        className="group relative block overflow-hidden rounded-xl border border-border/70 bg-card transition-shadow hover:shadow-md"
      >
        <VideoThumbnail recording={recording} />
        {isStack && (
          <Badge className="absolute right-2 top-2 shadow-sm">{count} takes</Badge>
        )}
        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{recording.title}</p>
              <p className="truncate text-sm text-muted-foreground">{recording.composer}</p>
            </div>
            {recording.isFavorite && (
              <Star className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {isStack ? `Latest ${date}` : date}
            </span>
            <span className="text-xs text-muted-foreground">Difficulty {recording.difficulty}/5</span>
          </div>
          {recording.tags.length > 0 && (
            <div className={cn("flex flex-wrap gap-1")}>
              {recording.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {recording.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{recording.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
