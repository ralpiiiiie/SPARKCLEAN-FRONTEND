import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Layers,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Chip, SegmentedControl } from "../components/ui/Bento";
import { Tabs } from "../components/ui/Tabs";
import { ChartCard } from "../components/charts/ChartCard";
import { EmptyPanel, PanelError, PanelLoading } from "../components/ui/PanelState";
import {
  AXIS,
  CHART_ANIM,
  CHART_SERIES,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../components/charts/palette";
import {
  GRID,
  LINE_WIDTH,
  endDot,
  hoverDot,
} from "../components/charts/lineStyle";
import { FitResidualChart, GrowthIndexChart } from "../components/charts/ForecastCharts";
import {
  FORECAST_HORIZONS,
  HORIZON_ABBREV,
  HORIZON_LABELS,
  HORIZON_UNITS,
  MODEL_LABELS,
} from "../lib/forecast";
import { useApiResource } from "../hooks/useApiResource";
import { getForecast } from "../services/api";
import { useForecastStore } from "../store/forecast";
import type {
  ForecastHorizon,
  ForecastModel,
  ForecastPayload,
  ForecastServiceRow,
} from "../types";
import { cn } from "../lib/utils";
import { integer, percent, periodLabel } from "../lib/format";

const MODELS: ForecastModel[] = ["moving_average", "exp_smoothing", "linear"];

/** One dash pattern per model, so colour never has to carry the difference alone. */
const MODEL_DASH: Record<ForecastModel, string> = {
  linear: "6 3",
  moving_average: "2 3",
  exp_smoothing: "10 3",
};

const MODEL_STROKE: Record<ForecastModel, string> = {
  moving_average: CHART_SERIES[1],
  exp_smoothing: CHART_SERIES[2],
  linear: CHART_SERIES[0],
};

const ALL_TAB = "all";

const round1 = (value: number) => Math.round(value * 100) / 100;

/** Plural of the active horizon's period, for chips and table headers. */
const periodMany = (horizon: ForecastHorizon) =>
  horizon === "days15" ? "15-day spans" : `${HORIZON_UNITS[horizon]}s`;

/** Screen-reader reading for the supporting charts. */
function ChartSums({ children }: { children: ReactNode }) {
  return <p className="sr-only">{children}</p>;
}

type LayerId = "actual" | "fit" | "forecast" | "band";

const LAYERS: Array<{ id: LayerId; label: string }> = [
  { id: "actual", label: "Actual" },
  { id: "fit", label: "Model fit" },
  { id: "forecast", label: "Forecast" },
  { id: "band", label: "Band" },
];

/** The primary model plus the two extra fits loaded only while comparing. */
interface PredictiveData {
  primary: ForecastPayload;
  others: Partial<Record<ForecastModel, ForecastPayload>>;
}

interface ChartRow {
  label: string;
  isForecast: boolean;
  actual: number | null;
  fit: number | null;
  forecast: number | null;
  range?: [number, number];
  fits: Partial<Record<ForecastModel, number | null>>;
  forecasts: Partial<Record<ForecastModel, number>>;
}

/** The recorded periods plus the forecast one, ready for one composed chart. */
function buildRows(
  service: ForecastServiceRow,
  data: PredictiveData,
  seriesIndex: number,
): ChartRow[] {
  const { primary } = data;
  const last = service.points.length - 1;
  const label = (value: string) => periodLabel(primary.horizon, value);
  const fitsByModel: Partial<Record<ForecastModel, Array<number | null>>> = {
    [primary.model]: service.fitted,
  };
  const forecastsByModel: Partial<Record<ForecastModel, number>> = {
    [primary.model]: service.forecast,
  };
  for (const model of MODELS) {
    const payload = data.others[model];
    if (!payload || model === primary.model) continue;
    const row = payload.services[seriesIndex];
    if (row) {
      fitsByModel[model] = row.fitted;
      forecastsByModel[model] = row.forecast;
    }
  }

  const rows: ChartRow[] = service.points.map((units, index) => {
    const point = service.band[index];
    const fits: Partial<Record<ForecastModel, number | null>> = {};
    for (const model of MODELS) fits[model] = fitsByModel[model]?.[index] ?? null;
    return {
      label: label(primary.periods[index] ?? `P${index + 1}`),
      isForecast: false,
      actual: units,
      fit: point?.fitted ?? null,
      // The dashed forecast segment has to start on the last recorded point.
      forecast: index === last ? units : null,
      range: point && point.fitted !== null ? [point.low, point.high] : undefined,
      fits,
      forecasts: {},
    };
  });

  const nextPoint = service.band[service.points.length];
  rows.push({
    label: label(primary.nextPeriod),
    isForecast: true,
    actual: null,
    fit: null,
    forecast: service.forecast,
    range: nextPoint ? [nextPoint.low, nextPoint.high] : undefined,
    fits: Object.fromEntries(
      MODELS.map((model) => [
        model,
        model === primary.model ? service.forecast : (fitsByModel[model]?.[last] ?? null),
      ]),
    ),
    forecasts: forecastsByModel,
  });
  return rows;
}

/** Short dashed swatch used by the compare legend and the accuracy list. */
function Dash({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="18" height="6" viewBox="0 0 18 6" className="flex-shrink-0" aria-hidden>
      <line
        x1="1"
        y1="3"
        x2="17"
        y2="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  );
}

function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 w-64 max-w-[80vw] -translate-x-1/2 rounded-2xl bg-slate-900 px-3.5 py-2.5 text-[11px] leading-relaxed font-normal text-white opacity-0 shadow-[var(--shadow-float)] transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-elevated-dark dark:ring-1 dark:ring-border-dark"
      >
        {children}
      </span>
    </span>
  );
}

