import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { KpiCard } from "../components/ui/KpiCard";
import { PeriodFilter } from "../components/ui/PeriodFilter";
import { StageSection } from "../components/analytics/StageSection";
import { DescriptivePanel } from "../components/analytics/DescriptivePanel";
import { PredictivePanel } from "../components/analytics/PredictivePanel";
import { PrescriptivePanel } from "../components/analytics/PrescriptivePanel";
import { RecentOrders } from "../components/analytics/RecentOrders";
import {
  ActivityComboChart,
  EmptyChart,
  OrderStatusDonut,
} from "../components/analytics/ActivityCharts";
import {
  AnalyticsError,
  AnalyticsSkeleton,
} from "../components/analytics/AnalyticsState";
import { ChartCard } from "../components/charts/ChartCard";
import { CHART } from "../components/charts/palette";
import { useBusinessData } from "../hooks/useBusinessData";
import { usePeriod } from "../hooks/usePeriod";
import type { BusinessData } from "../lib/business";
import { peso, statusBreakdown } from "../lib/metrics";

const STAGES = [
  {
    id: "descriptive",
    stage: "Stage 1 · Descriptive",
    question: "What happened?",
    description:
      "Order volume, revenue, service mix and customer activity from the recorded history.",
    accent: CHART.aqua,
    icon: BarChart3,
    to: "/descriptive",
    anchor: "Descriptive",
  },
  {
    id: "predictive",
    stage: "Stage 2 · Predictive",
    question: "What will happen?",
    description:
      "Projected orders, revenue and branch workload, clearly labelled as estimates.",
    accent: CHART.amber,
    icon: TrendingUp,
    to: "/predictive",
    anchor: "Predictive",
  },
  {
    id: "prescriptive",
    stage: "Stage 3 · Prescriptive",
    question: "What should we do?",
    description:
      "Ranked actions with the evidence behind them and the benefit each one protects.",
    accent: CHART.purple,
    icon: Boxes,
    to: "/prescriptive",
    anchor: "Prescriptive",
  },
];

function trendFor(change: number): "up" | "down" | "neutral" {
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "neutral";
}

function pctVs(current: number, previous: number | undefined): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export function Dashboard() {
  const { status, data, reload } = useBusinessData();

  if (status === "error") return <AnalyticsError onRetry={reload} />;
  if (status === "loading" || !data) return <AnalyticsSkeleton />;

  return <DashboardContent data={data} />;
}

