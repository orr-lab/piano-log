import Link from "next/link";
import { Star } from "lucide-react";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { Badge } from "@/components/ui/badge";
import type { Recording } from "@/lib/types";

export function RecordingCard({ recording }: { recording: Recording }) {
  const date = new Date(recording.recordedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/recordings/${recording.id}`}
      className="group block overflow-hidden rounded-xl border border-border/70 bg-card transition-shadow hover:shadow-md"
    >
      <VideoThumbnail recording={recording} />
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
          <span className="text-xs text-muted-foreground">{date}</span>
          <span className="text-xs text-muted-foreground">Difficulty {recording.difficulty}/5</span>
        </div>
        {recording.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
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
  );
}
