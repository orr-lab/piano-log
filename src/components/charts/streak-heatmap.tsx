import type { Recording } from "@/lib/types";

const WEEKS = 53;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatUtcDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function intensityClass(count: number): string {
  if (count <= 0) return "bg-muted";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/55";
  if (count === 3) return "bg-primary/75";
  return "bg-primary";
}

export function StreakHeatmap({ recordings }: { recordings: Recording[] }) {
  const countByDay = new Map<string, number>();
  for (const r of recordings) {
    const key = toDayKey(new Date(r.recordedAt));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let cursor = new Date(today.getTime() - (WEEKS * 7 - 1) * MS_PER_DAY);
  cursor = new Date(cursor.getTime() - cursor.getUTCDay() * MS_PER_DAY);

  const weeks: Date[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      days.push(cursor);
      cursor = new Date(cursor.getTime() + MS_PER_DAY);
    }
    weeks.push(days);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((days, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {days.map((day, di) => {
              const key = toDayKey(day);
              const count = countByDay.get(key) ?? 0;
              const inFuture = day > today;
              return (
                <div
                  key={di}
                  title={`${formatUtcDate(day)}: ${count} recording${count === 1 ? "" : "s"}`}
                  className={`size-[11px] rounded-sm ${inFuture ? "bg-transparent" : intensityClass(count)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="size-[11px] rounded-sm bg-muted" />
        <div className="size-[11px] rounded-sm bg-primary/30" />
        <div className="size-[11px] rounded-sm bg-primary/55" />
        <div className="size-[11px] rounded-sm bg-primary/75" />
        <div className="size-[11px] rounded-sm bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
