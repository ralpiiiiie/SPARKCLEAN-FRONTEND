import { format, parseISO } from "date-fns";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { PeriodFilter } from "../components/ui/PeriodFilter";
import { DescriptivePanel } from "../components/analytics/DescriptivePanel";
import { DemandManager } from "../components/analytics/DemandManager";
import { NotesPanel } from "../components/analytics/NotesPanel";
import { SavedViewsMenu } from "../components/analytics/SavedViewsMenu";
import {
  AnalyticsError,
  AnalyticsSkeleton,
} from "../components/analytics/AnalyticsState";
import { useBusinessData } from "../hooks/useBusinessData";
import { usePeriod } from "../hooks/usePeriod";
import type { BusinessData } from "../lib/business";
import type { PeriodSelection } from "../lib/periods";

export function DescriptiveAnalytics() {
  const { status, data, reload } = useBusinessData();

  if (status === "error") return <AnalyticsError onRetry={reload} />;
  if (status === "loading" || !data) return <AnalyticsSkeleton />;

  return <DescriptiveContent data={data} />;
}

function DescriptiveContent({ data }: { data: BusinessData }) {
  const period = usePeriod(data.orders, "monthly");

  function applySavedView(filters: Record<string, unknown>) {
    const next = filters as Partial<PeriodSelection>;
    if (!next.preset) return;
    period.setSelection({
      preset: next.preset,
      anchor: next.anchor ?? period.selection.anchor,
      customStart: next.customStart ?? period.selection.customStart,
      customEnd: next.customEnd ?? period.selection.customEnd,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stage 1 · What happened?"
        title="Descriptive Analytics"
        description="A factual read of the recorded business: order volume, revenue, completion status, service popularity and repeat customers."
        actions={
          <Badge variant="info" dot>
            {data.orders.length.toLocaleString()} orders ·{" "}
            {data.customers.length.toLocaleString()} customers
          </Badge>
        }
      />
      <SavedViewsMenu
        page="descriptive"
        currentFilters={{
          preset: period.selection.preset,
          anchor: period.selection.anchor,
          customStart: period.selection.customStart,
          customEnd: period.selection.customEnd,
        }}
        onApply={applySavedView}
      />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] dark:border-border-dark dark:bg-card-dark lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="section-eyebrow">Performance overview</p>
          <h2
            id="overview-heading"
            className="font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            {period.resolved.label}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {period.resolved.descriptor} · latest recorded data ends{" "}
            {format(parseISO(period.bounds.max), "MMM d, yyyy")}
          </p>
        </div>
        <PeriodFilter view={period} onChange={period.setSelection} />
      </div>
      <DescriptivePanel data={data} period={period} />
      <DemandManager branches={data.branches} />
      <NotesPanel pageName="descriptive" branches={data.branches} />
    </div>
  );
}
