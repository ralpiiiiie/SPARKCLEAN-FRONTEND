import { useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  ReceiptText,
  ShoppingBag,
  Timer,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";
import type { BusinessData } from "../../lib/business";
import {
  bestPeriod,
  continuousMonthlySeries,
  peso,
  repeatCustomerStats,
  statusBreakdown,
  topServices,
} from "../../lib/metrics";
import type { SeriesPoint } from "../../lib/periods";
import { usePeriod, type PeriodController } from "../../hooks/usePeriod";
import { KpiCard } from "../ui/KpiCard";
import { StatCard } from "../ui/StatCard";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { PeriodFilter } from "../ui/PeriodFilter";
import { ChartCard } from "../charts/ChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { InsightList, type Insight } from "../ui/InsightList";
import { ActivityComboChart, EmptyChart, OrderStatusDonut } from "./ActivityCharts";
import {
  CHART,
  AXIS,
  CHART_ANIM,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../charts/palette";

function trendFor(change: number): "up" | "down" | "neutral" {
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "neutral";
}

const compactPeso = (value: number) => peso(value, true);

export function DescriptivePanel({
  data,
  compact = false,
  period,
}: {
  data: BusinessData;
  compact?: boolean;
  period?: PeriodController;
}) {
  const internal = usePeriod(data.orders, "monthly");
  const view = period ?? internal;
  const reduced = useReducedMotion();
  const animate = !reduced;

  const statuses = useMemo(() => statusBreakdown(view.orders), [view.orders]);
  const repeat = useMemo(() => repeatCustomerStats(view.orders), [view.orders]);
  const services = useMemo(
    () => topServices(view.orders, data.services, 6),
    [view.orders, data.services],
  );
  const allMonths = useMemo(() => continuousMonthlySeries(data.orders), [data.orders]);
  const periods = useMemo(() => bestPeriod(allMonths), [allMonths]);

  const isMonthly = view.preset === "monthly";
  const weekly = view.resolved.granularity === "week";
  const points = view.buckets;
  const rangeCaption = view.resolved.label;

  const sparkAov = useMemo(
    () =>
      view.daily.map((point) =>
        point.orders ? Math.round(point.revenue / point.orders) : 0,
      ),
    [view.daily],
  );

  const insights = useMemo<Insight[]>(() => {
    if (view.orders.length === 0) return [];
    const items: Insight[] = [];
    const comparisonWord = isMonthly ? "month" : "period";

    if (view.changes.orders !== null && Math.abs(view.changes.orders) >= 3) {
      items.push({
        text: `Order volume ${view.changes.orders > 0 ? "increased" : "decreased"} ${Math.abs(view.changes.orders).toFixed(0)}% compared with the previous ${comparisonWord}.`,
        tone: view.changes.orders > 0 ? "positive" : "negative",
      });
    }
    if (view.changes.revenue !== null && Math.abs(view.changes.revenue) >= 3) {
      items.push({
        text: `Revenue ${view.changes.revenue > 0 ? "rose" : "fell"} ${Math.abs(view.changes.revenue).toFixed(0)}% compared with the previous ${comparisonWord}.`,
        tone: view.changes.revenue > 0 ? "positive" : "negative",
      });
    }
    if (services[0]) {
      items.push({
        text: (
          <>
            <strong>{services[0].name}</strong> was the most requested service, with{" "}
            {services[0].orders.toLocaleString()} orders (
            {services[0].sharePct.toFixed(0)}% of billable orders).
          </>
        ),
        tone: "info",
      });
    }

    const busiest = view.buckets.reduce<SeriesPoint | null>(
      (best, point) => (!best || point.orders > best.orders ? point : best),
      null,
    );
    if (busiest && busiest.orders > 0) {
      items.push({
        text: weekly
          ? `The week of ${busiest.label} had the most orders in this range, at ${busiest.orders.toLocaleString()}.`
          : `${busiest.label} was the busiest day in this range, with ${busiest.orders.toLocaleString()} order${busiest.orders === 1 ? "" : "s"}.`,
        tone: "neutral",
      });
    }

    if (repeat.uniqueCustomers >= 5) {
      items.push({
        text: `${repeat.repeatRate.toFixed(0)}% of buyers in this range (${repeat.repeatCustomers.toLocaleString()} of ${repeat.uniqueCustomers.toLocaleString()}) placed more than one order.`,
        tone: repeat.repeatRate >= 45 ? "positive" : "neutral",
      });
    }

    if (statuses.cancellationRate >= 5) {
      items.push({
        text: `${statuses.cancelled.toLocaleString()} of ${statuses.total.toLocaleString()} recorded orders were cancelled (${statuses.cancellationRate.toFixed(0)}%).`,
        tone: "negative",
      });
    }

    return items.slice(0, 5);
  }, [view, services, repeat, statuses, weekly, isMonthly]);

  return (
    <div className="space-y-4">
      {!period && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] dark:border-border-dark dark:bg-card-dark">
          <PeriodFilter view={view} onChange={internal.setSelection} />
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Revenue"
            value={view.kpis.revenue}
            format={compactPeso}
            change={view.changes.revenue ?? undefined}
            trend={
              view.changes.revenue !== null ? trendFor(view.changes.revenue) : "neutral"
            }
            icon={DollarSign}
            sparklineData={view.daily.map((point) => point.revenue)}
            sparklineColor={CHART.primary}
            caption={`Billed orders · ${rangeCaption}`}
          />
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
            caption="Cancelled orders excluded"
          />
          <KpiCard
            title="Avg Order Value"
            value={view.kpis.aov}
            format={(value) => peso(value)}
            change={view.changes.aov ?? undefined}
            trend={view.changes.aov !== null ? trendFor(view.changes.aov) : "neutral"}
            icon={ReceiptText}
            sparklineData={sparkAov}
            sparklineColor={CHART.purple}
            caption="Per billable order"
          />
          <KpiCard
            title="Active Customers"
            value={view.kpis.activeCustomers}
            change={view.changes.activeCustomers ?? undefined}
            trend={
              view.changes.activeCustomers !== null
                ? trendFor(view.changes.activeCustomers)
                : "neutral"
            }
            icon={Users}
            sparklineColor={CHART.blue}
            caption={
              repeat.uniqueCustomers > 0
                ? `${repeat.repeatCustomers.toLocaleString()} repeat buyers in this period`
                : "No buyers in this period"
            }
          />
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Completed"
            value={<AnimatedNumber value={statuses.completed} />}
            hint={`${((statuses.completed / Math.max(statuses.total, 1)) * 100).toFixed(0)}% of orders`}
            icon={CheckCircle2}
            accent={CHART.green}
          />
          <StatCard
            label="Pending"
            value={<AnimatedNumber value={statuses.pending} />}
            hint="Awaiting processing"
            icon={Clock3}
            accent={CHART.amber}
          />
          <StatCard
            label="In progress"
            value={<AnimatedNumber value={statuses.inProgress} />}
            hint="Washing or ready"
            icon={Timer}
            accent={CHART.blue}
          />
          <StatCard
            label="Cancelled"
            value={<AnimatedNumber value={statuses.cancelled} />}
            hint={`${statuses.cancellationRate.toFixed(0)}% of orders`}
            icon={XCircle}
            accent={CHART.coral}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!compact && (
          <>
        <ChartCard
          title={isMonthly ? "Monthly Order Trend" : weekly ? "Weekly Performance" : "Daily Performance"}
          subtitle={
            isMonthly
              ? "Recorded order volume · last 12 months"
              : `${rangeCaption} · orders and billed revenue`
          }
          className="lg:col-span-2"
          hover
        >
          {isMonthly ? (
            view.monthly.length === 0 ? (
              <EmptyChart message="No monthly history is available yet." />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={view.monthly}
                    margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                  >
                    <defs>
                      <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.teal} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke={AXIS.stroke}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={AXIS.stroke}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={44}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      {...TOOLTIP_ANIM}
                      formatter={(value) => [`${Number(value)} orders`, "Orders"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke={CHART.teal}
                      strokeWidth={2.5}
                      fill="url(#ordersFill)"
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.teal }}
                      isAnimationActive={animate}
                      {...CHART_ANIM}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          ) : view.kpis.orders === 0 ? (
            <EmptyChart message="No billable orders were recorded in this period." />
          ) : (
            <ActivityComboChart points={points} weekly={weekly} animate={animate} />
          )}
          {isMonthly && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Showing the latest 12 recorded months for trend context. The selected month is
              summarised in the cards above.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Order Status" subtitle={`Recorded orders · ${rangeCaption}`} hover>
          {statuses.total === 0 ? (
            <EmptyChart message="No orders were recorded in this period." />
          ) : (
            <OrderStatusDonut statuses={statuses} animate={animate} />
          )}
        </ChartCard>
          </>
        )}

        <ChartCard
          title="Most Requested Services"
          subtitle={`Billable orders by service · ${rangeCaption}`}
          className="lg:col-span-2"
          hover
        >
          {services.length === 0 ? (
            <EmptyChart message="No billable service activity in this period." />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={services}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={AXIS.stroke}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={AXIS.stroke}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={124}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    {...TOOLTIP_ANIM}
                    cursor={{ fill: "#07519b12" }}
                    formatter={(value) => [`${Number(value)} orders`, "Orders"]}
                  />
                  <Bar
                    dataKey="orders"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={26}
                    isAnimationActive={animate}
                    {...CHART_ANIM}
                  >
                    {services.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? CHART.teal : `${CHART.teal}${i < 3 ? "cc" : "99"}`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle subtitle="Patterns written in plain language">
              What the data shows
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <InsightList
              items={insights}
              emptyText="No notable patterns can be shown for this period with the available records."
            />
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {isMonthly && (
            <ChartCard
              title="Revenue Trend"
              subtitle="Monthly billed revenue · last 12 months"
              className="lg:col-span-2"
              hover
            >
              {view.monthly.length === 0 ? (
                <EmptyChart message="No monthly revenue history is available yet." />
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={view.monthly}
                      margin={{ top: 8, right: 8, bottom: 0, left: -4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke={AXIS.stroke}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis
                        stroke={AXIS.stroke}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        width={52}
                        tickFormatter={(v: number) => compactPeso(v).replace("₱", "")}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        {...TOOLTIP_ANIM}
                        cursor={{ fill: "#07519b10" }}
                        formatter={(value) => [peso(Number(value)), "Revenue"]}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={CHART.primary}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                        isAnimationActive={animate}
                        {...CHART_ANIM}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          )}

          <Card className={isMonthly ? "" : "lg:col-span-3"}>
            <CardHeader>
              <CardTitle subtitle="Across all recorded months">
                Best-performing periods
              </CardTitle>
            </CardHeader>
            <CardContent
              className={isMonthly ? "space-y-3" : "grid gap-3 sm:grid-cols-3"}
            >
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning-hover">
                  <Trophy className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Top revenue month
                  </p>
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {periods.byRevenue?.month ?? "—"}
                    <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                      {periods.byRevenue ? peso(periods.byRevenue.revenue) : ""}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Busiest order month
                  </p>
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {periods.byOrders?.month ?? "—"}
                    <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                      {periods.byOrders
                        ? `${periods.byOrders.orders} orders`
                        : ""}
                    </span>
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customer activity · {rangeCaption}
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-[11px] text-slate-400">Buyers</dt>
                    <dd className="font-medium text-slate-900 tabular-nums dark:text-white">
                      {repeat.uniqueCustomers.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Orders / buyer</dt>
                    <dd className="font-medium text-slate-900 tabular-nums dark:text-white">
                      {repeat.ordersPerCustomer.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Completion</dt>
                    <dd className="font-medium text-slate-900 tabular-nums dark:text-white">
                      {statuses.completionRate.toFixed(0)}%
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
