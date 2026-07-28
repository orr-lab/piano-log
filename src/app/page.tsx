import Link from "next/link";
import { Piano, ListMusic, Clock, Flame, Plus } from "lucide-react";
import { getAllRecordings } from "@/lib/data";
import { StatTile } from "@/components/stat-tile";
import { RecordingCard } from "@/components/recording-card";
import { EmptyState } from "@/components/empty-state";
import { TrendBarChart } from "@/components/charts/trend-bar-chart";
import { buttonVariants } from "@/components/ui/button";
import {
  currentStreak,
  formatHoursMinutes,
  recordingsPerMonth,
  totalPracticeSeconds,
  uniquePieceCount,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const recordings = await getAllRecordings();

  if (recordings.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={Piano}
          title="Record your first take!"
          description="Upload a video or paste a YouTube link of yourself playing, and start tracking your progress over time."
          actionHref="/new"
          actionLabel="Log your first recording"
        />
      </div>
    );
  }

  const recent = recordings.slice(0, 8);
  const monthly = recordingsPerMonth(recordings).map((b) => ({ label: b.label, value: b.count }));
  const streak = currentStreak(recordings);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Here&apos;s how your practice has been going.</p>
        </div>
        <Link href="/new" className={buttonVariants()}>
          <Plus className="size-4" /> New take
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={ListMusic} label="Total recordings" value={recordings.length} />
        <StatTile icon={Piano} label="Pieces worked on" value={uniquePieceCount(recordings)} />
        <StatTile
          icon={Clock}
          label="Practice time logged"
          value={formatHoursMinutes(totalPracticeSeconds(recordings))}
        />
        <StatTile icon={Flame} label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recordings per month</h2>
        <div className="rounded-xl border p-4">
          <TrendBarChart data={monthly} valueLabel="recordings" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent takes</h2>
          <Link href="/library" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recent.map((r) => (
            <RecordingCard key={r.id} recording={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
