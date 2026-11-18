import { dataset } from "../data/dataset";
import { DAYS15_SCALE, MODEL_LABELS, buildForecastPayload } from "../lib/forecast";
import type { ForecastBuildOptions } from "../lib/forecast";
import type {
  CampaignChannel,
  Customer,
  CustomerType,
  DashboardPayload,
  DescriptivePayload,
  DescriptiveQuery,
  ForecastHorizon,
  ForecastParams,
  ForecastPayload,
  ForecastQuery,
  ListParams,
  MachineUsage,
  MarketingCampaign,
  Order,
  OptimizePlanPayload,
  Paged,
  Payment,
  PaymentMethod,
  PlanStatus,
  Service,
  Settings,
} from "../types";

const MONTHS: string[] = [...dataset.meta.period.months];

/** The single forecast month every model predicts into (mirrors the backend). */
const NEXT_MONTH = "Nov 2026";

export function monthForWeek(week: number): string {
  return MONTHS[Math.min(11, Math.max(0, Math.floor((week - 1) / 4)))];
}

interface State {
  services: Service[];
  customers: Customer[];
  orders: Array<{
    id: string;
    serviceId: string;
    week: number;
    month: string;
    units: number;
  }>;
  payments: Array<{
    id: string;
    orderId: string;
    amount: number;
    method: PaymentMethod;
    month: string;
  }>;
  machineUsage: MachineUsage[];
  marketing: MarketingCampaign[];
  settings: Settings;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const state: State = {
  services: clone(dataset.services),
  customers: clone(dataset.customers).map((customer) => ({
    ...customer,
    type: customer.type as CustomerType,
  })),
  orders: clone(dataset.orders),
  payments: clone(dataset.payments).map((payment) => ({
    ...payment,
    method: payment.method as PaymentMethod,
  })),
  machineUsage: clone(dataset.machineUsage),
  marketing: clone(dataset.marketingCampaigns).map((campaign) => ({
    ...campaign,
    channel: campaign.channel as CampaignChannel,
  })),
  settings: {
    currency: "₱",
    machineHoursDefault: 400,
    datasetLabel: dataset.meta.label,
  },
};

function conflict(message: string): never {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = 409;
  error.code = "CONFLICT";
  throw error;
}

function badRequest(message: string): never {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = 400;
  error.code = "BAD_REQUEST";
  throw error;
}

export function notFound(message: string): never {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = 404;
  error.code = "NOT_FOUND";
  throw error;
}

function nextId(rows: Array<{ id: string }>, prefix: string, pad: number): string {
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const value = Number(row.id.slice(prefix.length));
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return `${prefix}${String(max + 1).padStart(pad, "0")}`;
}

function serviceOf(serviceId: string): Service {
  const service = state.services.find((row) => row.id === serviceId);
  if (!service) badRequest("Choose a valid service.");
  return service;
}

function enrichedOrders(): Order[] {
  const serviceById = new Map(state.services.map((row) => [row.id, row]));
  const paymentByOrder = new Map(state.payments.map((row) => [row.orderId, row]));
  return state.orders.map((order) => {
    const service = serviceById.get(order.serviceId);
    return {
      ...order,
      service: service?.name ?? order.serviceId,
      unitLabel: service?.unitLabel ?? "",
      paymentAmount: paymentByOrder.get(order.id)?.amount ?? null,
    };
  });
}

function enrichedPayments(): Payment[] {
  const orderById = new Map(state.orders.map((row) => [row.id, row]));
  const serviceById = new Map(state.services.map((row) => [row.id, row]));
  return state.payments.map((payment) => {
    const order = orderById.get(payment.orderId);
    return {
      ...payment,
      service: order ? (serviceById.get(order.serviceId)?.name ?? "") : "",
      units: order?.units ?? 0,
    };
  });
}

function searchText(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function paginate<T>(
  rows: T[],
  params: ListParams,
  searchFields: (row: T) => Array<unknown>,
  sorters: Record<string, (row: T) => string | number>,
): Paged<T> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const needle = params.search?.trim().toLowerCase();

  let filtered = needle
    ? rows.filter((row) => searchFields(row).some((value) => searchText(value).includes(needle)))
    : [...rows];

  const sorter = params.sort ? sorters[params.sort] : undefined;
  if (sorter) {
    filtered = [...filtered].sort((a, b) => {
      const left = sorter(a);
      const right = sorter(b);
      const value =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return params.order === "desc" ? -value : value;
    });
  }

  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function monthlyServiceTotals(serviceId: string): number[] {
  const totals = new Array(12).fill(0) as number[];
  for (const order of state.orders) {
    if (order.serviceId !== serviceId) continue;
    const index = MONTHS.indexOf(order.month);
    if (index >= 0) totals[index] += order.units;
  }
  return totals;
}

const profitPerUnit = (service: Service) => service.price - service.cost;
const profitPerHour = (service: Service) =>
  service.machineHoursPerUnit > 0
    ? profitPerUnit(service) / service.machineHoursPerUnit
    : 0;

/* ── Lists ── */

function listCustomers(params: ListParams): Paged<Customer> {
  const filtered = state.customers.filter(
    (row) =>
      (!params.barangay || row.barangay === params.barangay) &&
      (!params.type || row.type === params.type),
  );
  return paginate(
    filtered,
    params,
    (row) => [row.id, row.name, row.barangay, row.type],
    {
      id: (row) => row.id,
      name: (row) => row.name,
      barangay: (row) => row.barangay,
      type: (row) => row.type,
    },
  );
}

function listServices(params: ListParams): Paged<Service> {
  return paginate(
    state.services,
    params,
    (row) => [row.id, row.name, row.unitLabel],
    {
      id: (row) => row.id,
      name: (row) => row.name,
      price: (row) => row.price,
      cost: (row) => row.cost,
      machineHoursPerUnit: (row) => row.machineHoursPerUnit,
    },
  );
}

function listOrders(params: ListParams): Paged<Order> {
  const rows = enrichedOrders().filter(
    (row) => !params.serviceId || row.serviceId === params.serviceId,
  );
  return paginate(
    rows,
    params,
    (row) => [row.id, row.service, row.month, row.week],
    {
      id: (row) => row.id,
      service: (row) => row.service,
      week: (row) => row.week,
      month: (row) => row.month,
      units: (row) => row.units,
    },
  );
}

function listPayments(params: ListParams): Paged<Payment> {
  const rows = enrichedPayments().filter(
    (row) => !params.method || row.method === params.method,
  );
  return paginate(
    rows,
    params,
    (row) => [row.id, row.orderId, row.service, row.method, row.month],
    {
      id: (row) => row.id,
      orderId: (row) => row.orderId,
      service: (row) => row.service,
      amount: (row) => row.amount,
      method: (row) => row.method,
      month: (row) => row.month,
    },
  );
}

function listMachineUsage(params: ListParams): Paged<MachineUsage> {
  return paginate(
    state.machineUsage,
    params,
    (row) => [row.id, row.day, row.hoursUsed],
    {
      id: (row) => row.id,
      day: (row) => row.day,
      hoursAvailable: (row) => row.hoursAvailable,
      hoursUsed: (row) => row.hoursUsed,
    },
  );
}

function listMarketing(params: ListParams): Paged<MarketingCampaign> {
  const rows = state.marketing.filter(
    (row) => !params.channel || row.channel === params.channel,
  );
  return paginate(
    rows,
    params,
    (row) => [row.id, row.channel, row.cost, row.leads],
    {
      id: (row) => row.id,
      channel: (row) => row.channel,
      cost: (row) => row.cost,
      leads: (row) => row.leads,
    },
  );
}

/* ── Analytics ── */

const WEEKS: number[] = Array.from({ length: 48 }, (_, index) => index + 1);

function descriptive({ granularity }: DescriptiveQuery = { granularity: "month" }): DescriptivePayload {
  const orders = enrichedOrders();
  const serviceById = new Map(state.services.map((row) => [row.id, row]));
  const sales = new Map<string, number>();
  const profit = new Map<string, number>();
  const salesByWeek = new Map<number, number>();
  const profitByWeek = new Map<number, number>();
  let totalSales = 0;
  let totalProfit = 0;

  for (const order of orders) {
    if (order.paymentAmount === null) continue;
    const service = serviceById.get(order.serviceId);
    const orderProfit = order.paymentAmount - order.units * (service?.cost ?? 0);
    totalSales += order.paymentAmount;
    totalProfit += orderProfit;
    sales.set(order.month, (sales.get(order.month) ?? 0) + order.paymentAmount);
    profit.set(order.month, (profit.get(order.month) ?? 0) + orderProfit);
    salesByWeek.set(order.week, (salesByWeek.get(order.week) ?? 0) + order.paymentAmount);
    profitByWeek.set(order.week, (profitByWeek.get(order.week) ?? 0) + orderProfit);
  }

  const units = new Map<string, number>();
  for (const order of orders) {
    units.set(order.serviceId, (units.get(order.serviceId) ?? 0) + order.units);
  }

  const profitByService = state.services
    .map((service) => ({
      id: service.id,
      name: service.name,
      unitLabel: service.unitLabel,
      price: service.price,
      cost: service.cost,
      hoursPerUnit: service.machineHoursPerUnit,
      profitPerUnit: profitPerUnit(service),
      profitPerHour: round2(profitPerHour(service)),
      unitsProcessed: units.get(service.id) ?? 0,
    }))
    .sort((a, b) => b.profitPerHour - a.profitPerHour);

  const highest = profitByService[0] ?? null;
  const lowest = profitByService[profitByService.length - 1] ?? null;

  return {
    kpis: {
      totalSales: round2(totalSales),
      totalProfit: round2(totalProfit),
      orderRecords: orders.length,
      customers: state.customers.length,
    },
    monthlySales: MONTHS.map((month) => ({
      month,
      sales: round2(sales.get(month) ?? 0),
      profit: round2(profit.get(month) ?? 0),
    })),
    granularity,
    salesSeries:
      granularity === "week"
        ? WEEKS.map((week) => ({
            label: `W${week}`,
            period: monthForWeek(week),
            sales: round2(salesByWeek.get(week) ?? 0),
            profit: round2(profitByWeek.get(week) ?? 0),
          }))
        : MONTHS.map((month) => ({
            label: month,
            period: month,
            sales: round2(sales.get(month) ?? 0),
            profit: round2(profit.get(month) ?? 0),
          })),
    profitByService,
    finding: {
      highest: highest ? { name: highest.name, profitPerHour: highest.profitPerHour } : null,
      lowest: lowest ? { name: lowest.name, profitPerHour: lowest.profitPerHour } : null,
      message:
        highest && lowest
          ? `${highest.name} earns ₱${highest.profitPerHour.toFixed(2)} per machine hour; ${lowest.name} earns the least at ₱${lowest.profitPerHour.toFixed(2)}.`
          : "Add services and orders to see the profit ranking.",
    },
  };
}

/**
 * Demand ceiling per service for the selected model. Mirrors
 * `backend/src/modules/analytics/service.ts` and shares the model math in
 * `src/lib/forecast.ts`.
 */
function demandSeries(params: ForecastParams) {
  const payload = forecast({ ...params, horizon: "month" });
  const forecastById = new Map(payload.services.map((row) => [row.id, row.forecast]));
  const demand = state.services.map((service) => ({
    id: service.id,
    name: service.name,
    unitLabel: service.unitLabel,
    forecast: forecastById.get(service.id) ?? 0,
    profitPerUnit: profitPerUnit(service),
    hoursPerUnit: service.machineHoursPerUnit,
    profitPerHour: profitPerHour(service),
  }));
  return { payload, demand };
}

/** Labels for the 48 recorded weeks and the week after them. */
const WEEK_LABELS = WEEKS.map((week) => `W${week}`);
const NEXT_WEEK = "W49";
const NEXT_DAYS15 = "15 days";

const horizonScale = (horizon: ForecastHorizon) =>
  horizon === "days15" ? DAYS15_SCALE : 1;

/** Weekly unit totals (48 buckets) for one service. */
function weeklyServiceTotals(serviceId: string): number[] {
  const totals = new Array(48).fill(0) as number[];
  for (const order of state.orders) {
    if (order.serviceId !== serviceId) continue;
    if (order.week >= 1 && order.week <= 48) totals[order.week - 1] += order.units;
  }
  return totals;
}

function horizonLabels(horizon: ForecastHorizon): { periods: string[]; nextPeriod: string } {
  if (horizon === "week") return { periods: [...WEEK_LABELS], nextPeriod: NEXT_WEEK };
  if (horizon === "days15") return { periods: [...WEEK_LABELS], nextPeriod: NEXT_DAYS15 };
  return { periods: [...MONTHS], nextPeriod: NEXT_MONTH };
}

/** The series the models fit, for the requested horizon. */
function horizonInput(services: Service[], horizon: ForecastHorizon) {
  const scale = horizonScale(horizon);
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    unitLabel: service.unitLabel,
    points: (horizon === "month"
      ? monthlyServiceTotals(service.id)
      : weeklyServiceTotals(service.id)
    ).map((units) => units * scale),
  }));
}

