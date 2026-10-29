import type { Customer, Order, BranchMonthlyDemand, Service } from "../types";

export interface MonthPoint {
  month: string; // display label, e.g. "Jan 24"
  key: string; // YYYY-MM
  revenue: number;
  orders: number;
  aov: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface KpiSummary {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  avgOrderValue: number;
  revenueChangePct: number;
  ordersChangePct: number;
  customersChangePct: number;
  aovChangePct: number;
  revenueSpark: number[];
  ordersSpark: number[];
  customersSpark: number[];
  aovSpark: number[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  const idx = Number(month) - 1;
  return `${MONTH_NAMES[idx] ?? month} '${String(year).slice(2)}`;
}

function pctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

/** Rolling monthly revenue / order / AOV series built from actual orders. */
export function buildMonthlySeries(orders: Order[]): MonthPoint[] {
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    const k = monthKey(o.orderDate);
    const b = buckets.get(k) ?? { revenue: 0, orders: 0 };
    b.revenue += o.amount;
    b.orders += 1;
    buckets.set(k, b);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, b]) => ({
      key,
      month: formatMonth(key),
      revenue: Math.round(b.revenue),
      orders: b.orders,
      aov: b.orders ? Math.round(b.revenue / b.orders) : 0,
    }));
}

/** Rolling monthly new-customer counts from join dates. */
export function buildNewCustomerSeries(customers: Customer[]): Map<string, number> {
  const buckets = new Map<string, number>();
  for (const c of customers) {
    const k = monthKey(c.joinDate);
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return buckets;
}

export function computeKpis(
  orders: Order[],
  customers: Customer[],
  monthsBack = 12,
): KpiSummary {
  const billable = orders.filter((o) => o.status !== "Cancelled");

  const totalRevenue = billable.reduce((s, o) => s + o.amount, 0);
  const totalOrders = billable.length;
  const activeCustomers = customers.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  const series = buildMonthlySeries(orders).slice(-monthsBack);
  const newCust = buildNewCustomerSeries(customers);

  // Rolling 3-month windows smooth out sparse-month sampling noise in order data.
  const sumBy = (key: "revenue" | "orders", end: number, len: number) => {
    if (end < 0) return 0;
    return series
      .slice(Math.max(0, end - len + 1), end + 1)
      .reduce((s, m) => s + m[key], 0);
  };
  const lastIdx = series.length - 1;
  const curRev = sumBy("revenue", lastIdx, 3);
  const prevRev = sumBy("revenue", lastIdx - 3, 3);
  const curOrd = sumBy("orders", lastIdx, 3);
  const prevOrd = sumBy("orders", lastIdx - 3, 3);
  const curAov = curOrd ? curRev / curOrd : 0;
  const prevAov = prevOrd ? prevRev / prevOrd : 0;

  // Customers are cumulative: start from the population before the window, then
  // add each month's signups to get a running total across the recent months.
  const custKeys = series.map((s) => newCust.get(s.key) ?? 0);
  const recentAdds = custKeys.reduce((s, v) => s + v, 0);
  const cumulative: number[] = [];
  let acc = Math.max(activeCustomers - recentAdds, 0);
  for (const add of custKeys) {
    acc += add;
    cumulative.push(acc);
  }
  const custCur = cumulative[cumulative.length - 1] ?? activeCustomers;
  const custPrev = cumulative[cumulative.length - 4] ?? cumulative[0] ?? custCur;

  return {
    totalRevenue,
    totalOrders,
    activeCustomers,
    avgOrderValue,
    revenueChangePct: pctChange(curRev, prevRev),
    ordersChangePct: pctChange(curOrd, prevOrd),
    customersChangePct: pctChange(custCur, custPrev),
    aovChangePct: pctChange(curAov, prevAov),
    revenueSpark: series.map((s) => s.revenue),
    ordersSpark: series.map((s) => s.orders),
    customersSpark: cumulative,
    aovSpark: series.map((s) => s.aov),
  };
}

export function serviceMix(orders: Order[], services: Service[]): NamedValue[] {
  const byId = new Map(services.map((s) => [s.id, s.name]));
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    const name = byId.get(o.serviceId) ?? o.serviceId;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function paymentMix(orders: Order[]): NamedValue[] {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    counts.set(o.paymentMethod, (counts.get(o.paymentMethod) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function branchLoads(
  demand: BranchMonthlyDemand[],
  fromMonth: number,
  toMonth: number,
): NamedValue[] {
  const map = new Map<string, number>();
  for (const d of demand) {
    if (d.monthNo >= fromMonth && d.monthNo <= toMonth) {
      map.set(d.branch, (map.get(d.branch) ?? 0) + d.loads);
    }
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Month-by-month series with gaps filled as zero months, so trend charts and
 * forecasts see an even time axis. Optionally limit to the most recent months.
 */
export function continuousMonthlySeries(
  orders: Order[],
  monthsBack?: number,
): MonthPoint[] {
  const sparse = buildMonthlySeries(orders);
  if (sparse.length === 0) return [];

  const byKey = new Map(sparse.map((p) => [p.key, p]));
  const [startYear, startMonth] = sparse[0].key.split("-").map(Number);
  const [endYear, endMonth] = sparse[sparse.length - 1].key.split("-").map(Number);

  const out: MonthPoint[] = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    out.push(
      byKey.get(key) ?? {
        key,
        month: formatMonth(key),
        revenue: 0,
        orders: 0,
        aov: 0,
      },
    );
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return typeof monthsBack === "number" ? out.slice(-monthsBack) : out;
}

export interface StatusBreakdown {
  completed: number;
  pending: number;
  inProgress: number;
  cancelled: number;
  total: number;
  completionRate: number;
  cancellationRate: number;
}

/** Order counts grouped into the operational stages the business tracks. */
export function statusBreakdown(orders: Order[]): StatusBreakdown {
  let completed = 0;
  let pending = 0;
  let inProgress = 0;
  let cancelled = 0;

  for (const o of orders) {
    switch (o.status) {
      case "Delivered":
        completed += 1;
        break;
      case "Received":
        pending += 1;
        break;
      case "Washing":
      case "Ready":
        inProgress += 1;
        break;
      case "Cancelled":
        cancelled += 1;
        break;
    }
  }

  const total = orders.length;
  return {
    completed,
    pending,
    inProgress,
    cancelled,
    total,
    completionRate: total ? (completed / total) * 100 : 0,
    cancellationRate: total ? (cancelled / total) * 100 : 0,
  };
}

export interface RepeatCustomerStats {
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  ordersPerCustomer: number;
}

/** Repeat activity among customers who have at least one billable order. */
export function repeatCustomerStats(orders: Order[]): RepeatCustomerStats {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    counts.set(o.customerId, (counts.get(o.customerId) ?? 0) + 1);
  }

  let repeatCustomers = 0;
  let billableOrders = 0;
  for (const n of counts.values()) {
    billableOrders += n;
    if (n > 1) repeatCustomers += 1;
  }

  const uniqueCustomers = counts.size;
  return {
    uniqueCustomers,
    repeatCustomers,
    repeatRate: uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0,
    ordersPerCustomer: uniqueCustomers ? billableOrders / uniqueCustomers : 0,
  };
}

export interface ServiceStat {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  sharePct: number;
  avgValue: number;
}

/** Services ranked by billable order volume, with revenue and share. */
export function topServices(
  orders: Order[],
  services: Service[],
  limit = 6,
): ServiceStat[] {
  const byId = new Map(services.map((s) => [s.id, s]));
  const stats = new Map<string, { orders: number; revenue: number }>();
  let billable = 0;

  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    billable += 1;
    const s = stats.get(o.serviceId) ?? { orders: 0, revenue: 0 };
    s.orders += 1;
    s.revenue += o.amount;
    stats.set(o.serviceId, s);
  }

  return [...stats.entries()]
    .map(([id, s]) => ({
      id,
      name: byId.get(id)?.name ?? id,
      orders: s.orders,
      revenue: s.revenue,
      sharePct: billable ? (s.orders / billable) * 100 : 0,
      avgValue: s.orders ? s.revenue / s.orders : 0,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}

export interface ServiceChange {
  id: string;
  name: string;
  recentOrders: number;
  priorOrders: number;
  changePct: number | null;
  direction: "up" | "down" | "flat";
  revenue: number;
}

/**
 * Compares each service's order volume in the latest window with the window
 * before it. Returns [] when there isn't enough history for a fair comparison.
 */
export function serviceDemandChange(
  orders: Order[],
  services: Service[],
  windowMonths = 6,
): ServiceChange[] {
  const series = continuousMonthlySeries(orders);
  if (series.length < windowMonths * 2) return [];

  const recentKeys = new Set(series.slice(-windowMonths).map((p) => p.key));
  const priorKeys = new Set(
    series.slice(-windowMonths * 2, -windowMonths).map((p) => p.key),
  );
  const byId = new Map(services.map((s) => [s.id, s.name]));
  const buckets = new Map<
    string,
    { recent: number; prior: number; revenue: number }
  >();

  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    const key = monthKey(o.orderDate);
    const b = buckets.get(o.serviceId) ?? { recent: 0, prior: 0, revenue: 0 };
    if (recentKeys.has(key)) {
      b.recent += 1;
      b.revenue += o.amount;
    } else if (priorKeys.has(key)) {
      b.prior += 1;
    }
    buckets.set(o.serviceId, b);
  }

  return [...buckets.entries()]
    .map(([id, b]): ServiceChange => {
      const changePct = b.prior ? ((b.recent - b.prior) / b.prior) * 100 : null;
      const direction: ServiceChange["direction"] =
        changePct === null ? "flat" : changePct > 5 ? "up" : changePct < -5 ? "down" : "flat";
      return {
        id,
        name: byId.get(id) ?? id,
        recentOrders: b.recent,
        priorOrders: b.prior,
        changePct,
        direction,
        revenue: b.revenue,
      };
    })
    .filter((s) => s.recentOrders + s.priorOrders > 0)
    .sort((a, b) => b.recentOrders - a.recentOrders);
}

export interface PeriodStat {
  key: string;
  month: string;
  revenue: number;
  orders: number;
}

export interface BestPeriods {
  byRevenue: PeriodStat | null;
  byOrders: PeriodStat | null;
}

/** Highest-revenue and highest-volume months in a series. */
export function bestPeriod(series: MonthPoint[]): BestPeriods {
  if (series.length === 0) return { byRevenue: null, byOrders: null };

  let revenue = series[0];
  let orders = series[0];
  for (const p of series) {
    if (p.revenue > revenue.revenue) revenue = p;
    if (p.orders > orders.orders) orders = p;
  }

  const pick = (p: MonthPoint): PeriodStat => ({
    key: p.key,
    month: p.month,
    revenue: p.revenue,
    orders: p.orders,
  });

  return { byRevenue: pick(revenue), byOrders: pick(orders) };
}

export function peso(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`;
    return `₱${Math.round(value)}`;
  }
  return `₱${Math.round(value).toLocaleString()}`;
}
