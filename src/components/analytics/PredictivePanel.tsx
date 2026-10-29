import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Gauge,
  Info,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";
import type { BusinessData } from "../../lib/business";
import type { MonthPoint } from "../../lib/metrics";
import {
  continuousMonthlySeries,
  formatMonth,
  peso,
  serviceDemandChange,
} from "../../lib/metrics";
import {
  forecastBranchWorkloads,
  forecastMonthly,
  seasonalPeaks,
} from "../../lib/analytics/forecastBusiness";
import { forecastDaily } from "../../lib/analytics/dailyForecast";
import { StatCard } from "../ui/StatCard";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { ChartCard } from "../charts/ChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import {
  CHART,
  AXIS,
  CHART_ANIM,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../charts/palette";
import { cn } from "../../lib/utils";

type HorizonId = "7d" | "15d" | "month";

const HORIZONS: { id: HorizonId; label: string; days: number }[] = [
  { id: "7d", label: "Next 7 days", days: 7 },
  { id: "15d", label: "Next 15 days", days: 15 },
  { id: "month", label: "Next month", days: 0 },
];

function keyFromMonthNo(monthNo: number): string {
  const year = 2022 + Math.floor((monthNo - 1) / 12);
  const month = ((monthNo - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

const CONFIDENCE_VARIANT = {
  High: "success",
  Moderate: "warning",
  Low: "secondary",
} as const;

const orderFormat = (value: number): string =>
  value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString();

export function PredictivePanel({
  data,
  compact = false,
}: {
  data: BusinessData;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const animateCharts = !reduced;
  const [horizon, setHorizon] = useState<HorizonId>("month");
  const [branch, setBranch] = useState(() => data.branches[0]?.name ?? "");

  const series = useMemo(() => continuousMonthlySeries(data.orders), [data]);
  const monthlyOrders = useMemo(
    () => forecastMonthly(series, "orders", 1),
    [series],
  );
  const monthlyRevenue = useMemo(
    () => forecastMonthly(series, "revenue", 1),
    [series],
  );
  const daily = useMemo(
    () =>
      forecastDaily(
        data.orders,
        horizon === "7d" ? 7 : horizon === "15d" ? 15 : 7,
      ),
    [data, horizon],
  );
  const workloads = useMemo(() => forecastBranchWorkloads(data.demand), [data]);
  const peaks = useMemo(() => seasonalPeaks(series), [series]);
  const shifts = useMemo(
    () => serviceDemandChange(data.orders, data.services, 6),
    [data],
  );

  const branchForecast = useMemo(() => {
    const rows = data.demand
      .filter((d) => d.branch === branch)
      .sort((a, b) => a.monthNo - b.monthNo);
    const branchSeries: MonthPoint[] = rows.map((r) => {
      const key = keyFromMonthNo(r.monthNo);
      return { key, month: formatMonth(key), revenue: 0, orders: r.loads, aov: 0 };
    });
    return forecastMonthly(branchSeries, "orders", 1);
  }, [data, branch]);

  const isDaily = horizon !== "month";
  const horizonDays = horizon === "7d" ? 7 : 15;
  const totalPlannedLoads = workloads.reduce((s, w) => s + w.forecastLoads, 0);

  const sufficient = isDaily ? daily.sufficient : monthlyOrders.sufficient;
  const confidence = isDaily ? daily.confidence : monthlyOrders.confidence;
  const errorPct = isDaily ? daily.errorPct : monthlyOrders.errorPct;
  const methodLabel = isDaily ? daily.methodLabel : monthlyOrders.methodLabel;

  const orderPoints = (isDaily ? daily.points : monthlyOrders.points).map((point) => ({
    label: "label" in point ? point.label : point.month,
    actual: point.actual,
    forecast: point.forecast,
  }));
  const orderChartTitle = isDaily ? "Daily Demand Outlook" : "Monthly Order Outlook";

  const expectedOrders = isDaily
    ? daily.expectedOrders
    : monthlyOrders.nextValue ?? 0;
  const expectedRevenue = isDaily
    ? daily.expectedRevenue
    : monthlyRevenue.nextValue ?? 0;
  const expectedLoads = isDaily ? daily.expectedLoads : totalPlannedLoads;

  const busyDays = daily.busyDays;
  const busiestBusyDay = busyDays[0]?.orders ?? 0;

  const confidenceCard = (
    <StatCard
      label="Forecast confidence"
      value={
        <span className="flex items-center gap-2">
          {confidence ?? "—"}
          <Badge variant={CONFIDENCE_VARIANT[confidence ?? "Low"]}>
            {errorPct !== null
              ? `±${errorPct.toFixed(0)}% typical error`
              : "Estimate"}
          </Badge>
        </span>
      }
      hint={
        isDaily
          ? `${methodLabel} · ${daily.historyDays.toLocaleString()} days of history`
          : `${methodLabel} · ${monthlyOrders.historyMonths} months of history`
      }
      icon={Gauge}
      accent={CHART.amber}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Forecast horizon"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60"
        >
          {HORIZONS.map((option) => {
            const active = horizon === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setHorizon(option.id)}
                className={cn(
                  "focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-white text-primary shadow-sm dark:bg-slate-800 dark:text-aqua"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <Badge variant="warning" dot>
          Estimates only
        </Badge>
      </div>

      {sufficient ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={
                isDaily
                  ? `Estimated orders · next ${horizonDays} days`
                  : "Estimated orders · next month"
              }
              value={
                <AnimatedNumber
                  value={expectedOrders}
                  format={isDaily ? orderFormat : undefined}
                />
              }
              hint={
                isDaily
                  ? `As of ${data.orders.length.toLocaleString()} recorded orders`
                  : "Projected from the latest 12 months"
              }
              icon={ShoppingBag}
              accent={CHART.primary}
            />
            <StatCard
              label={
                isDaily
                  ? `Estimated revenue · next ${horizonDays} days`
                  : "Estimated revenue · next month"
              }
              value={
                <AnimatedNumber
                  value={expectedRevenue}
                  format={(value) => peso(value, true)}
                />
              }
              hint="At recent average order value"
              icon={Wallet}
              accent={CHART.teal}
            />
            <StatCard
              label={
                isDaily
                  ? `Expected workload · next ${horizonDays} days`
                  : "Expected workload · next month"
              }
              value={
                <span className="flex items-baseline gap-1">
                  <AnimatedNumber value={expectedLoads} />
                  <span className="text-sm font-medium text-slate-400">loads</span>
                </span>
              }
              hint={
                isDaily
                  ? "At the recent average load per order"
                  : `Across ${workloads.length} branches`
              }
              icon={Boxes}
              accent={CHART.purple}
            />
            {confidenceCard}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title={orderChartTitle}
              subtitle="Solid line is recorded history · dashed line is the estimate"
              action={<Badge variant="warning">Estimate</Badge>}
              hover
            >
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={orderPoints}
                    margin={{ top: 8, right: 10, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke={AXIS.stroke}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      minTickGap={18}
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
                      formatter={(value, name) => [
                        `${Number(value).toFixed(1)} orders`,
                        String(name),
                      ]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Recorded"
                      stroke={CHART.primary}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.primary }}
                      connectNulls={false}
                      isAnimationActive={animateCharts}
                      {...CHART_ANIM}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Estimated"
                      stroke={CHART.amber}
                      strokeWidth={2.5}
                      strokeDasharray="6 5"
                      dot={{ r: 3, fill: CHART.amber, strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.amber }}
                      connectNulls
                      isAnimationActive={animateCharts}
                      {...CHART_ANIM}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Monthly Revenue Outlook"
              subtitle="Recorded revenue against the projected path"
              action={<Badge variant="warning">Estimate</Badge>}
              hover
            >
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyRevenue.points}
                    margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke={AXIS.stroke}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      minTickGap={18}
                    />
                    <YAxis
                      stroke={AXIS.stroke}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={52}
                      tickFormatter={(v: number) => peso(v, true).replace("₱", "")}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      {...TOOLTIP_ANIM}
                      formatter={(value, name) => [peso(Number(value)), String(name)]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Recorded"
                      stroke={CHART.teal}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.teal }}
                      connectNulls={false}
                      isAnimationActive={animateCharts}
                      {...CHART_ANIM}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="Estimated"
                      stroke={CHART.amber}
                      strokeWidth={2.5}
                      strokeDasharray="6 5"
                      dot={{ r: 3, fill: CHART.amber, strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.amber }}
                      connectNulls
                      isAnimationActive={animateCharts}
                      {...CHART_ANIM}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Expected Workload by Branch"
              subtitle="Estimated loads next month, from the last six recorded months"
              className="lg:col-span-2"
              hover
            >
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={workloads}
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
                    />
                    <YAxis
                      type="category"
                      dataKey="branch"
                      stroke={AXIS.stroke}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={96}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      {...TOOLTIP_ANIM}
                      cursor={{ fill: "#8b5cf612" }}
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} loads`,
                        "Estimated",
                      ]}
                    />
                    <Bar
                      dataKey="forecastLoads"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={24}
                      isAnimationActive={animateCharts}
                      {...CHART_ANIM}
                    >
                      {workloads.map((w) => (
                        <Cell
                          key={w.branch}
                          fill={
                            w.direction === "up"
                              ? CHART.amber
                              : w.direction === "down"
                                ? CHART.coral
                                : CHART.purple
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART.amber }} />
                  Rising
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART.coral }} />
                  Softening
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART.purple }} />
                  Steady
                </span>
              </div>
            </ChartCard>

            <Card>
              <CardHeader>
                <CardTitle
                  subtitle={
                    isDaily
                      ? `Highest projected days over the next ${horizonDays} days`
                      : "Average orders by calendar month"
                  }
                >
                  {isDaily ? "Expected Busy Days" : "Anticipated Busy Periods"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isDaily ? (
                  busyDays.length > 0 ? (
                    busyDays.map((day, i) => (
                      <div key={day.key}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {day.label}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ≈{day.orders.toFixed(1)} orders
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="bar-grow h-full rounded-full"
                            style={{
                              width: `${busiestBusyDay ? (day.orders / busiestBusyDay) * 100 : 0}%`,
                              backgroundColor: i === 0 ? CHART.amber : `${CHART.amber}99`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No busy days can be identified from the available daily records.
                    </p>
                  )
                ) : peaks.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    At least two years of history are needed to identify seasonal peaks.
                  </p>
                ) : (
                  peaks.slice(0, 4).map((peak, i) => (
                    <div key={peak.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {peak.label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {peak.average.toFixed(1)} avg orders
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="bar-grow h-full rounded-full"
                          style={{
                            width: `${(peak.average / peaks[0].average) * 100}%`,
                            backgroundColor: i === 0 ? CHART.amber : `${CHART.amber}99`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
                <p className="pt-1 text-xs text-slate-400 dark:text-slate-500">
                  {isDaily
                    ? "Derived from weekday patterns in the latest ten weeks of orders."
                    : "Plan staffing and plant capacity around the months with the highest historical averages."}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Info className="h-6 w-6 text-warning-hover" />
          </div>
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Not enough historical data to generate a reliable forecast.
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {isDaily
              ? `Only ${daily.historyDays} days of order history are available for this view. At least 56 days are needed to project daily demand.`
              : `Only ${monthlyOrders.historyMonths} month${monthlyOrders.historyMonths === 1 ? "" : "s"} of order history are available. At least 12 months are needed to project demand and revenue.`}
          </p>
        </Card>
      )}

      {!compact && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Branch Demand Outlook"
              subtitle="Recorded loads and the projected path for one branch"
              className="lg:col-span-2"
              hover
              action={
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  aria-label="Select branch"
                  className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              }
            >
              {branchForecast.sufficient ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={branchForecast.points}
                      margin={{ top: 8, right: 10, bottom: 0, left: -10 }}
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
                        width={44}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        {...TOOLTIP_ANIM}
                        formatter={(value, name) => [
                          `${Math.round(Number(value)).toLocaleString()} loads`,
                          String(name),
                        ]}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Recorded"
                        stroke={CHART.purple}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.purple }}
                        connectNulls={false}
                        isAnimationActive={animateCharts}
                        {...CHART_ANIM}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Estimated"
                        stroke={CHART.amber}
                        strokeWidth={2.5}
                        strokeDasharray="6 5"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.amber }}
                        connectNulls
                        isAnimationActive={animateCharts}
                        {...CHART_ANIM}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Not enough history for {branch} to project demand.
                </p>
              )}
            </ChartCard>

            <Card>
              <CardHeader>
                <CardTitle subtitle="Latest six months vs the six before">
                  Service Demand Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shifts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Not enough history to compare service demand across periods.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {shifts.slice(0, 6).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                            {s.name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {s.priorOrders} → {s.recentOrders} orders
                          </p>
                        </div>
                        {s.changePct === null ? (
                          <Badge variant="secondary">New</Badge>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              s.direction === "up"
                                ? "text-success"
                                : s.direction === "down"
                                  ? "text-coral"
                                  : "text-slate-400"
                            }`}
                          >
                            {s.direction === "up" ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : s.direction === "down" ? (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            ) : null}
                            {s.changePct > 0 ? "+" : ""}
                            {s.changePct.toFixed(0)}%
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-dashed bg-slate-50/60 dark:bg-slate-800/30">
        <CardContent className="flex items-start gap-3 pt-5 text-sm text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
          <p>
            {isDaily
              ? `Daily estimates are projected from the last ten weeks of recorded orders using ${methodLabel.toLowerCase()}. Daily order records are sparse, so treat the day-to-day pattern as directional guidance rather than a guaranteed outcome.`
              : `Forecasts are estimates projected from recorded order history using ${methodLabel.toLowerCase()}. They do not account for promotions, weather, or new competitors, so use them as directional guidance rather than guaranteed outcomes.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