function forecast(params: ForecastQuery): ForecastPayload {
  const horizon = params.horizon ?? "month";
  const { periods, nextPeriod } = horizonLabels(horizon);
  const services = horizonInput(state.services, horizon);
  const options: ForecastBuildOptions =
    horizon === "month"
      ? { horizon }
      : {
          horizon,
          monthForecasts: Object.fromEntries(
            buildForecastPayload(
              horizonInput(state.services, "month"),
              [...MONTHS],
              NEXT_MONTH,
              params,
              { horizon: "month" },
            ).services.map((row) => [row.id, row.forecast]),
          ),
        };
  return buildForecastPayload(services, periods, nextPeriod, params, options);
}

type DemandRow = ReturnType<typeof demandSeries>["demand"][number];

function buildPlanRows(
  demand: DemandRow[],
  startHours: number,
  unitsFor: (row: DemandRow, hoursLeft: number) => number,
) {
  let hoursLeft = Math.max(0, startHours);
  return demand.map((row, index) => {
    const units = Math.max(0, unitsFor(row, hoursLeft));
    const hoursUsed = round2(units * row.hoursPerUnit);
    hoursLeft = Math.max(0, round2(hoursLeft - hoursUsed));
    return {
      rank: index + 1,
      serviceId: row.id,
      service: row.name,
      unitLabel: row.unitLabel,
      forecast: row.forecast,
      units,
      hoursUsed,
      hoursLeft,
      profit: round2(units * row.profitPerUnit),
      profitPerUnit: round2(row.profitPerUnit),
      hoursPerUnit: row.hoursPerUnit,
      profitPerHour: round2(row.profitPerHour),
    };
  });
}

