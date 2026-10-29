import type { BranchMonthlyDemand } from "../../types";
import type { MonthPoint } from "../metrics";

export type ForecastMetric = "orders" | "revenue";
export type ForecastMethod = "moving-average" | "linear-trend";
export type Confidence = "High" | "Moderate" | "Low";

export interface ForecastPoint {
  key: string;
  month: string;
  actual: number | null;
  forecast: number | null;
  isForecast: boolean;
}

export interface BusinessForecast {
  metric: ForecastMetric;
  sufficient: boolean;
  historyMonths: number;
  method: ForecastMethod | null;
  methodLabel: string;
  confidence: Confidence | null;
  errorPct: number | null;
  lastActual: number | null;
  nextValue: number | null;
  nextChangePct: number | null;
  horizonTotal: number | null;
  horizonMonths: number;
  trendDirection: "up" | "down" | "flat" | null;
  points: ForecastPoint[];
}

export const MIN_HISTORY_MONTHS = 12;
export const FORECAST_HORIZON = 3;

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const meanX = (n - 1) / 2;
  const meanY = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - meanX) * (values[i] - meanY);
    denominator += (i - meanX) ** 2;
  }
  const slope = denominator ? numerator / denominator : 0;
  return { slope, intercept: meanY - slope * meanX };
}

/** One-step-ahead predictions from a 3-month rolling average. */
function rollingAveragePredictions(values: number[], start: number): number[] {
  const predictions: number[] = [];
  for (let i = start; i < values.length; i++) {
    predictions.push(mean(values.slice(Math.max(0, i - 3), i)));
  }
  return predictions;
}

function linearPredictions(values: number[], start: number): number[] {
  const { slope, intercept } = linearFit(values.slice(0, start));
  return values.slice(start).map((_, i) => intercept + slope * (start + i));
}

function futureMovingAverage(values: number[], steps: number): number[] {
  const history = [...values];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const value = mean(history.slice(-3));
    out.push(value);
    history.push(value);
  }
  return out;
}

function futureLinear(values: number[], steps: number): number[] {
  const { slope, intercept } = linearFit(values);
  return Array.from({ length: steps }, (_, i) => intercept + slope * (values.length + i));
}

function nextMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function labelFor(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_LABELS[month - 1].slice(0, 3)} '${String(year).slice(2)}`;
}

/**
 * Forecasts a monthly metric from real history. A 3-month hold-out period
 * chooses between a recent-average and a trend-based approach, and the
 * hold-out error sets the confidence label. Returns a "not sufficient" result
 * when there is less than a year of monthly history.
 */