function DashboardContent({ data }: { data: BusinessData }) {
  const period = usePeriod(data.orders, "monthly");
  const view = period;

  const statuses = useMemo(() => statusBreakdown(view.orders), [view.orders]);
  const weekly = view.resolved.granularity === "week";
  const inFlight = view.kpis.pending + view.kpis.inProgress;

  const dailyStatus = useMemo(() => {
    const completed = new Map<string, number>();
    const inFlightByDay = new Map<string, number>();
    for (const order of view.orders) {
      const key = order.orderDate.slice(0, 10);
      if (order.status === "Delivered") {
        completed.set(key, (completed.get(key) ?? 0) + 1);
      } else if (order.status !== "Cancelled") {
        inFlightByDay.set(key, (inFlightByDay.get(key) ?? 0) + 1);
      }
    }
    return {
      completed: view.daily.map((point) => completed.get(point.key) ?? 0),
      inFlight: view.daily.map((point) => inFlightByDay.get(point.key) ?? 0),
    };
  }, [view.orders, view.daily]);

  const completedChange = pctVs(view.kpis.completed, view.previous?.kpis.completed);
  const inFlightChange = pctVs(
    inFlight,
    view.previous ? view.previous.kpis.pending + view.previous.kpis.inProgress : undefined,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Spark Clean Laundry · Metro Cebu"
        title="Business Analytics Dashboard"
        description="A single workspace for the three analytics stages: what happened, what will happen, and what to do next — all built from the recorded business data."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-border-dark dark:bg-card-dark dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {data.orders.length.toLocaleString()} orders ·{" "}
            {data.customers.length.toLocaleString()} customers
          </div>
        }
      />

      <section aria-labelledby="overview-heading" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] dark:border-border-dark dark:bg-card-dark lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="section-eyebrow">Performance overview</p>
            <h2
              id="overview-heading"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              {view.resolved.label}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {view.resolved.descriptor} · latest recorded data ends{" "}
              {format(parseISO(view.bounds.max), "MMM d, yyyy")}
            </p>
          </div>
          <PeriodFilter view={period} onChange={period.setSelection} compact />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Total Orders"
            value={view.kpis.orders}
            change={view.changes.orders ?? undefined}
            trend={
              view.changes.orders !== null ? trendFor(view.changes.orders) : "neutral"
            }
            icon={ShoppingBag}
            sparklineData={view.daily.map((point) => point.orders)}
            sparklineColor={CHART.teal}
            caption="Billed orders in period"
          />
          <KpiCard
            title="Total Revenue"
            value={view.kpis.revenue}
            format={(value) => peso(value, true)}
            change={view.changes.revenue ?? undefined}
            trend={
              view.changes.revenue !== null ? trendFor(view.changes.revenue) : "neutral"
            }
            icon={DollarSign}
            sparklineData={view.daily.map((point) => point.revenue)}
            sparklineColor={CHART.primary}
            caption="Cancelled orders excluded"
          />
          <KpiCard
            title="Completed"
            value={view.kpis.completed}
            change={completedChange}
            trend={completedChange !== undefined ? trendFor(completedChange) : "neutral"}
            icon={CheckCircle2}
            sparklineData={dailyStatus.completed}
            sparklineColor={CHART.green}
            caption={`${view.kpis.completionRate.toFixed(0)}% completion rate`}
          />
          <KpiCard
            title="Pending / In progress"
            value={inFlight}
            change={inFlightChange}
            trend={inFlightChange !== undefined ? trendFor(inFlightChange) : "neutral"}
            icon={Clock}
            sparklineData={dailyStatus.inFlight}
            sparklineColor={CHART.amber}
            caption={`${view.kpis.pending} pending · ${view.kpis.inProgress} in progress`}
          />
          <KpiCard
            title="Total Customers"
            value={data.customers.length}
            icon={Users}
            sparklineColor={CHART.blue}
            caption={`${view.kpis.activeCustomers.toLocaleString()} active in this period`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Order & Revenue Activity"
            subtitle={`${view.resolved.label} · ${weekly ? "weekly" : "daily"} orders and billed revenue`}
            className="lg:col-span-2"
            hover
          >
            {view.kpis.orders === 0 && view.kpis.cancelled === 0 ? (
              <EmptyChart message="No orders were recorded in this period." />
            ) : (
              <ActivityComboChart points={view.buckets} weekly={weekly} />
            )}
          </ChartCard>

          <ChartCard
            title="Order Status"
            subtitle={`Recorded orders · ${view.resolved.label}`}
            hover
          >
            {statuses.total === 0 ? (
              <EmptyChart message="No orders were recorded in this period." />
            ) : (
              <OrderStatusDonut statuses={statuses} />
            )}
          </ChartCard>
        </div>

        <RecentOrders
          orders={view.orders}
          customers={data.customers}
          services={data.services}
          rangeLabel={view.resolved.label}
        />
      </section>

      <nav aria-label="Analytics sections" className="grid gap-3 sm:grid-cols-3">
        {STAGES.map((stage) => (
          <a
            key={stage.id}
            href={`#${stage.id}`}
            className="focus-ring group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:shadow-[var(--shadow-card-hover)] dark:border-border-dark dark:bg-card-dark"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${stage.accent}1a`, color: stage.accent }}
            >
              <stage.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {stage.anchor}
              </span>
              <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-primary dark:text-slate-200">
                {stage.question}
              </span>
            </span>
          </a>
        ))}
      </nav>

      <StageSection {...STAGES[0]}>
        <DescriptivePanel data={data} compact period={period} />
      </StageSection>

      <StageSection {...STAGES[1]}>
        <PredictivePanel data={data} compact />
      </StageSection>

      <StageSection {...STAGES[2]}>
        <PrescriptivePanel data={data} compact />
      </StageSection>
    </div>
  );
}