function statusFor(row: { forecast: number; units: number }): PlanStatus {
  if (row.forecast > 0 && row.units >= row.forecast) return "full";
  if (row.units > 0) return "partial";
  return "skipped";
}

function optimizePlan(input: { hoursAvailable: number } & ForecastParams): OptimizePlanPayload {
  const params: ForecastParams = {
    model: input.model,
    window: Math.max(2, Math.min(6, Math.round(input.window))),
    alpha: Math.max(0.1, Math.min(0.9, Math.round(input.alpha * 10) / 10)),
  };
  const { payload, demand } = demandSeries(params);
  const available = Math.max(0, input.hoursAvailable);

  const hoursNeededAll = round2(
    demand.reduce((sum, row) => sum + row.forecast * row.hoursPerUnit, 0),
  );
  const share = hoursNeededAll > 0 ? Math.min(1, available / hoursNeededAll) : 0;

  const currentRows = buildPlanRows(demand, available, (row) => Math.floor(row.forecast * share));
  const currentProfit = round2(currentRows.reduce((sum, row) => sum + row.profit, 0));

  const ranked = [...demand].sort((a, b) => b.profitPerHour - a.profitPerHour);
  const optimizedRows = buildPlanRows(ranked, available, (row, hoursLeft) =>
    row.hoursPerUnit > 0
      ? Math.min(row.forecast, Math.floor(hoursLeft / row.hoursPerUnit))
      : row.forecast,
  );
  const optimizedProfit = round2(optimizedRows.reduce((sum, row) => sum + row.profit, 0));

  const gainPesos = round2(optimizedProfit - currentProfit);
  const gainPct = currentProfit > 0 ? round2((gainPesos / currentProfit) * 100) : 0;

  const currentPlan = {
    percent: round2(share * 100),
    totalProfit: currentProfit,
    hoursUsed: round2(currentRows.reduce((sum, row) => sum + row.hoursUsed, 0)),
    units: currentRows.reduce((sum, row) => sum + row.units, 0),
    rows: currentRows.map((row) => ({ ...row, status: statusFor(row) })),
  };

  const optimizedPlan = {
    totalProfit: optimizedProfit,
    hoursUsed: round2(optimizedRows.reduce((sum, row) => sum + row.hoursUsed, 0)),
    units: optimizedRows.reduce((sum, row) => sum + row.units, 0),
    rows: optimizedRows.map((row) => ({ ...row, status: statusFor(row) })),
  };

  const fullyServed = optimizedPlan.rows.filter((row) => row.status === "full");
  const partial = optimizedPlan.rows.find((row) => row.status === "partial");
  const skipped = optimizedPlan.rows.filter((row) => row.status === "skipped");

  const peso = (value: number) => `₱${Math.round(value).toLocaleString("en-PH")}`;
  const hours = (value: number) => `${Number(value.toFixed(2))}`;

  let recommendation: string;
  if (hoursNeededAll <= available) {
    recommendation = `There are enough machine hours to process all forecast demand: ${hours(
      hoursNeededAll,
    )} h covers every service, so the optimised plan equals the current one at ${peso(
      optimizedProfit,
    )}.`;
  } else if (partial) {
    recommendation = `Process all ${fullyServed.map((row) => row.service).join(", ") || "no service in full"}, then use the remaining ${hours(
      partial.hoursUsed,
    )} h on ${partial.units} ${partial.service} ${partial.unitLabel}s. Gain: +${peso(
      gainPesos,
    )} (+${round2(gainPct)}%).`;
  } else if (skipped.length > 0) {
    recommendation = `Process all ${fullyServed.map((row) => row.service).join(", ") || "no service in full"}; ${skipped
      .map((row) => row.service)
      .join(" and ")} gets no hours at ${available} h. Gain: +${peso(gainPesos)} (+${round2(
      gainPct,
    )}%).`;
  } else {
    recommendation = `Every forecast fits, so the current mix already earns ${peso(
      optimizedProfit,
    )}.`;
  }

  return {
    model: payload.model,
    modelLabel: MODEL_LABELS[payload.model],
    window: payload.window,
    alpha: payload.alpha,
    hoursAvailable: available,
    hoursNeededAll,
    currentPlan,
    optimizedPlan,
    rows: optimizedPlan.rows,
    totals: {
      currentProfit: currentPlan.totalProfit,
      optimizedProfit: optimizedPlan.totalProfit,
      currentUnits: currentPlan.units,
      optimizedUnits: optimizedPlan.units,
      forecastUnits: demand.reduce((sum, row) => sum + row.forecast, 0),
    },
    gainPesos,
    gainPct,
    recommendation,
    chart: demand.map((row) => ({
      service: row.name,
      forecast: row.forecast,
      current: currentRows.find((candidate) => candidate.serviceId === row.id)?.units ?? 0,
      optimized: optimizedPlan.rows.find((candidate) => candidate.serviceId === row.id)?.units ?? 0,
    })),
  };
}

