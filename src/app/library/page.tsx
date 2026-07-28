"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ListMusic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordingCard } from "@/components/recording-card";
import { EmptyState } from "@/components/empty-state";
import type { Recording } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "date:desc", label: "Newest first" },
  { value: "date:asc", label: "Oldest first" },
  { value: "difficulty:desc", label: "Hardest first" },
  { value: "difficulty:asc", label: "Easiest first" },
  { value: "piece:asc", label: "Piece name (A–Z)" },
];

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [facets, setFacets] = useState<{ composers: string[]; tags: string[] }>({
    composers: [],
    tags: [],
  });
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const tag = searchParams.get("tag") ?? "all";
  const composer = searchParams.get("composer") ?? "all";
  const difficulty = searchParams.get("difficulty") ?? "all";
  const favorite = searchParams.get("favorite") === "true";
  const sort = searchParams.get("sort") ?? "date";
  const order = searchParams.get("order") ?? "desc";
  const sortValue = `${sort}:${order}`;

  useEffect(() => {
    fetch("/api/facets")
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      updateParam("q", search || null);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchParams.get("q")) params.set("q", searchParams.get("q")!);
    if (tag !== "all") params.set("tag", tag);
    if (composer !== "all") params.set("composer", composer);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (favorite) params.set("favorite", "true");
    params.set("sort", sort);
    params.set("order", order);

    setRecordings(null);
    fetch(`/api/recordings?${params.toString()}`)
      .then((r) => r.json())
      .then(setRecordings)
      .catch(() => setRecordings([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("q"), tag, composer, difficulty, favorite, sort, order]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all" || value === "") params.delete(key);
    else params.set(key, value);
    router.replace(`/library?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="text-muted-foreground">Every take you&apos;ve logged, in one place.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or composer…"
            className="pl-8"
          />
        </div>

        <Select value={composer} onValueChange={(v) => updateParam("composer", v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Composer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All composers</SelectItem>
            {facets.composers.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tag} onValueChange={(v) => updateParam("tag", v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {facets.tags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={difficulty} onValueChange={(v) => updateParam("difficulty", v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any difficulty</SelectItem>
            {[1, 2, 3, 4, 5].map((d) => (
              <SelectItem key={d} value={String(d)}>
                Difficulty {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortValue}
          onValueChange={(v) => {
            if (!v) return;
            const [s, o] = v.split(":");
            const params = new URLSearchParams(searchParams.toString());
            params.set("sort", s);
            params.set("order", o);
            router.replace(`/library?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Switch id="favorite" checked={favorite} onCheckedChange={(v) => updateParam("favorite", v ? "true" : null)} />
          <Label htmlFor="favorite" className="text-sm font-normal">
            Favorites only
          </Label>
        </div>
      </div>

      {recordings === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
          ))}
        </div>
      ) : recordings.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No recordings match these filters"
          description="Try clearing a filter, or log a new take to grow your library."
          actionHref="/new"
          actionLabel="Log a new take"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recordings.map((r) => (
            <RecordingCard key={r.id} recording={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}
