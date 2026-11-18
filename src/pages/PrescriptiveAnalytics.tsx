import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Gauge,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { Chip, Money, ProgressRow } from "../components/ui/Bento";
import { ChartCard } from "../components/charts/ChartCard";
import { EmptyPanel, PanelError, PanelLoading } from "../components/ui/PanelState";
import { Field, NumberInput } from "../components/ui/Field";
import {
  AXIS,
  CHART,
  CHART_ANIM,
  CHART_SERIES,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../components/charts/palette";
import { useApiResource } from "../hooks/useApiResource";
import { getSettings, optimizePlan } from "../services/api";
import { MODEL_LABELS } from "../lib/forecast";
import { useForecastStore } from "../store/forecast";
import type { OptimizePlanPayload, PlanRow, PlanStatus } from "../types";
import { cn } from "../lib/utils";
import { integer, money, number, percent } from "../lib/format";

const MIN_HOURS = 200;
const MAX_HOURS = 600;
const FALLBACK_HOURS = 400;
const INTL = new Intl.NumberFormat("en-PH");

/** How long the Optimise Plan button shows progress before the plan flips. */
const OPTIMISE_MS = 700;

type View = "current" | "optimized";

function clampHours(value: number): number {
  if (!Number.isFinite(value)) return FALLBACK_HOURS;
  return Math.max(MIN_HOURS, Math.min(MAX_HOURS, Math.round(value)));
}

/**
 * Everything that makes the demand ceiling move: the model, its parameters and
 * the forecast it produced. A change here invalidates an optimised plan.
 */
function planSignature(data: OptimizePlanPayload): string {
  return [
    data.model,
    data.window,
    data.alpha,
    data.hoursNeededAll,
    data.chart.map((row) => `${row.service}=${row.forecast}`).join(","),
  ].join("|");
}

const STATUS_BADGE: Record<PlanStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
  full: { label: "Full", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  skipped: { label: "Skipped", variant: "secondary" },
};

function PlanTable({ rows, optimized }: { rows: PlanRow[]; optimized: boolean }) {
  const totals = rows.reduce(
    (sum, row) => ({
      forecast: sum.forecast + row.forecast,
      units: sum.units + row.units,
      hours: sum.hours + row.hoursUsed,
      profit: sum.profit + row.profit,
    }),
    { forecast: 0, units: 0, hours: 0, profit: 0 },
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-muted/60 text-left text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase dark:bg-elevated-dark/50 dark:text-slate-500">
            <th scope="col" className="px-6 py-2.5 font-medium">Order</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Service</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Forecast</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Units</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Hours used</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Hours left</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Profit</th>
            <th scope="col" className="px-6 py-2.5 font-medium">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const badge = STATUS_BADGE[row.status];
            return (
              <tr
                key={row.serviceId}
                className={cn(
                  "border-b border-slate-100/80 last:border-0 dark:border-slate-800/70",
                  row.status === "full" && "bg-success/[0.04] dark:bg-success/[0.07]",
                )}
              >
                <td className="px-6 py-3 text-slate-400 tabular-nums dark:text-slate-500">
                  {optimized ? row.rank : "—"}
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{row.service}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {money(row.profitPerHour)} per hour · {row.hoursPerUnit} h per {row.unitLabel}
                  </p>
                </td>
                <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                  {integer(row.forecast)}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                  {integer(row.units)}
                </td>
                <td className="px-3 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                  {number(row.hoursUsed)} h
                </td>
                <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                  {number(row.hoursLeft)} h
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                  <Money>{money(row.profit)}</Money>
                </td>
                <td className="px-6 py-3">
                  <Badge variant={badge.variant} dot>
                    {badge.label}
                  </Badge>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                No services are available to plan.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-surface-muted/40 dark:bg-elevated-dark/40">
              <td colSpan={2} className="px-6 py-3 font-medium text-slate-700 dark:text-slate-200">
                Total
              </td>
              <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                {integer(totals.forecast)}
              </td>
              <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                {integer(totals.units)}
              </td>
              <td className="px-3 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                {number(Math.round(totals.hours * 100) / 100)} h
              </td>
              <td className="px-3 py-3" />
              <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                <Money>{money(Math.round(totals.profit * 100) / 100)}</Money>
              </td>
              <td className="px-6 py-3" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function PrescriptiveAnalytics() {
  const model = useForecastStore((state) => state.model);
  const windowSize = useForecastStore((state) => state.window);
  const alpha = useForecastStore((state) => state.alpha);

  const settings = useApiResource(getSettings, []);
  /** Hours typed or dragged by the user; null means "still following Settings". */
  const [draftHours, setDraftHours] = useState<number | null>(null);
  const [committed, setCommitted] = useState(FALLBACK_HOURS);
  const [view, setView] = useState<View>("current");
  /** Forecast signature the optimised plan was produced from, if any. */
  const [optimizedFor, setOptimizedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const reduced = useReducedMotion();
  const timer = useRef<number | null>(null);

  // The planner opens on the saved default; nothing is copied into state, so a
  // late-arriving Settings response cannot cause a second render.
  const hours =
    draftHours ?? (settings.data ? clampHours(settings.data.machineHoursDefault) : FALLBACK_HOURS);

  useEffect(() => {
    const id = window.setTimeout(() => setCommitted(clampHours(hours)), 250);
    return () => window.clearTimeout(id);
  }, [hours]);

  const { data, status, error, reload } = useApiResource(
    () => optimizePlan({ hoursAvailable: committed, model, window: windowSize, alpha }),
    [committed, model, windowSize, alpha],
  );

  const latest = useRef<OptimizePlanPayload | null>(null);
  latest.current = data;
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const runOptimise = () => {
    if (!data || busy) return;
    setBusy(true);
    setAnnounce("");
    timer.current = window.setTimeout(
      () => {
        setBusy(false);
        const current = latest.current;
        if (!current) return;
        // Remember which forecast was optimised; if it moves, the view falls
        // back to the current plan on its own.
        setOptimizedFor(planSignature(current));
        setView("optimized");
        setAnnounce("Plan optimized");
        toast.success("Plan optimized", { description: current.recommendation });
      },
      reduced ? 0 : OPTIMISE_MS,
    );
  };

  const resetPlan = () => {
    setView("current");
    setOptimizedFor(null);
    setAnnounce("Back to the current plan.");
  };

  if (status === "loading" && !data) return <PanelLoading label="Building the machine-hour plan…" />;
  if (status === "error" || !data) {
    return (
      <PanelError message={error ?? "The processing plan could not be computed."} onRetry={reload} />
    );
  }

  // The optimised view only survives while the forecast it was built from holds.
  const optimized = view === "optimized" && optimizedFor === planSignature(data);
  const plan = optimized ? data.optimizedPlan : data.currentPlan;
  const constrained = data.hoursNeededAll > data.hoursAvailable;
  const chartData = data.chart.map((row) => ({
    service: row.service,
    forecast: row.forecast,
    units: optimized ? row.optimized : row.current,
  }));
  const maxProfitPerHour = Math.max(...data.optimizedPlan.rows.map((row) => row.profitPerHour), 1);
  const updating = status === "loading";

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Stage 3 · What should we process?"
        title="Prescriptive Analytics"
        description="Compare the way the shop works today with the plan that spends every machine hour where it earns the most."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={constrained ? "warning" : "success"} dot>
              {constrained ? "Capacity constrained" : "Demand covered"}
            </Badge>
            <Link
              to="/predictive"
              className="focus-ring rounded-full"
              title="Change the demand model on the Predictive page"
            >
              <Chip tone="primary" icon={Target}>
                Forecast: {MODEL_LABELS[model]}
              </Chip>
            </Link>
            <Chip tone="neutral" icon={Clock}>
              {number(data.hoursNeededAll)} h needed
            </Chip>
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-4 pt-5 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
          <div>
            <p className="section-eyebrow">Machine-hour limit</p>
            <h2 className="mt-1 font-display text-lg font-medium text-slate-900 dark:text-white">
              Choose the hours available next month
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Between {MIN_HOURS} and {MAX_HOURS} hours. The plan recomputes as soon as the value
              settles — never beyond the {MODEL_LABELS[model]} forecast.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="range"
                min={MIN_HOURS}
                max={MAX_HOURS}
                step={10}
                value={hours}
                onChange={(event) => {
                  setDraftHours(Number(event.target.value));
                }}
                aria-label="Machine hours available"
                className="focus-ring h-2 w-full max-w-md cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-primary)] dark:bg-slate-700"
              />
              <span className="font-display text-lg font-medium text-slate-900 tabular-nums dark:text-white">
                {INTL.format(hours)} h
              </span>
            </div>
          </div>

          <Field label="Exact hours" htmlFor="hours-input" hint={`${MIN_HOURS}–${MAX_HOURS} hours`}>
            <NumberInput
              id="hours-input"
              min={MIN_HOURS}
              max={MAX_HOURS}
              step={1}
              value={hours}
              onChange={(event) => {
                setDraftHours(clampHours(Number(event.target.value)));
              }}
            />
          </Field>

          <div className="flex items-center gap-2">
            <Button variant="primary" size="md" onClick={runOptimise} disabled={busy}>
              <Sparkles className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden />
              {busy ? "Optimizing…" : "Optimize Plan"}
            </Button>
            {optimized && (
              <Button variant="outline" size="md" onClick={resetPlan}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p aria-live="polite" className="sr-only">
        {busy ? "Optimizing the plan." : announce}
      </p>

      <section aria-label={`${optimized ? "Optimized" : "Current"} plan summary`} aria-busy={busy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={optimized ? "Optimized profit" : "Current profit"}
            value={plan.totalProfit}
            format={(value) => money(value)}
            icon={Wallet}
            sparklineColor={CHART.teal}
            caption={`${integer(plan.units)} of ${integer(data.totals.forecastUnits)} forecast units`}
          />
          <KpiCard
            title="Hours needed for all demand"
            value={data.hoursNeededAll}
            format={(value) => `${number(value)} h`}
            icon={Clock}
            sparklineColor={CHART.primary}
            caption={`${number(data.hoursAvailable)} h available`}
          />
          <KpiCard
            title="Machine hours used"
            value={plan.hoursUsed}
            format={(value) => `${number(value)} h`}
            icon={Gauge}
            sparklineColor={CHART.aqua}
            caption={`${number(
              Math.max(0, Math.round((data.hoursAvailable - plan.hoursUsed) * 100) / 100),
            )} h left over`}
          />
          <KpiCard
            title="Gain vs current plan"
            value={optimized ? data.gainPesos : "—"}
            format={(value) => `${value >= 0 ? "+" : ""}${money(value)}`}
            icon={TrendingUp}
            sparklineColor={CHART.purple}
            trend={optimized ? (data.gainPesos > 0 ? "up" : "neutral") : "neutral"}
            caption={
              optimized
                ? `${data.gainPesos >= 0 ? "+" : ""}${percent(data.gainPct, 2)} over today's mix`
                : "Run Optimize Plan to see the gain"
              }
          />
        </div>
      </section>

      <Card
        className={cn(
          "transition-colors",
          optimized && "bg-primary/[0.03] dark:bg-aqua/[0.05]",
        )}
      >
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl",
                optimized
                  ? "bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              )}
              aria-hidden
            >
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-sm font-medium text-slate-900 dark:text-white">
                {optimized ? "Optimized plan" : "Current plan"}
              </p>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {optimized
                  ? data.recommendation
                  : `Today the shop spreads the same ${percent(
                      data.currentPlan.percent,
                      1,
                    )} of every forecast across all four services. Optimize the plan to see what profit per machine hour buys.`}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Badge variant="secondary">
              {optimized ? "Ranked by profit per hour" : "A little of everything"}
            </Badge>
            <Badge variant={constrained ? "warning" : "success"} dot>
              {number(data.hoursAvailable)} h available
            </Badge>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={optimized ? "Forecast demand vs optimized plan" : "Forecast demand vs current plan"}
          subtitle="Units per service — the plan never exceeds the forecast"
          className="lg:col-span-2"
          hover
        >
          {chartData.length === 0 ? (
            <EmptyPanel title="No services to plan" description="Add services and orders first." />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
                  <XAxis
                    dataKey="service"
                    stroke={AXIS.stroke}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval={0}
                  />
                  <YAxis
                    stroke={AXIS.stroke}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={48}
                    tickFormatter={(value: number) => integer(value)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    {...TOOLTIP_ANIM}
                    cursor={{ fill: "var(--chart-grid)" }}
                    formatter={(value, name) => [
                      `${integer(Number(value))} units`,
                      String(name),
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="forecast"
                    name="Forecast"
                    fill={CHART_SERIES[1]}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                    isAnimationActive
                    {...CHART_ANIM}
                  />
                  <Bar
                    dataKey="units"
                    name={optimized ? "Optimized plan" : "Current plan"}
                    fill={CHART.primary}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                    isAnimationActive
                    {...CHART_ANIM}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle subtitle="What each machine hour earns by service">
              Profit per hour
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-surface-muted/60 p-3.5 dark:bg-elevated-dark/50">
                <p className="text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase">
                  Current plan
                </p>
                <p className="mt-1 font-display text-lg font-medium text-slate-900 tabular-nums dark:text-white">
                  <Money>{money(data.totals.currentProfit, { compact: true })}</Money>
                </p>
                <p className="text-[11px] text-slate-400">
                  {percent(data.currentPlan.percent, 1)} of demand covered
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl p-3.5",
                  optimized ? "bg-success/10 dark:bg-success/15" : "bg-surface-muted/60 dark:bg-elevated-dark/50",
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-medium tracking-[0.1em] uppercase",
                    optimized ? "text-success dark:text-success-light" : "text-slate-400",
                  )}
                >
                  Optimized plan
                </p>
                <p className="mt-1 font-display text-lg font-medium text-slate-900 tabular-nums dark:text-white">
                  {optimized ? <Money>{money(data.totals.optimizedProfit, { compact: true })}</Money> : "—"}
                </p>
                <p
                  className={cn(
                    "text-[11px]",
                    optimized ? "text-success dark:text-success-light" : "text-slate-400",
                  )}
                >
                  {optimized ? `+${money(data.gainPesos)} profit` : "Not yet run"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[...data.optimizedPlan.rows]
                .sort((a, b) => b.profitPerHour - a.profitPerHour)
                .map((row) => (
                  <ProgressRow
                    key={row.serviceId}
                    label={row.service}
                    value={`${money(row.profitPerHour)} / h`}
                    percent={(row.profitPerHour / maxProfitPerHour) * 100}
                    tone={row.units > 0 ? "primary" : "neutral"}
                    hint={`${integer(row.units)} of ${integer(row.forecast)} ${row.unitLabel} in the ${
                      optimized ? "optimized" : "current"
                    } plan`}
                  />
                ))}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              Hours go to the highest profit per machine hour first, capped by each service's
              forecast.{updating && " Recalculating…"}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader
          action={
            <Chip tone={optimized ? "success" : "neutral"}>
              {optimized ? "Ranked by profit per hour" : "Today's mix"}
            </Chip>
          }
        >
          <CardTitle subtitle="Order, units, hours and profit for the plan shown above">
            {optimized ? "Optimized processing plan" : "Current processing plan"}
          </CardTitle>
        </CardHeader>
        <PlanTable rows={plan.rows} optimized={optimized} />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/predictive">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to predictive
          </Button>
        </Link>
        <Badge variant="secondary">
          <Gauge className="h-3 w-3" aria-hidden /> Plan refreshes with the hours input
        </Badge>
      </div>
    </div>
  );
}
