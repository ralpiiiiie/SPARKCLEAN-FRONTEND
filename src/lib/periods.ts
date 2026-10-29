import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { Order } from "../types";
import {
  continuousMonthlySeries,
  formatMonth,
  statusBreakdown,
  type MonthPoint,
} from "./metrics";

export type PeriodPreset = "weekly" | "last15" | "monthly" | "custom";
export type PeriodGranularity = "day" | "week" | "month";

export interface DateBounds {
  min: string;
  max: string;
}

export interface PeriodSelection {
  preset: PeriodPreset;
  /** ISO date used by the weekly window and the monthly selector. */
  anchor: string;
  customStart: string;
  customEnd: string;
}

export interface ResolvedPeriod {
  start: string;
  end: string;
  label: string;
  descriptor: string;
  granularity: PeriodGranularity;
  days: number;
}

export interface SeriesPoint {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  cancelled: number;
}

export interface RangeKpis {
  orders: number;
  revenue: number;
  aov: number;
  completed: number;
  pending: number;
  inProgress: number;
  cancelled: number;
  total: number;
  completionRate: number;
  cancellationRate: number;
  activeCustomers: number;
}

export interface PeriodComparison {
  start: string;
  end: string;
  kpis: RangeKpis;
}

export interface PeriodChanges {
  orders: number | null;
  revenue: number | null;
  aov: number | null;
  activeCustomers: number | null;
}

export interface PeriodView {
  bounds: DateBounds;
  selection: PeriodSelection;
  resolved: ResolvedPeriod;
  orders: Order[];
  daily: SeriesPoint[];
  buckets: SeriesPoint[];
  monthly: MonthPoint[];
  kpis: RangeKpis;
  previous: PeriodComparison | null;
  changes: PeriodChanges;
}

const toKey = (date: Date): string => format(date, "yyyy-MM-dd");

const clampKey = (key: string, bounds: DateBounds): string =>
  key < bounds.min ? bounds.min : key > bounds.max ? bounds.max : key;

const spanDays = (start: string, end: string): number =>
  differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;

/** First and last recorded order dates (ISO day strings). */
export function dataBounds(orders: Order[]): DateBounds {
  if (orders.length === 0) {
    const today = toKey(new Date());
    return { min: today, max: today };
  }
  let min = orders[0].orderDate.slice(0, 10);
  let max = min;
  for (const o of orders) {
    const key = o.orderDate.slice(0, 10);
    if (key < min) min = key;
    if (key > max) max = key;
  }
  return { min, max };
}

export function defaultSelection(
  bounds: DateBounds,
  preset: PeriodPreset = "monthly",
): PeriodSelection {
  const start30 = toKey(addDays(parseISO(bounds.max), -29));
  return {
    preset,
    anchor: bounds.max,
    customStart: start30 < bounds.min ? bounds.min : start30,
    customEnd: bounds.max,
  };
}