function dashboard(): DashboardPayload {
  const overview = descriptive();
  const paid = enrichedOrders();
  const paymentMix = new Map<PaymentMethod, number>();
  for (const payment of state.payments) {
    paymentMix.set(payment.method, (paymentMix.get(payment.method) ?? 0) + payment.amount);
  }

  const marketing = new Map<CampaignChannel, { leads: number; cost: number }>();
  for (const campaign of state.marketing) {
    const current = marketing.get(campaign.channel) ?? { leads: 0, cost: 0 };
    current.leads += campaign.leads;
    current.cost += campaign.cost;
    marketing.set(campaign.channel, current);
  }

  const totalUsed = round2(
    state.machineUsage.reduce((sum, row) => sum + row.hoursUsed, 0),
  );
  const totalAvailable = round2(
    state.machineUsage.reduce((sum, row) => sum + row.hoursAvailable, 0),
  );

  return {
    kpis: overview.kpis,
    monthlySales: overview.monthlySales,
    paymentMix: [...paymentMix.entries()]
      .map(([method, value]) => ({ method, value: round2(value) }))
      .sort((a, b) => b.value - a.value),
    machineHours: {
      totalUsed,
      totalAvailable,
      utilization: totalAvailable > 0 ? round2((totalUsed / totalAvailable) * 100) : 0,
      series: state.machineUsage.slice(-14).map((row) => ({
        day: row.day,
        used: row.hoursUsed,
        available: row.hoursAvailable,
      })),
    },
    marketing: [...marketing.entries()]
      .map(([channel, value]) => ({ channel, ...value }))
      .sort((a, b) => b.leads - a.leads),
    recentOrders: [...paid]
      .sort((a, b) => b.week - a.week || b.id.localeCompare(a.id))
      .slice(0, 8)
      .map((row) => ({
        id: row.id,
        service: row.service,
        week: row.week,
        month: row.month,
        units: row.units,
        amount: row.paymentAmount,
      })),
  };
}

