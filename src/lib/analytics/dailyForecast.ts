import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type { Order } from "../../types";
import { dataBounds } from "../periods";
import type { Confidence } from "./forecastBusiness";

export type DailyForecastMethod = "daily-average" | "weekday-pattern";

export interface DailyForecastPoint {
  key: string;
  label: string;
  weekday: string;
  actual: number | null;
  forecast: number | null;
  isForecast: boolean;
}

export interface BusyDay {
  key: string;
  label: string;
  weekday: string;
  orders: number;
}

export interface DailyForecast {
  sufficient: boolean;
  historyDays: number;
  windowDays: number;
  horizonDays: number;
  method: DailyForecastMethod | null;
  methodLabel: string;
  confidence: Confidence | null;
  errorPct: number | null;
  expectedOrders: number;
  expectedRevenue: number;
  expectedLoads: number;
  busyDays: BusyDay[];
  points: DailyForecastPoint[];
}

const WINDOW_DAYS = 70;
const HOLDOUT_DAYS = 14;
const MIN_HISTORY_DAYS = 56;
const MIN_ORDERS = 30;
const ACTUAL_CONTEXT_DAYS = 14;

const mean = (values: number[]): number =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

const toKey = (date: Date): string => format(date, "yyyy-MM-dd");

function meanAbsoluteError(predictions: number[], actual: number[]): number {
  if (actual.length === 0) return 0;
  return mean(actual.map((v, i) => Math.abs(v - (predictions[i] ?? 0))));
}

/**
 * Short-horizon daily forecast built from the last ten weeks of recorded
 * orders. A two-week hold-out picks between a flat recent average and a
 * weekday pattern; the hold-out error drives the confidence label. Daily
 * records are sparse, so this is deliberately a directional estimate.
 */
export function forecastDaily(orders: Order[], horizonDays: number): DailyForecast {
  const bounds = dataBounds(orders);
  const maxD = parseISO(bounds.max);
  const historyDays = differenceInCalendarDays(maxD, parseISO(bounds.min)) + 1;
  const billable = orders.filter((o) => o.status !== "Cancelled");

  const base: DailyForecast = {
    sufficient: false,
    historyDays,
    windowDays: WINDOW_DAYS,
    horizonDays,
    method: null,
    methodLabel: "",
    confidence: null,
    errorPct: null,
    expectedOrders: 0,
    expectedRevenue: 0,
    expectedLoads: 0,
    busyDays: [],
    points: [],
  };

  if (historyDays < MIN_HISTORY_DAYS || billable.length < MIN_ORDERS) return base;

  const windowStart = addDays(maxD, -(WINDOW_DAYS - 1));
  const counts = new Array<number>(WINDOW_DAYS).fill(0);
  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    addDays(windowStart, i),
  );

  for (const o of billable) {
    const idx = differenceInCalendarDays(parseISO(o.orderDate.slice(0, 10)), windowStart);
    if (idx >= 0 && idx < WINDOW_DAYS) counts[idx] += 1;
  }

  const train = counts.slice(0, WINDOW_DAYS - HOLDOUT_DAYS);
  const test = counts.slice(-HOLDOUT_DAYS);
  const testStart = WINDOW_DAYS - HOLDOUT_DAYS;

  const constantBase = mean(train.slice(-28));
  const constantPreds = test.map(() => constantBase);

  const weekdaySums = new Array<number>(7).fill(0);
  const weekdayCounts = new Array<number>(7).fill(0);
  for (let i = 0; i < train.length; i++) {
    const dow = dates[i].getDay();
    weekdaySums[dow] += train[i];
    weekdayCounts[dow] += 1;
  }
  const weekdayPreds = test.map((_, i) => {
    const dow = dates[testStart + i].getDay();
    return weekdayCounts[dow] ? weekdaySums[dow] / weekdayCounts[dow] : 0;
  });

  const constantError = meanAbsoluteError(constantPreds, test);
  const weekdayError = meanAbsoluteError(weekdayPreds, test);
  const method: DailyForecastMethod =
    weekdayError < constantError ? "weekday-pattern" : "daily-average";

  const testMean = mean(test);
  const errorPct =
    testMean > 0 ? (Math.min(constantError, weekdayError) / testMean) * 100 : null;
  const confidence: Confidence =
    errorPct === null
      ? "Low"
      : errorPct <= 20
        ? "High"
        : errorPct <= 40
          ? "Moderate"
          : "Low";

  // Final model uses the full window for more stable weekday averages.
  const fullSums = new Array<number>(7).fill(0);
  const fullCounts = new Array<number>(7).fill(0);
  for (let i = 0; i < counts.length; i++) {
    const dow = dates[i].getDay();
    fullSums[dow] += counts[i];
    fullCounts[dow] += 1;
  }
  const dailyAverage = mean(counts.slice(-28));

  const future = Array.from({ length: horizonDays }, (_, i) => {
    const date = addDays(maxD, i + 1);
    const dow = date.getDay();
    const value =
      method === "weekday-pattern" && fullCounts[dow]
        ? fullSums[dow] / fullCounts[dow]
        : dailyAverage;
    return { date, value };
  });

  const expectedOrders = future.reduce((s, f) => s + f.value, 0);

  const recent = billable.filter(
    (o) => o.orderDate.slice(0, 10) >= toKey(addDays(maxD, -89)),
  );
  const pool = recent.length ? recent : billable;
  const avgAmount = mean(pool.map((o) => o.amount));
  const avgLoads = mean(pool.map((o) => o.loads));

  const points: DailyForecastPoint[] = [];
  const contextStart = WINDOW_DAYS - ACTUAL_CONTEXT_DAYS;
  for (let i = contextStart; i < WINDOW_DAYS; i++) {
    const date = dates[i];
    points.push({
      key: toKey(date),
      label: format(date, "MMM d"),
      weekday: format(date, "EEE"),
      actual: counts[i],
      forecast: null,
      isForecast: false,
    });
  }
  if (points.length) {
    const last = points[points.length - 1];
    last.forecast = last.actual;
  }
  for (const f of future) {
    points.push({
      key: toKey(f.date),
      label: format(f.date, "MMM d"),
      weekday: format(f.date, "EEE"),
      actual: null,
      forecast: Math.round(f.value * 10) / 10,
      isForecast: true,
    });
  }

  const busyDays = [...future]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((f) => ({
      key: toKey(f.date),
      label: format(f.date, "EEE, MMM d"),
      weekday: format(f.date, "EEE"),
      orders: Math.round(f.value * 10) / 10,
    }));

  return {
    sufficient: true,
    historyDays,
    windowDays: WINDOW_DAYS,
    horizonDays,
    method,
    methodLabel:
      method === "weekday-pattern" ? "Weekday pattern" : "Recent daily average",
    confidence,
    errorPct,
    expectedOrders,
    expectedRevenue: Math.round(expectedOrders * avgAmount),
    expectedLoads: Math.round(expectedOrders * avgLoads),
    busyDays,
    points,
  };
}