export function rangeLabel(start: string, end: string): string {
  if (start === end) return format(parseISO(start), "MMM d, yyyy");
  const a = parseISO(start);
  const b = parseISO(end);
  if (format(a, "yyyy-MM") === format(b, "yyyy-MM")) {
    return `${format(a, "MMM d")} – ${format(b, "d, yyyy")}`;
  }
  if (format(a, "yyyy") === format(b, "yyyy")) {
    return `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
  }
  return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
}

/** Turns a preset selection into concrete start/end dates within recorded data. */
export function resolvePeriod(
  selection: PeriodSelection,
  bounds: DateBounds,
): ResolvedPeriod {
  const minD = parseISO(bounds.min);
  const maxD = parseISO(bounds.max);

  if (selection.preset === "weekly") {
    const end = clampKey(selection.anchor || bounds.max, bounds);
    const rawStart = addDays(parseISO(end), -6);
    const start = toKey(isAfter(minD, rawStart) ? minD : rawStart);
    const days = spanDays(start, end);
    return {
      start,
      end,
      label: rangeLabel(start, end),
      descriptor: days === 7 ? "7-day window" : `${days}-day window`,
      granularity: "day",
      days,
    };
  }

  if (selection.preset === "last15") {
    const rawStart = addDays(maxD, -14);
    const start = toKey(isAfter(minD, rawStart) ? minD : rawStart);
    return {
      start,
      end: bounds.max,
      label: rangeLabel(start, bounds.max),
      descriptor: "Latest 15 recorded days",
      granularity: "day",
      days: spanDays(start, bounds.max),
    };
  }

  if (selection.preset === "monthly") {
    const anchor = clampKey(selection.anchor || bounds.max, bounds);
    const start = toKey(startOfMonth(parseISO(anchor)));
    const naturalEnd = toKey(endOfMonth(parseISO(anchor)));
    const end = naturalEnd > bounds.max ? bounds.max : naturalEnd;
    return {
      start,
      end,
      label: format(parseISO(anchor), "MMMM yyyy"),
      descriptor: "Calendar month",
      granularity: "month",
      days: spanDays(start, end),
    };
  }

  let start = clampKey(selection.customStart || bounds.min, bounds);
  let end = clampKey(selection.customEnd || bounds.max, bounds);
  if (start > end) [start, end] = [end, start];
  const days = spanDays(start, end);
  return {
    start,
    end,
    label: rangeLabel(start, end),
    descriptor: days <= 45 ? `${days} days` : `${days} days · weekly view`,
    granularity: days <= 45 ? "day" : "week",
    days,
  };
}

export function filterOrders(orders: Order[], start: string, end: string): Order[] {
  return orders.filter((o) => {
    const key = o.orderDate.slice(0, 10);
    return key >= start && key <= end;
  });
}

/** Zero-filled daily activity so trend charts keep an even time axis. */
export function buildDailySeries(
  orders: Order[],
  start: string,
  end: string,
): SeriesPoint[] {
  const bucket = new Map<
    string,
    { orders: number; revenue: number; cancelled: number }
  >();

  for (const o of orders) {
    const key = o.orderDate.slice(0, 10);
    if (key < start || key > end) continue;
    const b = bucket.get(key) ?? { orders: 0, revenue: 0, cancelled: 0 };
    if (o.status === "Cancelled") {
      b.cancelled += 1;
    } else {
      b.orders += 1;
      b.revenue += o.amount;
    }
    bucket.set(key, b);
  }

  const out: SeriesPoint[] = [];
  let day = parseISO(start);
  const last = parseISO(end);
  while (!isAfter(day, last)) {
    const key = toKey(day);
    const b = bucket.get(key) ?? { orders: 0, revenue: 0, cancelled: 0 };
    out.push({
      key,
      label: format(day, "MMM d"),
      orders: b.orders,
      revenue: Math.round(b.revenue),
      cancelled: b.cancelled,
    });
    day = addDays(day, 1);
  }
  return out;
}

function bucketLabel(startKey: string, endKey: string): string {
  const a = parseISO(startKey);
  const b = parseISO(endKey);
  if (format(a, "yyyy-MM") === format(b, "yyyy-MM")) {
    return `${format(a, "MMM d")} – ${format(b, "d")}`;
  }
  return `${format(a, "MMM d")} – ${format(b, "MMM d")}`;
}

/** Seven-day buckets for custom ranges too long for a readable daily axis. */
export function buildWeeklySeries(
  orders: Order[],
  start: string,
  end: string,
): SeriesPoint[] {
  const daily = buildDailySeries(orders, start, end);
  const out: SeriesPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    out.push({
      key: first.key,
      label: bucketLabel(first.key, last.key),
      orders: chunk.reduce((s, p) => s + p.orders, 0),
      revenue: chunk.reduce((s, p) => s + p.revenue, 0),
      cancelled: chunk.reduce((s, p) => s + p.cancelled, 0),
    });
  }
  return out;
}

/** Order/revenue/status summary for an already-filtered set of orders. */
export function summarizeOrders(orders: Order[]): RangeKpis {
  const billable = orders.filter((o) => o.status !== "Cancelled");
  const revenue = billable.reduce((s, o) => s + o.amount, 0);
  const statuses = statusBreakdown(orders);
  return {
    orders: billable.length,
    revenue,
    aov: billable.length ? revenue / billable.length : 0,
    completed: statuses.completed,
    pending: statuses.pending,
    inProgress: statuses.inProgress,
    cancelled: statuses.cancelled,
    total: statuses.total,
    completionRate: statuses.completionRate,
    cancellationRate: statuses.cancellationRate,
    activeCustomers: new Set(billable.map((o) => o.customerId)).size,
  };
}

function previousWindow(
  resolved: ResolvedPeriod,
  bounds: DateBounds,
): { start: string; end: string } | null {
  const startD = parseISO(resolved.start);
  let prevEnd: Date;
  let prevStart: Date;

  if (resolved.granularity === "month") {
    prevEnd = addDays(startD, -1);
    prevStart = startOfMonth(prevEnd);
  } else {
    prevEnd = addDays(startD, -1);
    prevStart = addDays(prevEnd, -(resolved.days - 1));
  }

  if (isAfter(parseISO(bounds.min), prevEnd)) return null;
  return { start: toKey(prevStart), end: toKey(prevEnd) };
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Builds every period-derived number a panel needs, from actual orders only. */
export function buildPeriodView(
  orders: Order[],
  selection: PeriodSelection,
  bounds: DateBounds,
): PeriodView {
  const resolved = resolvePeriod(selection, bounds);
  const scoped = filterOrders(orders, resolved.start, resolved.end);
  const kpis = summarizeOrders(scoped);
  const daily = buildDailySeries(orders, resolved.start, resolved.end);
  const buckets = resolved.granularity === "week" ? buildWeeklySeries(orders, resolved.start, resolved.end) : daily;

  const prevRange = previousWindow(resolved, bounds);
  const previous = prevRange
    ? {
        ...prevRange,
        kpis: summarizeOrders(filterOrders(orders, prevRange.start, prevRange.end)),
      }
    : null;

  const changes: PeriodChanges = {
    orders: previous ? pctChange(kpis.orders, previous.kpis.orders) : null,
    revenue: previous ? pctChange(kpis.revenue, previous.kpis.revenue) : null,
    aov: previous ? pctChange(kpis.aov, previous.kpis.aov) : null,
    activeCustomers: previous
      ? pctChange(kpis.activeCustomers, previous.kpis.activeCustomers)
      : null,
  };

  return {
    bounds,
    selection,
    resolved,
    orders: scoped,
    daily,
    buckets,
    monthly: continuousMonthlySeries(orders).slice(-12),
    kpis,
    previous,
    changes,
  };
}

/** Newest-first month options for the monthly selector. */
export function monthOptions(bounds: DateBounds): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const first = startOfMonth(parseISO(bounds.min));
  let cursor = startOfMonth(parseISO(bounds.max));
  while (!isAfter(first, cursor)) {
    const value = format(cursor, "yyyy-MM");
    out.push({ value, label: formatMonth(value) });
    cursor = subMonths(cursor, 1);
  }
  return out;
}