/* ── Mutations ── */

function createCustomer(input: Omit<Customer, "id">): Customer {
  const customer: Customer = {
    ...input,
    id: nextId(state.customers, "CUS", 3),
  };
  state.customers.unshift(customer);
  return customer;
}

function updateCustomer(id: string, input: Partial<Customer>): Customer {
  const index = state.customers.findIndex((row) => row.id === id);
  if (index < 0) notFound("Customer not found.");
  state.customers[index] = { ...state.customers[index], ...input };
  return state.customers[index];
}

function deleteCustomer(id: string) {
  const index = state.customers.findIndex((row) => row.id === id);
  if (index < 0) notFound("Customer not found.");
  state.customers.splice(index, 1);
}

function createService(input: Omit<Service, "id">): Service {
  if (
    state.services.some(
      (row) => row.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    )
  ) {
    conflict("A service with this name already exists.");
  }
  const service: Service = { ...input, id: nextId(state.services, "SV", 2) };
  state.services.push(service);
  return service;
}

function updateService(id: string, input: Partial<Service>): Service {
  const index = state.services.findIndex((row) => row.id === id);
  if (index < 0) notFound("Service not found.");
  if (
    input.name &&
    state.services.some(
      (row) =>
        row.id !== id && row.name.trim().toLowerCase() === input.name!.trim().toLowerCase(),
    )
  ) {
    conflict("A service with this name already exists.");
  }
  state.services[index] = { ...state.services[index], ...input };
  return state.services[index];
}

