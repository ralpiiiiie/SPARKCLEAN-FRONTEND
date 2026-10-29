import { Card } from "./Card";
import { Badge } from "./Badge";
import type { Recommendation } from "../../lib/analytics/recommendations";
import { cn } from "../../lib/utils";

const PRIORITY: Record<
  Recommendation["priority"],
  { variant: "danger" | "warning" | "secondary"; accent: string; pill: string }
> = {
  High: { variant: "danger", accent: "#ef4444", pill: "text-coral-hover" },
  Medium: { variant: "warning", accent: "#f59e0b", pill: "text-warning-hover" },
  Low: { variant: "secondary", accent: "#07519b", pill: "text-primary" },
};

export function RecommendationCard({
  recommendation,
  rank,
  className,
}: {
  recommendation: Recommendation;
  rank?: number;
  className?: string;
}) {
  const meta = PRIORITY[recommendation.priority];

  return (
    <Card hover className={cn("relative overflow-hidden", className)}>
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: meta.accent }}
        aria-hidden
      />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {rank !== undefined && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {rank}
              </span>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {recommendation.category}
            </span>
          </div>
          <Badge variant={meta.variant} dot>
            {recommendation.priority} priority
          </Badge>
        </div>

        <h4 className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-white">
          {recommendation.action}
        </h4>

        <div className="mt-3 space-y-2 text-sm leading-relaxed">
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Why ·{" "}
            </span>
            {recommendation.reason}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Expected benefit ·{" "}
            </span>
            {recommendation.benefit}
          </p>
        </div>
      </div>
    </Card>
  );
}
