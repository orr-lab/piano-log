"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { UploadCloud, Link2, Film, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { TagInput } from "@/components/tag-input";
import { DifficultyPicker } from "@/components/difficulty-picker";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";
import { MAX_UPLOAD_BYTES } from "@/lib/validation";
import type { Recording, VideoSource } from "@/lib/types";

function toDateInputValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RecordingForm({
  mode,
  initialData,
  userId,
  uploadsEnabled,
}: {
  mode: "create" | "edit";
  initialData?: Recording;
  userId: string;
  uploadsEnabled: boolean;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [composer, setComposer] = useState(initialData?.composer ?? "");
  const [recordedAt, setRecordedAt] = useState(toDateInputValue(initialData?.recordedAt));
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? 3);
  const [tempoBpm, setTempoBpm] = useState(initialData?.tempoBpm?.toString() ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [isFavorite, setIsFavorite] = useState(initialData?.isFavorite ?? false);

  const [videoSource, setVideoSource] = useState<VideoSource>(
    initialData?.videoSource ?? (uploadsEnabled ? "UPLOAD" : "YOUTUBE")
  );
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl ?? "");
  const [youtubeId, setYoutubeId] = useState<string | null>(initialData?.youtubeId ?? null);
  const [youtubeInput, setYoutubeInput] = useState(
    initialData?.videoSource === "YOUTUBE" ? initialData.videoUrl : ""
  );
  const [durationSec, setDurationSec] = useState<number | null>(initialData?.durationSec ?? null);
  const [durationDetected, setDurationDetected] = useState(false);
  const [replacingVideo, setReplacingVideo] = useState(mode === "create");

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  const [facets, setFacets] = useState<{ titles: string[]; composers: string[]; tags: string[] }>({
    titles: [],
    composers: [],
    tags: [],
  });
  const titleListId = useId();
  const composerListId = useId();

  useEffect(() => {
    fetch("/api/facets")
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setVideoError("Please choose a video file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setVideoError(
        "That file is over 100MB. Try compressing it, or paste a YouTube link instead to stay within free storage limits."
      );
      return;
    }

    setVideoError(null);
    setVideoUrl("");
    setDurationDetected(false);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);

    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await upload(`${userId}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      });
      setVideoUrl(result.url);
      toast.success("Video uploaded");
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [userId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [] },
    multiple: false,
    disabled: uploading,
  });

  function handleVideoMetadataLoaded() {
    const video = hiddenVideoRef.current;
    if (video && Number.isFinite(video.duration)) {
      setDurationSec(Math.round(video.duration));
      setDurationDetected(true);
    }
  }

  function handleYoutubeInputChange(value: string) {
    setYoutubeInput(value);
    const id = extractYouTubeId(value);
    if (id) {
      setYoutubeId(id);
      setVideoUrl(value.trim());
      setVideoError(null);
    } else {
      setYoutubeId(null);
      setVideoUrl("");
      if (value.trim()) setVideoError("Doesn't look like a valid YouTube link.");
      else setVideoError(null);
    }
  }

  function clearVideo() {
    setVideoUrl("");
    setYoutubeId(null);
    setYoutubeInput("");
    setFilePreview(null);
    setDurationSec(null);
    setDurationDetected(false);
    setVideoError(null);
  }

  const minutes = durationSec != null ? Math.floor(durationSec / 60) : "";
  const seconds = durationSec != null ? durationSec % 60 : "";

  function updateDuration(min: string, sec: string) {
    const m = Number(min) || 0;
    const s = Number(sec) || 0;
    if (!min && !sec) {
      setDurationSec(null);
      return;
    }
    setDurationSec(m * 60 + s);
    setDurationDetected(false);
  }

  const canSubmit = useMemo(() => {
    return Boolean(title.trim() && composer.trim() && recordedAt && (!replacingVideo || videoUrl));
  }, [title, composer, recordedAt, replacingVideo, videoUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !composer.trim()) {
      toast.error("Give the piece a title and composer first.");
      return;
    }
    if (replacingVideo && !videoUrl) {
      toast.error("Add a video — upload a file or paste a YouTube link — before saving.");
      return;
    }

    setSubmitting(true);
    const payload = {
      title: title.trim(),
      composer: composer.trim(),
      recordedAt: new Date(recordedAt).toISOString(),
      videoSource,
      videoUrl: replacingVideo ? videoUrl : initialData!.videoUrl,
      youtubeId: replacingVideo ? (videoSource === "YOUTUBE" ? youtubeId : null) : initialData!.youtubeId,
      durationSec: replacingVideo ? durationSec : initialData!.durationSec,
      tags,
      difficulty,
      tempoBpm: tempoBpm ? Number(tempoBpm) : null,
      notes: notes.trim() || null,
      isFavorite,
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/recordings" : `/api/recordings/${initialData!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        throw new Error("Could not save this recording. Please try again.");
      }

      const saved = await res.json();
      toast.success(mode === "create" ? "Take logged!" : "Changes saved");
      router.push(`/recordings/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Video</h2>

        {!replacingVideo && initialData && (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Film className="size-4" />
                Keeping the current video for this take.
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setReplacingVideo(true);
                  if (!uploadsEnabled) setVideoSource("YOUTUBE");
                }}
              >
                Replace video
              </Button>
            </CardContent>
          </Card>
        )}

        {replacingVideo && (
          <div className="space-y-3">
            {uploadsEnabled ? (
              <Tabs
                value={videoSource}
                onValueChange={(v) => {
                  setVideoSource(v as VideoSource);
                  clearVideo();
                }}
              >
                <TabsList>
                  <TabsTrigger value="UPLOAD">
                    <UploadCloud className="size-4" /> Upload a file
                  </TabsTrigger>
                  <TabsTrigger value="YOUTUBE">
                    <Link2 className="size-4" /> Paste YouTube link
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <p className="text-xs text-muted-foreground">
                Direct video uploads are currently turned off — paste a YouTube link instead.
              </p>
            )}

            {uploadsEnabled && videoSource === "UPLOAD" && (
              <div className="space-y-3">
                {!filePreview ? (
                  <div
                    {...getRootProps()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud className="size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drag & drop your video, or click to browse</p>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV, or WebM up to 100MB. For longer recitals, paste a YouTube link instead.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative overflow-hidden rounded-xl border bg-black">
                      <video
                        ref={hiddenVideoRef}
                        src={filePreview}
                        controls
                        onLoadedMetadata={handleVideoMetadataLoaded}
                        className="max-h-80 w-full"
                      />
                    </div>
                    {uploading && (
                      <div className="space-y-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Uploading… {Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                    {!uploading && videoUrl && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Uploaded ✓</p>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={clearVideo}>
                      <X className="size-3.5" /> Choose a different file
                    </Button>
                  </div>
                )}
              </div>
            )}

            {videoSource === "YOUTUBE" && (
              <div className="space-y-3">
                <Input
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={youtubeInput}
                  onChange={(e) => handleYoutubeInputChange(e.target.value)}
                />
                {youtubeId && (
                  <div className="aspect-video overflow-hidden rounded-xl border">
                    <iframe
                      className="h-full w-full"
                      src={youtubeEmbedUrl(youtubeId)}
                      title="YouTube preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {videoError && <p className="text-sm text-destructive">{videoError}</p>}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Piece title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Clair de Lune"
            required
            list={facets.titles.length ? titleListId : undefined}
          />
          {facets.titles.length > 0 && (
            <datalist id={titleListId}>
              {facets.titles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="composer">Composer</Label>
          <Input
            id="composer"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Debussy"
            required
            list={facets.composers.length ? composerListId : undefined}
          />
          {facets.composers.length > 0 && (
            <datalist id={composerListId}>
              {facets.composers.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recordedAt">Date recorded</Label>
          <Input
            id="recordedAt"
            type="date"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tempo">Tempo (BPM, optional)</Label>
          <Input
            id="tempo"
            type="number"
            min={1}
            value={tempoBpm}
            onChange={(e) => setTempoBpm(e.target.value)}
            placeholder="e.g. 92"
          />
        </div>
      </section>

      <section className="space-y-2">
        <Label>Duration</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            className="w-20"
            placeholder="min"
            value={minutes}
            onChange={(e) => updateDuration(e.target.value, String(seconds))}
          />
          <span className="text-muted-foreground">min</span>
          <Input
            type="number"
            min={0}
            max={59}
            className="w-20"
            placeholder="sec"
            value={seconds}
            onChange={(e) => updateDuration(String(minutes), e.target.value)}
          />
          <span className="text-muted-foreground">sec</span>
          {durationDetected && durationSec != null && (
            <span className="text-xs text-muted-foreground">
              (auto-detected — {formatDuration(durationSec)})
            </span>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <Label>Difficulty (self-rated)</Label>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </section>

      <section className="space-y-2">
        <Label>Tags</Label>
        <TagInput
          value={tags}
          onChange={setTags}
          placeholder="Chopin, sight-reading, recital piece…"
          suggestions={facets.tags}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="notes">Practice notes</Label>
        <Textarea
          id="notes"
          rows={5}
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What went well? What needs work next time?"
        />
      </section>

      <section className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="favorite">Milestone / favorite take</Label>
          <p className="text-sm text-muted-foreground">Mark this as a take worth revisiting.</p>
        </div>
        <Switch id="favorite" checked={isFavorite} onCheckedChange={setIsFavorite} />
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit || submitting || uploading}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Save recording" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