function deleteService(id: string) {
  if (state.orders.some((row) => row.serviceId === id)) {
    conflict("This service has orders. Delete those orders first.");
  }
  const index = state.services.findIndex((row) => row.id === id);
  if (index < 0) notFound("Service not found.");
  state.services.splice(index, 1);
}

function createOrder(input: { serviceId: string; week: number; units: number }): Order {
  serviceOf(input.serviceId);
  if (input.week < 1 || input.week > 48) badRequest("Week must be between 1 and 48.");
  if (input.units < 1) badRequest("Units must be greater than zero.");
  const order = {
    id: nextId(state.orders, "ORD", 3),
    serviceId: input.serviceId,
    week: input.week,
    month: monthForWeek(input.week),
    units: input.units,
  };
  state.orders.push(order);
  return enrichedOrders().find((row) => row.id === order.id)!;
}

function updateOrder(
  id: string,
  input: Partial<{ serviceId: string; week: number; units: number }>,
): Order {
  const index = state.orders.findIndex((row) => row.id === id);
  if (index < 0) notFound("Order not found.");
  if (input.serviceId) serviceOf(input.serviceId);
  const current = state.orders[index];
  const week = input.week ?? current.week;
  state.orders[index] = {
    ...current,
    ...input,
    month: monthForWeek(week),
  };
  return enrichedOrders().find((row) => row.id === id)!;
}

