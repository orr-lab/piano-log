"use client";

import { useEffect, useMemo, useState } from "react";
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
import { pieceKey, type Recording } from "@/lib/types";
import type { Role } from "@/lib/auth";

function groupByPieceForDisplay(recordings: Recording[]) {
  const groups = new Map<string, { representative: Recording; count: number }>();
  for (const r of recordings) {
    const key = pieceKey(r);
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { representative: r, count: 1 });
  }
  return Array.from(groups.values());
}

const SORT_OPTIONS = [
  { value: "date:desc", label: "Newest first" },
  { value: "date:asc", label: "Oldest first" },
  { value: "difficulty:desc", label: "Hardest first" },
  { value: "difficulty:asc", label: "Easiest first" },
  { value: "piece:asc", label: "Piece name (A–Z)" },
];

export default function LibraryPage() {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [facets, setFacets] = useState<{ composers: string[]; tags: string[] }>({
    composers: [],
    tags: [],
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tag, setTag] = useState("all");
  const [composer, setComposer] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [favorite, setFavorite] = useState(false);
  const [sortValue, setSortValue] = useState("date:desc");
  const [sort, order] = sortValue.split(":");
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    fetch("/api/facets")
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => {});
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => setRole(data.role))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (tag !== "all") params.set("tag", tag);
    if (composer !== "all") params.set("composer", composer);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (favorite) params.set("favorite", "true");
    params.set("sort", sort);
    params.set("order", order);

    let cancelled = false;
    setRecordings(null);
    fetch(`/api/recordings?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRecordings(data);
      })
      .catch(() => {
        if (!cancelled) setRecordings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, tag, composer, difficulty, favorite, sort, order]);

  const groups = useMemo(() => (recordings ? groupByPieceForDisplay(recordings) : []), [recordings]);

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

        <Select value={composer} onValueChange={(v) => v && setComposer(v)}>
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

        <Select value={tag} onValueChange={(v) => v && setTag(v)}>
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

        <Select value={difficulty} onValueChange={(v) => v && setDifficulty(v)}>
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

        <Select value={sortValue} onValueChange={(v) => v && setSortValue(v)}>
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
          <Switch id="favorite" checked={favorite} onCheckedChange={setFavorite} />
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
          description={
            role === "owner"
              ? "Try clearing a filter, or log a new take to grow your library."
              : "Try clearing a filter to see more."
          }
          actionHref={role === "owner" ? "/new" : undefined}
          actionLabel={role === "owner" ? "Log a new take" : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {groups.map(({ representative, count }) => (
            <RecordingCard
              key={representative.id}
              recording={representative}
              count={count}
              href={
                count > 1
                  ? `/piece?title=${encodeURIComponent(representative.title)}&composer=${encodeURIComponent(representative.composer)}`
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
