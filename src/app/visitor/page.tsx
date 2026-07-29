import Link from "next/link";
import { notFound } from "next/navigation";
import { Piano, ListMusic, Clock, Flame } from "lucide-react";
import { getAllRecordings } from "@/lib/data";
import { StatTile } from "@/components/stat-tile";
import { RecordingCard } from "@/components/recording-card";
import { EmptyState } from "@/components/empty-state";
import { TrendBarChart } from "@/components/charts/trend-bar-chart";
import { getPublicAdminUserId } from "@/lib/public-scope";
import {
  currentStreak,
  formatHoursMinutes,
  recordingsPerMonth,
  totalPracticeSeconds,
  uniquePieceCount,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function PublicDashboardPage() {
  const adminId = await getPublicAdminUserId();
  if (!adminId) notFound();

  const recordings = await getAllRecordings(adminId);

  if (recordings.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={Piano}
          title="No recordings yet"
          description="This practice log doesn't have any recordings logged yet."
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
          <h1 className="text-2xl font-semibold tracking-tight">Practice log</h1>
          <p className="text-muted-foreground">Here&apos;s how practice has been going.</p>
        </div>
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
          <Link href="/visitor/library" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recent.map((r) => (
            <RecordingCard key={r.id} recording={r} basePath="/visitor" />
          ))}
        </div>
      </section>
    </div>
  );
}