function deleteOrder(id: string) {
  if (state.payments.some((row) => row.orderId === id)) {
    conflict("This order has a payment. Delete the payment first.");
  }
  const index = state.orders.findIndex((row) => row.id === id);
  if (index < 0) notFound("Order not found.");
  state.orders.splice(index, 1);
}

function createPayment(input: { orderId: string; method: PaymentMethod }): Payment {
  const order = state.orders.find((row) => row.id === input.orderId);
  if (!order) badRequest("Choose a valid order.");
  if (state.payments.some((row) => row.orderId === input.orderId)) {
    conflict("This order already has a payment. Edit that payment instead.");
  }
  const service = serviceOf(order.serviceId);
  const payment = {
    id: nextId(state.payments, "PAY", 3),
    orderId: order.id,
    amount: order.units * service.price,
    method: input.method,
    month: order.month,
  };
  state.payments.push(payment);
  return enrichedPayments().find((row) => row.id === payment.id)!;
}

function updatePayment(
  id: string,
  input: Partial<{ orderId: string; method: PaymentMethod }>,
): Payment {
  const index = state.payments.findIndex((row) => row.id === id);
  if (index < 0) notFound("Payment not found.");
  const current = state.payments[index];
  let amount = current.amount;
  let month = current.month;

  if (input.orderId && input.orderId !== current.orderId) {
    const order = state.orders.find((row) => row.id === input.orderId);
    if (!order) badRequest("Choose a valid order.");
    if (state.payments.some((row) => row.id !== id && row.orderId === input.orderId)) {
      conflict("This order already has a payment. Edit that payment instead.");
    }
    amount = order.units * serviceOf(order.serviceId).price;
    month = order.month;
  }

  state.payments[index] = {
    ...current,
    ...input,
    amount,
    month,
  };
  return enrichedPayments().find((row) => row.id === id)!;
}

function deletePayment(id: string) {
  const index = state.payments.findIndex((row) => row.id === id);
  if (index < 0) notFound("Payment not found.");
  state.payments.splice(index, 1);
}

function createMachineUsage(input: {
  day: number;
  hoursAvailable: number;
  hoursUsed: number;
}): MachineUsage {
  if (state.machineUsage.some((row) => row.day === input.day)) {
    conflict(`A machine usage row for day ${input.day} already exists.`);
  }
  if (input.hoursUsed > input.hoursAvailable) {
    badRequest("Used hours cannot exceed available hours.");
  }
  const row: MachineUsage = { ...input, id: nextId(state.machineUsage, "USG", 3) };
  state.machineUsage.unshift(row);
  state.machineUsage.sort((a, b) => a.day - b.day);
  return row;
}