interface TipEntry {
  payload?: ChartRow;
}

function ForecastTip({
  active,
  payload,
  unitLabel,
  mad,
  modelLabel,
}: {
  active?: boolean;
  payload?: TipEntry[];
  unitLabel: string;
  mad: number;
  modelLabel: string;
}) {
  if (!active) return null;
  const row = payload?.[0]?.payload;
  if (!row) return null;
  const error =
    row.actual !== null && row.fit !== null ? Math.round((row.actual - row.fit) * 100) / 100 : null;

  return (
    <div style={tooltipStyle} className="rounded-xl px-3 py-2">
      <p className="text-[11px] font-medium tracking-[0.08em] uppercase opacity-70">
        {row.label}
        {row.isForecast ? ` · ${modelLabel}` : ""}
      </p>
      {row.isForecast ? (
        <>
          <p className="mt-1 text-sm font-medium tabular-nums">
            {integer(row.forecast ?? 0)} {unitLabel}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums opacity-70">
            ±{integer(mad)} → {integer(row.range?.[0] ?? 0)}–{integer(row.range?.[1] ?? 0)} {unitLabel}
          </p>
        </>
      ) : (
        <dl className="mt-1 space-y-0.5 text-[11px] tabular-nums">
          <div className="flex justify-between gap-4">
            <dt className="opacity-70">Actual</dt>
            <dd className="font-medium">
              {row.actual === null ? "—" : `${integer(row.actual)} ${unitLabel}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-70">Model fit</dt>
            <dd>{row.fit === null ? "—" : integer(row.fit)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-70">Error</dt>
            <dd>{error === null ? "—" : `${error > 0 ? "+" : ""}${error}`}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-70">Range</dt>
            <dd>{row.range ? `${integer(row.range[0])}–${integer(row.range[1])}` : "—"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** Actual line, model fit, dashed forecast segment and optional ±MAD band. */
function DemandChart({
  gradientId,
  rows,
  service,
  unitLabel,
  periodUnit,
  modelLabel,
  nextLabel,
  layers,
  compare,
  color,
  animate,
  compact = false,
}: {
  gradientId: string;
  rows: ChartRow[];
  service: ForecastServiceRow;
  unitLabel: string;
  periodUnit: string;
  modelLabel: string;
  nextLabel: string;
  layers: Record<LayerId, boolean>;
  compare: boolean;
  color: string;
  animate: boolean;
  compact?: boolean;
}) {
  const animation = animate
    ? { isAnimationActive: true, ...CHART_ANIM }
    : { isAnimationActive: false };
  const showBand = layers.band && !compare;
  const forecast = service.forecast;
  // The history line keeps a single marker where it stops, so the eye can find
  // the boundary with the forecast segment.
  const lastActualIndex = rows.reduce(
    (last, row, index) => (row.actual === null || row.actual === undefined ? last : index),
    -1,
  );

  return (
    <div className={cn("w-full", compact ? "h-[220px]" : "h-[260px] sm:h-[320px]")}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: compact ? 12 : 20, right: 16, bottom: 0, left: compact ? -18 : -8 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="label"
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={compact ? 10 : 11}
            minTickGap={compact ? 12 : 6}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={compact ? 10 : 11}
            width={compact ? 40 : 56}
            tickFormatter={(value: number) => integer(value)}
            label={
              compact
                ? undefined
                : {
                    value: `${unitLabel} per ${periodUnit}`,
                    angle: -90,
                    position: "insideLeft",
                    offset: 16,
                    style: { fontSize: 11, fill: AXIS.stroke, textAnchor: "middle" },
                  }
            }
          />
          <Tooltip
            {...TOOLTIP_ANIM}
            cursor={{ stroke: AXIS.stroke, strokeDasharray: "3 3" }}
            content={(props) => (
              <ForecastTip
                active={props.active}
                payload={props.payload as unknown as TipEntry[] | undefined}
                unitLabel={unitLabel}
                mad={service.mad}
                modelLabel={modelLabel}
              />
            )}
          />

          {showBand && (
            <Area
              dataKey="range"
              stroke="none"
              fill={color}
              fillOpacity={0.13}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
              activeDot={false}
            />
          )}

          {layers.actual && (
            <Area
              dataKey="actual"
              type="monotone"
              stroke={color}
              strokeWidth={compact ? 2 : LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#${gradientId})`}
              dot={compact ? false : endDot(color, lastActualIndex)}
              activeDot={hoverDot(color)}
              connectNulls={false}
              legendType="none"
              {...animation}
            />
          )}

          {compare
            ? MODELS.map((model) => (
                <Line
                  key={model}
                  type="monotone"
                  dataKey={(row: ChartRow) => row.fits[model] ?? null}
                  stroke={MODEL_STROKE[model]}
                  strokeWidth={1.8}
                  strokeDasharray={MODEL_DASH[model]}
                  dot={compact ? false : { r: 2, strokeWidth: 0, fill: MODEL_STROKE[model] }}
                  connectNulls
                  legendType="none"
                  {...animation}
                />
              ))
            : layers.fit && (
                <Line
                  type="monotone"
                  dataKey="fit"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeDasharray="2 3"
                  strokeOpacity={0.7}
                  dot={false}
                  connectNulls
                  legendType="none"
                  {...animation}
                />
              )}

          {layers.forecast && !compare && (
            <Line
              type="linear"
              dataKey="forecast"
              stroke={color}
              strokeWidth={2.2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              legendType="none"
              {...animation}
            />
          )}

          <ReferenceLine
            x={nextLabel}
            stroke={AXIS.stroke}
            strokeDasharray="4 4"
            strokeOpacity={0.55}
            label={
              compact
                ? undefined
                : {
                    // The forecast period is the last category, so the label is
                    // right-aligned to the divider to keep it inside the plot.
                    value: "Forecast",
                    position: "insideTopRight",
                    fill: AXIS.stroke,
                    fontSize: 10,
                  }
            }
          />

          {layers.forecast &&
            (compare ? (
              MODELS.map((model) => {
                const value = rows[rows.length - 1]?.forecasts[model];
                if (value === undefined) return null;
                return (
                  <ReferenceDot
                    key={model}
                    x={nextLabel}
                    y={value}
                    r={compact ? 3 : 4}
                    fill={MODEL_STROKE[model]}
                    stroke="none"
                  />
                );
              })
            ) : (
              <ReferenceDot
                x={nextLabel}
                y={forecast}
                r={compact ? 3.5 : 5}
                fill={color}
                stroke="none"
                label={
                  compact
                    ? undefined
                    : {
                        value: `${integer(forecast)}`,
                        position: "top",
                        fill: AXIS.stroke,
                        fontSize: 12,
                      }
                }
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function modelDetail(
  service: ForecastServiceRow,
  model: ForecastModel,
  window: number,
  alpha: number,
  periodAbbrev: string,
): string {
  if (model === "moving_average") return `Window ${window}`;
  if (model === "exp_smoothing") return `Alpha ${alpha.toFixed(1)}`;
  return `${service.slope >= 0 ? "+" : ""}${service.slope.toFixed(1)} / ${periodAbbrev}, R² ${service.r2.toFixed(2)}`;
}

export function PredictiveAnalytics() {
  const model = useForecastStore((state) => state.model);
  const windowSize = useForecastStore((state) => state.window);
  const alpha = useForecastStore((state) => state.alpha);
  const horizon = useForecastStore((state) => state.horizon);
  const setModel = useForecastStore((state) => state.setModel);
  const setWindow = useForecastStore((state) => state.setWindow);
  const setAlpha = useForecastStore((state) => state.setAlpha);
  const setHorizon = useForecastStore((state) => state.setHorizon);

  const [tab, setTab] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({
    actual: true,
    fit: true,
    forecast: true,
    band: false,
  });
  const [compare, setCompare] = useState(false);
  const reduced = useReducedMotion();
  const animate = !reduced;

  const { data, status, error, reload } = useApiResource<PredictiveData>(
    async () => {
      const primary = await getForecast({ model, window: windowSize, alpha, horizon });
      if (!compare) return { primary, others: {} };
      const extras = await Promise.all(
        MODELS.filter((entry) => entry !== model).map(
          async (entry) =>
            [
              entry,
              await getForecast({ model: entry, window: windowSize, alpha, horizon }),
            ] as const,
        ),
      );
      return { primary, others: Object.fromEntries(extras) };
    },
    [model, windowSize, alpha, horizon, compare],
  );

  if (status === "loading" && !data) return <PanelLoading label="Fitting the demand models…" />;
  if (status === "error" || !data) {
    return (
      <PanelError message={error ?? "Predictive analytics could not be loaded."} onRetry={reload} />
    );
  }

  const { primary } = data;
  const services = primary.services;
  const totalForecast = services.reduce((sum, service) => sum + service.forecast, 0);
  // Stage 3 is a monthly plan whatever this page is showing.
  const totalMonthForecast = services.reduce((sum, service) => sum + service.monthForecast, 0);
  const nextLabel = periodLabel(primary.horizon, primary.nextPeriod);
  // One word for the recorded bucket, singular and plural, so every caption
  // names the horizon the models were actually fitted on.
  const periodOne = HORIZON_UNITS[primary.horizon];
  const periods = periodMany(primary.horizon);
  const periodAbbrev = HORIZON_ABBREV[primary.horizon];
  const historyCount = primary.periods.length;
  // Weeks are the finest thing the books record, so the 15-day view is the
  // weekly series rescaled rather than a separate set of numbers.
  const horizonNote =
    primary.horizon === "month"
      ? `Fitted on ${historyCount} recorded months; the forecast covers ${primary.nextPeriod}.`
      : primary.horizon === "week"
        ? `Fitted on ${historyCount} recorded weeks; the forecast covers ${primary.nextPeriod}, the week after the record.`
        : `Fitted on ${historyCount} recorded weeks rescaled to 15-day spans; the forecast covers the next 15 days.`;
  const activeId = tab ?? services[0]?.id ?? ALL_TAB;
  const selectedIndex = Math.max(0, services.findIndex((service) => service.id === activeId));
  const selected = activeId === ALL_TAB ? undefined : services[selectedIndex];
  const bandDisabled = compare || !selected;
  // The residual chart always reads one service, so "All services" falls back
  // to the first one rather than leaving the card empty.
  const residualService = selected ?? services[0];
  const maxModelMad = Math.max(0, ...primary.modelComparison.map((entry) => entry.totalMad));

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Stage 2 · What demand comes next?"
        title="Predictive Analytics"
        description={`Pick a demand model and a horizon, check its fit against ${historyCount} recorded ${periods}, then carry the forecast into the machine-hour plan.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning" dot>
              {primary.horizon === "month"
                ? `${primary.nextPeriod} forecast`
                : `${HORIZON_LABELS[primary.horizon]} forecast`}
            </Badge>
            <Chip tone="neutral" icon={SlidersHorizontal}>
              {MODEL_LABELS[model]}
              {model === "moving_average" ? ` · window ${windowSize}` : ""}
              {model === "exp_smoothing" ? ` · alpha ${alpha.toFixed(1)}` : ""}
            </Chip>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="section-eyebrow">Forecast model</p>
            <SegmentedControl
              ariaLabel="Forecast model"
              value={model}
              onChange={setModel}
              options={MODELS.map((entry) => ({
                id: entry,
                label: (
                  <span className="flex items-center gap-1.5">
                    {MODEL_LABELS[entry]}
                    {primary.bestFit === entry && (
                      <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success-dark dark:bg-success/15 dark:text-success-light">
                        Best fit
                      </span>
                    )}
                  </span>
                ),
              }))}
            />
            <InfoTip label="Why Moving Average and Exponential Smoothing forecast lower">
              Both models only look backwards, so on a rising series they trail the trend: Moving
              Average sits at the mean of the last {windowSize} {periods} and Exponential Smoothing
              at a weighted average of all of them. Linear Trend extends the upward slope instead,
              which is why its {primary.nextPeriod} estimate is the highest.
            </InfoTip>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="section-eyebrow">Forecast horizon</p>
            <SegmentedControl<ForecastHorizon>
              ariaLabel="Forecast horizon"
              value={horizon}
              onChange={setHorizon}
              size="sm"
              options={FORECAST_HORIZONS.map((entry) => ({
                id: entry,
                label: HORIZON_LABELS[entry],
              }))}
            />
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {horizonNote}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {model === "moving_average" && (
              <label className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="whitespace-nowrap">Window</span>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={1}
                  value={windowSize}
                  onChange={(event) => setWindow(Number(event.target.value))}
                  aria-label={`Moving average window in ${periods}`}
                  className="focus-ring h-2 w-40 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-primary)] dark:bg-slate-700"
                />
                <span className="w-16 font-display text-sm font-medium text-slate-900 tabular-nums dark:text-white">
                  {windowSize} {periodAbbrev}
                </span>
              </label>
            )}
            {model === "exp_smoothing" && (
              <label className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="whitespace-nowrap">Alpha</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.1}
                  value={alpha}
                  onChange={(event) => setAlpha(Number(event.target.value))}
                  aria-label="Exponential smoothing alpha"
                  className="focus-ring h-2 w-40 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--color-primary)] dark:bg-slate-700"
                />
                <span className="w-8 font-display text-sm font-medium text-slate-900 tabular-nums dark:text-white">
                  {alpha.toFixed(1)}
                </span>
              </label>
            )}

            <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
              <span className="mr-1 flex items-center gap-1 text-[11px] font-medium tracking-[0.08em] text-slate-400 uppercase">
                <Layers className="h-3.5 w-3.5" aria-hidden /> Layers
              </span>
              {LAYERS.map((entry) => {
                const disabled = entry.id === "band" && bandDisabled;
                const on = layers[entry.id] && !disabled;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    title={
                      disabled
                        ? compare
                          ? "The error band hides while comparing models."
                          : "The error band shows for one service at a time."
                        : undefined
                    }
                    onClick={() =>
                      setLayers((state) => ({ ...state, [entry.id]: !state[entry.id] }))
                    }
                    className={cn(
                      "focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      on
                        ? "bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua"
                        : "bg-slate-100 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {entry.label}
                  </button>
                );
              })}
              <label className="ml-2 flex cursor-pointer items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Compare all three models"
                  checked={compare}
                  onChange={(event) => setCompare(event.target.checked)}
                  className="focus-ring h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
                />
                Compare models
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {services.length > 0 && (
        <Tabs
          ariaLabel="Service shown in the forecast chart"
          value={activeId}
          onChange={setTab}
          tabs={[
            ...services.map((service) => ({ id: service.id, label: service.name })),
            { id: ALL_TAB, label: "All services" },
          ]}
        />
      )}

      {services.length === 0 ? (
        <ChartCard title="Demand history and forecast">
          <EmptyPanel
            title="No service history"
            description="Add services and orders in Data Explorer to fit a forecast."
          />
        </ChartCard>
      ) : selected ? (
        <ChartCard
          title={`${selected.name} · ${MODEL_LABELS[model]}`}
          subtitle={`Recorded ${selected.unitLabel} per ${periodOne}, the fitted line, and the ${primary.nextPeriod} estimate ± the model's average error`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="neutral">MAD ±{integer(selected.mad)}</Chip>
              {primary.bestFit === model && (
                <Badge variant="success" dot>
                  Best fit
                </Badge>
              )}
            </div>
          }
          hover
        >
          <DemandChart
            gradientId={`forecast-fill-${selected.id}`}
            rows={buildRows(selected, data, selectedIndex)}
            service={selected}
            unitLabel={selected.unitLabel}
            periodUnit={periodOne}
            modelLabel={MODEL_LABELS[model]}
            nextLabel={nextLabel}
            layers={layers}
            compare={compare}
            color={CHART_SERIES[selectedIndex % CHART_SERIES.length]}
            animate={animate}
          />
          {compare && (
            <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              {MODELS.map((entry) => {
                const value =
                  entry === model
                    ? selected.forecast
                    : data.others[entry]?.services[selectedIndex]?.forecast;
                return (
                  <li key={entry} className="flex items-center gap-1.5">
                    <Dash color={MODEL_STROKE[entry]} dash={MODEL_DASH[entry]} />
                    {MODEL_LABELS[entry]}
                    <span className="text-slate-400 tabular-nums dark:text-slate-500">
                      → {value === undefined ? "—" : integer(value)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="sr-only">
            {`Chart for ${selected.name}. ${historyCount} ${periods} from ${periodLabel(
              primary.horizon,
              primary.periods[0],
            )} to ${periodLabel(primary.horizon, primary.periods[historyCount - 1])}; actual units ${selected.points
              .map((units) => round1(units))
              .join(", ")}. ${MODEL_LABELS[model]} fitted line with a mean absolute deviation of ${
              selected.mad
            } units. Forecast for ${primary.nextPeriod}: ${selected.forecast} ${
              selected.unitLabel
            }, plausible range ${selected.band[historyCount]?.low ?? 0} to ${
              selected.band[historyCount]?.high ?? 0
            }.`}
          </p>
        </ChartCard>
      ) : (
        <ChartCard
          title={`${MODEL_LABELS[model]} against recorded demand`}
          subtitle={`Actual ${periods} and the ${primary.nextPeriod} estimate, one axis per service`}
          action={<Chip tone="neutral">{services.length} services</Chip>}
          hover
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((service, index) => (
              <div key={service.id}>
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {service.name}
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                    → {integer(service.forecast)} {service.unitLabel}
                  </p>
                </div>
                <DemandChart
                  gradientId={`forecast-fill-all-${service.id}`}
                  rows={buildRows(service, data, index)}
                  service={service}
                  unitLabel={service.unitLabel}
                  periodUnit={periodOne}
                  modelLabel={MODEL_LABELS[model]}
                  nextLabel={nextLabel}
                  layers={layers}
                  compare={compare}
                  color={CHART_SERIES[index % CHART_SERIES.length]}
                  animate={animate}
                  compact
                />
              </div>
            ))}
          </div>
          <p className="sr-only">
            {services
              .map(
                (service) =>
                  `${service.name}: last ${periodOne} ${integer(service.lastPoint)} units, ${
                    MODEL_LABELS[model]
                  } forecast ${integer(service.forecast)} ${service.unitLabel} for ${primary.nextPeriod}.`,
              )
              .join(" ")}
          </p>
        </ChartCard>
      )}

      {services.length > 0 && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Growth, indexed to the first period"
            subtitle="Each service starts at 100, so kg, items, pieces and loads can finally share an axis"
            action={
              <Chip tone="neutral" icon={TrendingUp}>
                {services.length} series
              </Chip>
            }
            hover
          >
            <GrowthIndexChart data={primary} animate={animate} />
            <ChartSums>
              {`Indexed demand, first recorded ${periodOne} = 100. ${services
                .map((service) => {
                  const base = service.points[0] || 1;
                  return `${service.name} runs from ${round1(
                    (service.points[0] / base) * 100,
                  )} to ${round1(
                    (service.lastPoint / base) * 100,
                  )}, with the ${primary.nextPeriod} forecast at ${round1(
                    (service.forecast / base) * 100,
                  )}`;
                })
                .join("; ")}.`}
            </ChartSums>
          </ChartCard>

          <ChartCard
            title={`Where ${MODEL_LABELS[model]} misses`}
            subtitle={
              residualService
                ? `Recorded minus fitted units for ${residualService.name} — the error the trend still leaves`
                : "The fitted line needs at least one service"
            }
            action={
              residualService ? (
                <Chip tone="neutral" icon={Target}>
                  MAD ±{residualService.mad.toFixed(2)} {residualService.unitLabel}
                </Chip>
              ) : null
            }
            hover
          >
            {residualService ? (
              <>
                <FitResidualChart
                  service={residualService}
                  data={primary}
                  animate={animate}
                />
                <ChartSums>
                  {`Error for each recorded ${periodOne} for ${residualService.name}, in ${
                    residualService.unitLabel
                  }: ${primary.periods
                    .map((period, index) => {
                      const fitted = residualService.fitted[index];
                      const actual = residualService.points[index] ?? 0;
                      return `${periodLabel(primary.horizon, period)} ${
                        fitted === null || fitted === undefined
                          ? "no fit"
                          : `${round1(actual - fitted) >= 0 ? "+" : ""}${round1(actual - fitted)}`
                      }`;
                    })
                    .join(", ")}.`}
                </ChartSums>
              </>
            ) : (
              <EmptyPanel
                title="No fitted values"
                description="Fit a model on recorded orders to see its error."
              />
            )}
          </ChartCard>
        </section>
      )}

      <Card>
        <CardHeader
          action={
            <Chip tone="neutral" icon={Target}>
              Backtest {periods} {primary.backtestFrom}–{historyCount}
            </Chip>
          }
        >
          <CardTitle
            subtitle={`Each ${periodOne} from ${periodLabel(
              primary.horizon,
              primary.periods[primary.backtestFrom - 1],
            )} on was predicted from the ${periods} before it only`}
          >
            Model detail
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted/60 text-left text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase dark:bg-elevated-dark/50 dark:text-slate-500">
                <th scope="col" className="px-6 py-2.5 font-medium">Service</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Last {periodOne}
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Avg / {periodAbbrev}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">{MODEL_LABELS[model]}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">MAD</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Forecast</th>
                <th scope="col" className="px-6 py-2.5 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-slate-100/80 last:border-0 dark:border-slate-800/70"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{service.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      measured in {service.unitLabel}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums dark:text-slate-300">
                    {integer(service.lastPoint)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                    {integer(service.average)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right tabular-nums",
                      model === "linear"
                        ? service.slope >= 0
                          ? "font-medium text-success-dark dark:text-success-light"
                          : "font-medium text-coral-hover dark:text-coral-light"
                        : "text-slate-600 dark:text-slate-300",
                    )}
                  >
                    {modelDetail(service, model, windowSize, alpha, periodAbbrev)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                    ±{service.mad.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                    {integer(service.forecast)}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-3 text-right font-medium tabular-nums",
                      service.changePct >= 0
                        ? "text-success-dark dark:text-success-light"
                        : "text-coral-hover dark:text-coral-light",
                    )}
                  >
                    {service.changePct >= 0 ? "+" : ""}
                    {percent(service.changePct)}
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No service history is available to forecast.
                  </td>
                </tr>
              )}
            </tbody>
            {services.length > 0 && (
              <tfoot>
                <tr className="bg-surface-muted/40 dark:bg-elevated-dark/40">
                  <td
                    colSpan={5}
                    className="px-6 py-3 font-medium text-slate-700 dark:text-slate-200"
                  >
                    Total forecast for {primary.nextPeriod}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                    {integer(totalForecast)}
                  </td>
                  <td className="px-6 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle
              subtitle={`${MODEL_LABELS[model]} units next month per service — the demand ceiling stage 3 plans against`}
            >
              Passes on to Prescriptive
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 pt-2">
            {services.map((service) => (
              <Chip key={service.id} tone="primary">
                {service.name} {integer(service.monthForecast)} {service.unitLabel}
              </Chip>
            ))}
            <Chip tone="neutral">{integer(totalMonthForecast)} units total</Chip>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Changing the model, window or alpha changes the hours the plan is built on, and the
              plan on the next page resets to the current way of working. The horizon only changes
              what this page shows — stage 3 always plans next month.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle subtitle="Total backtest MAD across all services">
              Model accuracy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {primary.modelComparison.map((entry) => {
              const share =
                maxModelMad > 0 ? (entry.totalMad / maxModelMad) * 100 : 0;
              return (
                <div
                  key={entry.model}
                  className="rounded-2xl bg-surface-muted/50 px-3.5 py-2.5 text-sm dark:bg-elevated-dark/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <Dash color={MODEL_STROKE[entry.model]} dash={MODEL_DASH[entry.model]} />
                      <span
                        className={cn(
                          "truncate",
                          entry.model === model
                            ? "font-medium text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300",
                        )}
                      >
                        {MODEL_LABELS[entry.model]}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-2">
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {entry.totalMad.toFixed(2)}
                      </span>
                      {entry.model === primary.bestFit && (
                        <Badge variant="success" dot>
                          Best fit
                        </Badge>
                      )}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                    role="img"
                    aria-label={`${MODEL_LABELS[entry.model]} total backtest MAD ${entry.totalMad.toFixed(
                      2,
                    )} units, ${Math.round(share)} percent of the least accurate model`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        entry.model === primary.bestFit
                          ? "bg-success"
                          : "bg-primary/70 dark:bg-aqua/70",
                      )}
                      style={{ width: `${Math.max(2, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/descriptive">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to descriptive
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Chip tone="neutral" icon={Target}>
            Forecast: {MODEL_LABELS[model]}
          </Chip>
          <Link to="/prescriptive">
            <Button variant="primary" size="sm">
              Prescriptive analytics <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
