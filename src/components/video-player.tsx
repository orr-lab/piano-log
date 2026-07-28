"use client";

import { useRef, useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Recording } from "@/lib/types";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({ recording }: { recording: Recording }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState("1");

  if (recording.videoSource === "YOUTUBE" && recording.youtubeId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black">
        <iframe
          className="h-full w-full"
          src={youtubeEmbedUrl(recording.youtubeId)}
          title={recording.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border bg-black">
        <video ref={videoRef} src={recording.videoUrl} controls className="max-h-[70vh] w-full" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Playback speed</span>
        <Select
          value={speed}
          onValueChange={(v) => {
            if (!v) return;
            setSpeed(v);
            if (videoRef.current) videoRef.current.playbackRate = Number(v);
          }}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