function updateMachineUsage(id: string, input: Partial<MachineUsage>): MachineUsage {
  const index = state.machineUsage.findIndex((row) => row.id === id);
  if (index < 0) notFound("Machine usage row not found.");
  const current = state.machineUsage[index];
  if (
    input.day !== undefined &&
    state.machineUsage.some((row) => row.id !== id && row.day === input.day)
  ) {
    conflict(`A machine usage row for day ${input.day} already exists.`);
  }
  const next = { ...current, ...input };
  if (next.hoursUsed > next.hoursAvailable) {
    badRequest("Used hours cannot exceed available hours.");
  }
  state.machineUsage[index] = next;
  state.machineUsage.sort((a, b) => a.day - b.day);
  return next;
}

function deleteMachineUsage(id: string) {
  const index = state.machineUsage.findIndex((row) => row.id === id);
  if (index < 0) notFound("Machine usage row not found.");
  state.machineUsage.splice(index, 1);
}

function createCampaign(input: Omit<MarketingCampaign, "id">): MarketingCampaign {
  const campaign: MarketingCampaign = {
    ...input,
    id: nextId(state.marketing, "CMP", 3),
  };
  state.marketing.unshift(campaign);
  return campaign;
}

function updateCampaign(id: string, input: Partial<MarketingCampaign>): MarketingCampaign {
  const index = state.marketing.findIndex((row) => row.id === id);
  if (index < 0) notFound("Campaign not found.");
  state.marketing[index] = { ...state.marketing[index], ...input };
  return state.marketing[index];
}

function deleteCampaign(id: string) {
  const index = state.marketing.findIndex((row) => row.id === id);
  if (index < 0) notFound("Campaign not found.");
  state.marketing.splice(index, 1);
}

/* ── CSV ── */

const escapeCell = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function csvFor(entity: string): { filename: string; csv: string } {
  const specs: Record<string, { headers: string[]; rows: unknown[][] }> = {
    customers: {
      headers: ["id", "name", "barangay", "type"],
      rows: state.customers.map((row) => [row.id, row.name, row.barangay, row.type]),
    },
    orders: {
      headers: ["id", "serviceId", "week", "month", "units"],
      rows: state.orders.map((row) => [row.id, row.serviceId, row.week, row.month, row.units]),
    },
    payments: {
      headers: ["id", "orderId", "amount", "method", "month"],
      rows: state.payments.map((row) => [
        row.id,
        row.orderId,
        row.amount,
        row.method,
        row.month,
      ]),
    },
    "machine-usage": {
      headers: ["id", "day", "hoursAvailable", "hoursUsed"],
      rows: state.machineUsage.map((row) => [
        row.id,
        row.day,
        row.hoursAvailable,
        row.hoursUsed,
      ]),
    },
    marketing: {
      headers: ["id", "channel", "cost", "leads"],
      rows: state.marketing.map((row) => [row.id, row.channel, row.cost, row.leads]),
    },
    services: {
      headers: ["id", "name", "unitLabel", "price", "cost", "machineHoursPerUnit"],
      rows: state.services.map((row) => [
        row.id,
        row.name,
        row.unitLabel,
        row.price,
        row.cost,
        row.machineHoursPerUnit,
      ]),
    },
  };

  const spec = specs[entity];
  if (!spec) notFound(`Unknown export entity: ${entity}`);
  return {
    filename: `sparkclean-${entity}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [spec.headers.join(","), ...spec.rows.map((row) => row.map(escapeCell).join(","))].join(
      "\r\n",
    ),
  };
}

export const mockApi = {
  listCustomers,
  listServices,
  listOrders,
  listPayments,
  listMachineUsage,
  listMarketing,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createService,
  updateService,
  deleteService,
  createOrder,
  updateOrder,
  deleteOrder,
  createPayment,
  updatePayment,
  deletePayment,
  createMachineUsage,
  updateMachineUsage,
  deleteMachineUsage,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  descriptive,
  forecast,
  optimizePlan,
  dashboard,
  getSettings: () => ({ ...state.settings }),
  updateSettings: (input: Partial<Settings>) => {
    state.settings = { ...state.settings, ...input };
    return { ...state.settings };
  },
  csvFor,
};
