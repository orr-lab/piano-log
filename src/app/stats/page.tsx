import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";
import { getAllRecordings } from "@/lib/data";
import { EmptyState } from "@/components/empty-state";
import { TrendBarChart } from "@/components/charts/trend-bar-chart";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { StreakHeatmap } from "@/components/charts/streak-heatmap";
import {
  difficultyTrendByMonth,
  practiceMinutesPerMonth,
  recordingsPerMonth,
  topByFrequency,
} from "@/lib/stats";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const recordings = await getAllRecordings(session.userId);
  const isOwner = session.role === "owner";

  if (recordings.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={BarChart3}
          title="No stats yet"
          description={
            isOwner
              ? "Log a few takes and your progress charts will show up here."
              : "There's nothing logged yet, so there's nothing to chart."
          }
          actionHref={isOwner ? "/new" : undefined}
          actionLabel={isOwner ? "Log your first recording" : undefined}
        />
      </div>
    );
  }

  const monthlyRecordings = recordingsPerMonth(recordings).map((b) => ({
    label: b.label,
    value: b.count,
  }));
  const monthlyMinutes = practiceMinutesPerMonth(recordings).map((b) => ({
    label: b.label,
    value: b.count,
  }));
  const difficultyTrend = difficultyTrendByMonth(recordings).map((b) => ({
    label: b.label,
    value: b.value,
  }));
  const composerBreakdown = topByFrequency(recordings.map((r) => r.composer));
  const tagBreakdown = topByFrequency(recordings.flatMap((r) => r.tags));

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">The long view of your practice.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Practice streak</h2>
        <div className="overflow-x-auto rounded-xl border p-4">
          <StreakHeatmap recordings={recordings} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recordings over time</h2>
          <div className="rounded-xl border p-4">
            <TrendBarChart data={monthlyRecordings} valueLabel="recordings" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Practice time over time</h2>
          <div className="rounded-xl border p-4">
            <TrendBarChart data={monthlyMinutes} valueLabel="minutes" />
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Difficulty trend</h2>
        <p className="text-sm text-muted-foreground">
          Average self-rated difficulty of takes logged each month.
        </p>
        <div className="rounded-xl border p-4">
          <TrendLineChart data={difficultyTrend} valueLabel="avg. difficulty" domain={[1, 5]} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Most-played composers</h2>
          <div className="rounded-xl border p-4">
            <RankedBarChart data={composerBreakdown} valueLabel="takes" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top tags</h2>
          <div className="rounded-xl border p-4">
            {tagBreakdown.length > 0 ? (
              <RankedBarChart data={tagBreakdown} valueLabel="takes" />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Add tags to your recordings to see a breakdown here.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
