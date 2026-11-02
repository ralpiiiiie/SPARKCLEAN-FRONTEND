import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Award,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Inbox,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/ui/PageHeader";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { ChartCard } from "../components/charts/ChartCard";
import { CHART, AXIS, CHART_ANIM, tooltipStyle } from "../components/charts/palette";
import {
  ActivityComboChart,
  EmptyChart,
  OrderStatusDonut,
} from "../components/analytics/ActivityCharts";
import {
  AnalyticsError,
  AnalyticsSkeleton,
} from "../components/analytics/AnalyticsState";
import { useApiResource } from "../hooks/useApiResource";
import { apiService } from "../services/api";
import { useAuthStore } from "../store/auth";
import { peso, type StatusBreakdown } from "../lib/metrics";
import type { SeriesPoint } from "../lib/periods";
import type { DashboardSummary } from "../types/api";

const STATUS_VARIANTS = {
  Delivered: "success",
  Received: "secondary",
  Washing: "info",
  Ready: "warning",
  Cancelled: "danger",
} as const;

function pctChange(current: number, previous: number | undefined): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function trendOf(change: number | undefined): "up" | "down" | "neutral" {
  if (change === undefined) return "neutral";
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "neutral";
}

function MonthlyRevenueChart({ rows }: { rows: DashboardSummary["monthly"] }) {
  if (rows.length === 0) {
    return <EmptyChart message="No monthly revenue has been recorded for this branch yet." />;
  }

  return (
    <div className="h-[248px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
          <XAxis
            dataKey="month"
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            minTickGap={12}
          />
          <YAxis
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={52}
            tickFormatter={(value: number) => peso(value, true).replace("₱", "")}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [peso(Number(value)), "Revenue"]}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill={CHART.primary}
            radius={[5, 5, 0, 0]}
            maxBarSize={30}
            {...CHART_ANIM}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BranchDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data, status, reload } = useApiResource(
    () => apiService.getDashboardSummary(),
    [user?.id, user?.branchId],
  );

  const derived = useMemo(() => {
    if (!data) return null;

    const sb = data.statusBreakdown;
    const completed = sb.Delivered ?? 0;
    const pending = sb.Received ?? 0;
    const inProgress = (sb.Washing ?? 0) + (sb.Ready ?? 0);
    const cancelled = sb.Cancelled ?? 0;
    const total = completed + pending + inProgress + cancelled;
    const statuses: StatusBreakdown = {
      completed,
      pending,
      inProgress,
      cancelled,
      total,
      completionRate: total ? (completed / total) * 100 : 0,
      cancellationRate: total ? (cancelled / total) * 100 : 0,
    };

    const daily: SeriesPoint[] = data.daily.map((point) => ({
      key: point.date,
      label: point.label,
      orders: point.orders,
      revenue: point.revenue,
      cancelled: 0,
    }));

    const lastTwo = data.monthly.slice(-2);
    const revenueChange =
      lastTwo.length === 2 ? pctChange(lastTwo[1].revenue, lastTwo[0].revenue) : undefined;
    const ordersChange =
      lastTwo.length === 2 ? pctChange(lastTwo[1].orders, lastTwo[0].orders) : undefined;

    const serviceTotal = data.serviceMix.reduce((sum, row) => sum + row.orders, 0);
    const paymentTotal = data.paymentMix.reduce((sum, row) => sum + row.orders, 0);
    const asOf = data.daily[data.daily.length - 1]?.date ?? null;

    return {
      statuses,
      daily,
      revenueChange,
      ordersChange,
      serviceTotal,
      paymentTotal,
      asOf,
    };
  }, [data]);

  if (status === "error") return <AnalyticsError onRetry={reload} />;
  if (status === "loading" || !data || !derived) return <AnalyticsSkeleton />;

  const branchName = user?.branchName ?? "Branch";
  const branchId = user?.branchId ?? data.filters.branchId ?? "—";
  const inFlight = data.kpis.pending + data.kpis.inProgress;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Spark Clean Laundry · ${branchId}`}
        title={`${branchName} Branch Dashboard`}
        description="Orders, revenue, customers and service mix computed from this branch's recorded data only. Every figure is filtered on the server by your assigned branch."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" dot>
              {branchName}
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-border-dark dark:bg-card-dark dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {derived.asOf
                ? `Data through ${format(parseISO(derived.asOf), "MMM d, yyyy")}`
                : "No records yet"}
            </span>
          </div>
        }
      />

      {/* Prominent branch identity + isolation notice */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -top-16 right-6 h-56 w-56 rounded-full border border-white/40" />
          <div className="absolute -right-10 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Store className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-white/70 uppercase">
                Assigned branch
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {branchName}
                <span className="ml-2 align-middle text-sm font-medium text-white/70">
                  {branchId}
                </span>
              </h2>
              <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-white/75">
                Signed in as {user?.username ?? "Branch Manager"}
                {user?.branchCity ? ` · ${user.branchCity}` : ""}. Branch switching is disabled;
                records from other branches are never returned.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-[11.5px] font-medium ring-1 ring-white/20">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            Server-enforced branch scope
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section aria-labelledby="branch-kpis" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Branch performance</p>
            <h2 id="branch-kpis" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Key indicators
            </h2>
          </div>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            Revenue excludes Cancelled orders
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Total Orders"
            value={data.kpis.orders}
            change={derived.ordersChange}
            trend={trendOf(derived.ordersChange)}
            icon={ShoppingBag}
            sparklineData={derived.daily.map((point) => point.orders)}
            sparklineColor={CHART.teal}
            caption={`${data.kpis.cancelled} cancelled excluded`}
          />
          <KpiCard
            title="Total Revenue"
            value={data.kpis.revenue}
            format={(value) => peso(value, true)}
            change={derived.revenueChange}
            trend={trendOf(derived.revenueChange)}
            icon={DollarSign}
            sparklineData={derived.daily.map((point) => point.revenue)}
            sparklineColor={CHART.primary}
            caption="Billable orders only"
          />
          <KpiCard
            title="Completed"
            value={data.kpis.completed}
            icon={CheckCircle2}
            sparklineColor={CHART.green}
            caption={`${data.kpis.completionRate.toFixed(0)}% completion rate`}
          />
          <KpiCard
            title="Pending / In progress"
            value={inFlight}
            icon={Clock}
            sparklineColor={CHART.amber}
            caption={`${data.kpis.pending} pending · ${data.kpis.inProgress} in progress`}
          />
          <KpiCard
            title="Customers"
            value={data.kpis.totalCustomers}
            icon={Users}
            sparklineColor={CHART.blue}
            caption={`${data.kpis.activeCustomers} ordered in this period`}
          />
        </div>
      </section>

      {/* 15-day activity + status */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Last 15-day performance"
          subtitle="Daily orders and billable revenue for this branch"
          className="lg:col-span-2"
          hover
        >
          {derived.daily.every((point) => point.orders === 0) ? (
            <EmptyChart message="No orders were recorded in the last 15 recorded days." />
          ) : (
            <ActivityComboChart points={derived.daily} />
          )}
        </ChartCard>

        <ChartCard title="Order status" subtitle="Recorded orders in this branch" hover>
          {derived.statuses.total === 0 ? (
            <EmptyChart message="No orders were recorded for this branch yet." />
          ) : (
            <OrderStatusDonut statuses={derived.statuses} />
          )}
        </ChartCard>
      </section>

      {/* Monthly revenue + payment mix */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Monthly revenue"
          subtitle="Last 12 recorded months · this branch"
          className="lg:col-span-2"
          hover
        >
          <MonthlyRevenueChart rows={data.monthly} />
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle subtitle="Billable orders by recorded method">
              Payment mix
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {data.paymentMix.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No payments were recorded for this branch.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.paymentMix.map((row) => {
                  const share = derived.paymentTotal
                    ? (row.orders / derived.paymentTotal) * 100
                    : 0;
                  return (
                    <li key={row.method}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                          {row.method}
                        </span>
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">
                          {row.orders} · {share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-brand-gradient-bar"
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500">
                        {peso(row.revenue)} revenue
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Service mix + top customers */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle subtitle="Ranked by billable order count">Popular services</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                  <th scope="col" className="px-6 py-2.5">Service</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Orders</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Share</th>
                  <th scope="col" className="px-6 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.serviceMix.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-slate-100/80 last:border-0 dark:border-slate-800/70"
                  >
                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {row.name}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {row.orders}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {derived.serviceTotal
                        ? `${((row.orders / derived.serviceTotal) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-800 dark:text-slate-200">
                      {peso(row.revenue)}
                    </td>
                  </tr>
                ))}
                {data.serviceMix.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No services have been recorded for this branch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle subtitle="Most frequent customers · no contact details">
              Top customers
            </CardTitle>
          </CardHeader>
          <div className="px-3 pb-4">
            {data.topCustomers.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No customer activity has been recorded for this branch.
              </p>
            ) : (
              <ul className="space-y-1">
                {data.topCustomers.map((customer, index) => (
                  <li
                    key={`${customer.name}-${index}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary dark:bg-aqua/15 dark:text-aqua">
                      {index === 0 ? <Award className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {customer.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Last order {format(parseISO(customer.lastOrderDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        {customer.orders} orders
                      </p>
                      <p className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                        {peso(customer.revenue)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>

      {/* Recent orders */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle subtitle={`Latest records for ${branchName}`}>Recent orders</CardTitle>
        </CardHeader>
        {data.recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 pt-2 pb-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Inbox className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No orders have been recorded for this branch yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <caption className="sr-only">
                Most recent orders recorded for {branchName}
              </caption>
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                  <th scope="col" className="px-6 py-2.5">Order</th>
                  <th scope="col" className="px-3 py-2.5">Customer</th>
                  <th scope="col" className="px-3 py-2.5">Service</th>
                  <th scope="col" className="px-3 py-2.5">Payment</th>
                  <th scope="col" className="px-3 py-2.5">Date</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                  <th scope="col" className="px-6 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50/80 dark:border-slate-800/70 dark:hover:bg-slate-800/40"
                  >
                    <th scope="row" className="px-6 py-3 text-left font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                      {order.id}
                    </th>
                    <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {order.customer ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {order.service ?? order.serviceId}
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                      {order.paymentMethod}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {format(parseISO(order.orderDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800 dark:text-slate-200">
                      {peso(order.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={STATUS_VARIANTS[order.status]} dot>
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
