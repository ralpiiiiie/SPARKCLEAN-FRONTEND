import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  DollarSign,
  Gauge,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { KpiCard } from "../components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Chip, Money, ProgressRow, SegmentedControl } from "../components/ui/Bento";
import { ChartCard } from "../components/charts/ChartCard";
import { EmptyPanel, PanelError, PanelLoading } from "../components/ui/PanelState";
import {
  AXIS,
  CHART,
  CHART_ANIM,
  CHART_SERIES,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../components/charts/palette";
import {
  AXIS_LINE,
  GRID,
  SMOOTH_LINE,
  endDot,
  hoverDot,
  paddedDomain,
  useLineAnimation,
} from "../components/charts/lineStyle";
import { useApiResource } from "../hooks/useApiResource";
import { getDescriptive } from "../services/api";
import { integer, money, percent, shortMonth } from "../lib/format";
import type { Granularity } from "../types";

function monthChange(series: number[]): { change: number; trend: "up" | "down" | "neutral" } {
  if (series.length < 2) return { change: 0, trend: "neutral" };
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  if (previous === 0) return { change: 0, trend: "neutral" };
  const change = ((latest - previous) / previous) * 100;
  return { change, trend: change > 0.05 ? "up" : change < -0.05 ? "down" : "neutral" };
}

const GRANULARITY_OPTIONS: { id: Granularity; label: string }[] = [
  { id: "month", label: "Monthly" },
  { id: "week", label: "Weekly" },
];

export function DescriptiveAnalytics() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { data, status, error, reload } = useApiResource(
    () => getDescriptive(granularity),
    [granularity],
  );
  const lineAnimation = useLineAnimation();

  // Keep the previous figures on screen while the other granularity loads, so
  // toggling Monthly/Weekly never blanks the page.
  if (status === "loading" && !data) {
    return <PanelLoading label="Computing descriptive analytics…" />;
  }
  if (status === "error" || !data) {
    return <PanelError message={error ?? "Descriptive analytics could not be loaded."} onRetry={reload} />;
  }

  const { kpis, monthlySales, profitByService, finding } = data;
  const salesChange = monthChange(monthlySales.map((row) => row.sales));
  const profitChange = monthChange(monthlySales.map((row) => row.profit));
  const margin = kpis.totalSales > 0 ? (kpis.totalProfit / kpis.totalSales) * 100 : 0;

  const serviceProfit = profitByService.map((service) => ({
    ...service,
    profit: service.unitsProcessed * service.profitPerUnit,
  }));
  const profitTotal = serviceProfit.reduce((sum, row) => sum + row.profit, 0);
  const byHour = [...profitByService].sort((a, b) => b.profitPerHour - a.profitPerHour);

  const isWeekly = data.granularity === "week";
  const periodLabel = isWeekly ? "week" : "month";
  const series = data.salesSeries.map((row) => ({
    ...row,
    label: isWeekly ? row.label : shortMonth(row.label),
  }));

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Stage 1 · What happened?"
        title="Descriptive Analytics"
        description="Sales, profit and machine-hour economics for the recorded 12 months. Every figure is computed by the server from the six business tables."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" dot>
              {kpis.orderRecords} order records
            </Badge>
            <Chip tone="neutral" icon={Clock}>
              12 months
            </Chip>
          </div>
        }
      />

      <section aria-labelledby="descriptive-kpis">
        <h2 id="descriptive-kpis" className="sr-only">
          Key indicators
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total sales"
            value={kpis.totalSales}
            format={(value) => money(value)}
            icon={DollarSign}
            sparklineData={monthlySales.map((row) => row.sales)}
            sparklineColor={CHART.primary}
            change={salesChange.change}
            trend={salesChange.trend}
            caption="Recorded payment amounts"
          />
          <KpiCard
            title="Total profit"
            value={kpis.totalProfit}
            format={(value) => money(value)}
            icon={TrendingUp}
            sparklineData={monthlySales.map((row) => row.profit)}
            sparklineColor={CHART.teal}
            change={profitChange.change}
            trend={profitChange.trend}
            caption={`${percent(margin)} margin on sales`}
          />
          <KpiCard
            title="Order records"
            value={kpis.orderRecords}
            icon={ShoppingBag}
            caption="Four services over 48 weeks"
          />
          <KpiCard
            title="Customers"
            value={kpis.customers}
            icon={Users}
            sparklineColor={CHART.purple}
            caption="Seeded customer accounts"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={`${isWeekly ? "Weekly" : "Monthly"} sales and profit`}
          subtitle={`Sales and profit traced over the ${series.length} recorded ${periodLabel}s`}
          className="lg:col-span-2"
          hover
          action={
            <SegmentedControl<Granularity>
              options={GRANULARITY_OPTIONS}
              value={granularity}
              onChange={setGranularity}
              ariaLabel="Sales trend granularity"
              size="sm"
            />
          }
        >
          {series.length === 0 ? (
            <EmptyPanel title="No sales recorded" description="Add orders and payments in Data Explorer." />
          ) : (
            <div className="h-[288px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={series}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid {...GRID} />
                  <XAxis
                    {...AXIS_LINE}
                    dataKey="label"
                    minTickGap={isWeekly ? 28 : 8}
                    interval={isWeekly ? "preserveStartEnd" : 0}
                  />
                  <YAxis
                    {...AXIS_LINE}
                    width={52}
                    domain={paddedDomain(
                      series.flatMap((row) => [row.sales, row.profit]),
                      { ticks: 5 },
                    )}
                    allowDataOverflow
                    tickFormatter={(value: number) => money(value, { compact: true }).replace("₱", "")}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    {...TOOLTIP_ANIM}
                    cursor={{ stroke: AXIS.stroke, strokeDasharray: "3 3" }}
                    labelFormatter={(value) => {
                      if (!isWeekly) return String(value);
                      const row = series.find((entry) => entry.label === String(value));
                      return row ? `${row.label} · ${row.period}` : String(value);
                    }}
                    formatter={(value, name) => [money(Number(value)), String(name)]}
                  />
                  <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    {...SMOOTH_LINE}
                    dataKey="sales"
                    name="Sales"
                    stroke={CHART.primary}
                    activeDot={hoverDot(CHART.primary)}
                    dot={endDot(CHART.primary, series.length - 1)}
                    {...lineAnimation}
                  />
                  <Line
                    {...SMOOTH_LINE}
                    dataKey="profit"
                    name="Profit"
                    stroke={CHART.teal}
                    activeDot={hoverDot(CHART.teal)}
                    dot={endDot(CHART.teal, series.length - 1)}
                    {...lineAnimation}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle subtitle="The headline the numbers support">
              Descriptive finding
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-4">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {finding.message}
            </p>
            <dl className="space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Highest profit / hour</dt>
                <dd className="text-right font-medium text-slate-900 tabular-nums dark:text-white">
                  {finding.highest
                    ? `${finding.highest.name} · ${money(finding.highest.profitPerHour)}`
                    : "Not enough records"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Lowest profit / hour</dt>
                <dd className="text-right font-medium text-slate-900 tabular-nums dark:text-white">
                  {finding.lowest
                    ? `${finding.lowest.name} · ${money(finding.lowest.profitPerHour)}`
                    : "Not enough records"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Portfolio margin</dt>
                <dd className="text-right font-medium text-success tabular-nums">
                  {percent(margin)}
                </dd>
              </div>
            </dl>
            <Link
              to="/predictive"
              className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-aqua"
            >
              Continue to the forecast <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Profit per machine hour"
          subtitle="What each service earns for every hour of machine time"
          className="lg:col-span-2"
          hover
        >
          {byHour.length === 0 ? (
            <EmptyPanel title="No services recorded" description="The service catalogue is empty." />
          ) : (
            <div className="h-[252px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byHour}
                  layout="vertical"
                  margin={{ top: 4, right: 20, bottom: 0, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={AXIS.stroke}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(value: number) => money(value, { compact: true }).replace("₱", "")}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={AXIS.stroke}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={96}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    {...TOOLTIP_ANIM}
                    cursor={{ fill: "var(--chart-grid)" }}
                    formatter={(value) => [money(Number(value)), "Profit per hour"]}
                  />
                  <Bar dataKey="profitPerHour" radius={[0, 8, 8, 0]} maxBarSize={24} isAnimationActive {...CHART_ANIM}>
                    {byHour.map((entry, index) => (
                      <Cell
                        key={entry.id}
                        fill={index === 0 ? CHART.teal : CHART_SERIES[index % CHART_SERIES.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle subtitle="Share of profit contributed by each service">
              Profit contribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceProfit.length === 0 ? (
              <EmptyPanel title="No profit recorded" />
            ) : (
              <div className="space-y-4">
                {[...serviceProfit]
                  .sort((a, b) => b.profit - a.profit)
                  .map((row, index) => (
                    <ProgressRow
                      key={row.id}
                      label={row.name}
                      value={<Money>{money(row.profit, { compact: true })}</Money>}
                      percent={profitTotal > 0 ? (row.profit / profitTotal) * 100 : 0}
                      tone={index === 0 ? "success" : index === 1 ? "primary" : "aqua"}
                      hint={`${integer(row.unitsProcessed)} ${row.unitLabel} · ${money(row.profitPerHour)} / hour`}
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader
          action={<Chip tone="neutral" icon={Gauge}>{profitByService.length} services</Chip>}
        >
          <CardTitle subtitle="Price, cost, machine time and recorded volume">
            Service economics
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted/60 text-left text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase dark:bg-elevated-dark/50 dark:text-slate-500">
                <th scope="col" className="px-6 py-2.5 font-medium">Service</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Price</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Cost</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Profit / unit</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Hours / unit</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Units processed</th>
                <th scope="col" className="px-6 py-2.5 text-right font-medium">Profit / hour</th>
              </tr>
            </thead>
            <tbody>
              {profitByService.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100/80 last:border-0 dark:border-slate-800/70"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{row.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">per {row.unitLabel}</p>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                    {money(row.price)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                    {money(row.cost)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                    {money(row.profitPerUnit)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                    {row.hoursPerUnit}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                    {integer(row.unitsProcessed)}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                    {money(row.profitPerHour)}
                  </td>
                </tr>
              ))}
              {profitByService.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No services are recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3" aria-hidden /> Next: forecast demand
          </Badge>
          <Link to="/predictive">
            <Button variant="primary" size="sm">
              Predictive analytics <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