export function forecastMonthly(
  series: MonthPoint[],
  metric: ForecastMetric,
  horizon = FORECAST_HORIZON,
): BusinessForecast {
  const history = series.slice(-12);
  const base: BusinessForecast = {
    metric,
    sufficient: false,
    historyMonths: series.length,
    method: null,
    methodLabel: "",
    confidence: null,
    errorPct: null,
    lastActual: null,
    nextValue: null,
    nextChangePct: null,
    horizonTotal: null,
    horizonMonths: horizon,
    trendDirection: null,
    points: history.map((p) => ({
      key: p.key,
      month: p.month,
      actual: p[metric],
      forecast: null,
      isForecast: false,
    })),
  };

  if (series.length < MIN_HISTORY_MONTHS) return base;

  const values = series.map((p) => p[metric]);
  const holdout = 3;
  const split = values.length - holdout;

  const averagePreds = rollingAveragePredictions(values, split);
  const trendPreds = linearPredictions(values, split);
  const actualHoldout = values.slice(split);

  const averageError = mean(
    actualHoldout.map((v, i) => Math.abs(v - averagePreds[i])),
  );
  const trendError = mean(
    actualHoldout.map((v, i) => Math.abs(v - trendPreds[i])),
  );

  const method: ForecastMethod =
    trendError < averageError ? "linear-trend" : "moving-average";
  const holdoutMean = Math.abs(mean(actualHoldout));
  const errorPct = holdoutMean ? (Math.min(averageError, trendError) / holdoutMean) * 100 : null;
  const confidence: Confidence =
    errorPct === null ? "Low" : errorPct <= 8 ? "High" : errorPct <= 15 ? "Moderate" : "Low";

  const futureRaw =
    method === "linear-trend"
      ? futureLinear(values, horizon)
      : futureMovingAverage(values, horizon);
  const future = futureRaw.map((v) => Math.max(0, Math.round(v)));

  const lastActual = values[values.length - 1];
  const nextValue = future[0] ?? null;
  // Compare against the recent 3-month average rather than a single noisy month.
  const recentBaseline = mean(values.slice(-3));
  const nextChangePct =
    recentBaseline && nextValue !== null
      ? ((nextValue - recentBaseline) / recentBaseline) * 100
      : null;
  const horizonTotal = future.reduce((s, v) => s + v, 0);
  const trendDirection: BusinessForecast["trendDirection"] =
    nextChangePct === null
      ? null
      : nextChangePct > 2
        ? "up"
        : nextChangePct < -2
          ? "down"
          : "flat";

  const points: ForecastPoint[] = history.map((p, i) => ({
    key: p.key,
    month: p.month,
    actual: p[metric],
    forecast: i === history.length - 1 ? p[metric] : null,
    isForecast: false,
  }));

  let key = history[history.length - 1].key;
  for (let i = 0; i < future.length; i++) {
    key = nextMonthKey(key);
    points.push({
      key,
      month: labelFor(key),
      actual: null,
      forecast: future[i],
      isForecast: true,
    });
  }

  return {
    metric,
    sufficient: true,
    historyMonths: series.length,
    method,
    methodLabel:
      method === "linear-trend" ? "Trend-based estimate" : "Recent-average estimate",
    confidence,
    errorPct,
    lastActual,
    nextValue,
    nextChangePct,
    horizonTotal,
    horizonMonths: horizon,
    trendDirection,
    points,
  };
}

export interface BranchWorkloadForecast {
  branch: string;
  recentAvg: number;
  lastMonth: number;
  forecastLoads: number;
  changePct: number;
  direction: "up" | "down" | "flat";
}

/**
 * Expected laundry load volume next month per branch, projected from the last
 * six months of recorded loads.
 */
export function forecastBranchWorkloads(
  demand: BranchMonthlyDemand[],
): BranchWorkloadForecast[] {
  const byBranch = new Map<string, number[]>();
  for (const row of demand) {
    const loads = byBranch.get(row.branch) ?? [];
    loads[row.monthNo - 1] = row.loads;
    byBranch.set(row.branch, loads);
  }

  const out: BranchWorkloadForecast[] = [];
  for (const [branch, loads] of byBranch) {
    const values = loads.filter((v) => typeof v === "number");
    if (values.length < 4) continue;

    const window = values.slice(-6);
    const { slope, intercept } = linearFit(window);
    const lastMonth = window[window.length - 1];
    const projection = Math.max(0, Math.round(intercept + slope * window.length));
    const changePct = lastMonth ? ((projection - lastMonth) / lastMonth) * 100 : 0;

    out.push({
      branch,
      recentAvg: Math.round(mean(window)),
      lastMonth,
      forecastLoads: projection,
      changePct,
      direction: changePct > 3 ? "up" : changePct < -3 ? "down" : "flat",
    });
  }

  return out.sort((a, b) => b.forecastLoads - a.forecastLoads);
}

export interface SeasonPeak {
  monthIndex: number;
  label: string;
  average: number;
  samples: number;
}

/**
 * Average order volume by calendar month. Only meaningful with at least two
 * years of history; returns [] otherwise.
 */
export function seasonalPeaks(series: MonthPoint[]): SeasonPeak[] {
  const years = new Set(series.map((p) => p.key.slice(0, 4))).size;
  if (years < 2) return [];

  const buckets = new Map<number, number[]>();
  for (const p of series) {
    const monthIndex = Number(p.key.slice(5, 7)) - 1;
    const bucket = buckets.get(monthIndex) ?? [];
    bucket.push(p.orders);
    buckets.set(monthIndex, bucket);
  }

  return [...buckets.entries()]
    .filter(([, values]) => values.length >= 2)
    .map(([monthIndex, values]) => ({
      monthIndex,
      label: MONTH_LABELS[monthIndex],
      average: mean(values),
      samples: values.length,
    }))
    .sort((a, b) => b.average - a.average);
}
