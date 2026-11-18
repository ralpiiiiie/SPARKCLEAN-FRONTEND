export type CustomerType = "Student" | "Household" | "Boarding house" | "Business";
export type PaymentMethod = "Cash" | "GCash" | "Maya";
export type CampaignChannel = "Facebook" | "Flyers" | "Referral" | "Tarpaulin" | "Promo";
export type ThemeState = "light" | "dark";

export const BARANGAYS = [
  "Gabi",
  "Day-as",
  "Poblacion",
  "Catarman",
  "Pilipog",
  "Ibabao",
  "San Miguel",
  "Bangbang",
  "Buagsong",
  "Cogon",
  "Alegria",
  "Gilutongan",
  "Dapitan",
] as const;

export const CUSTOMER_TYPES: CustomerType[] = [
  "Student",
  "Household",
  "Boarding house",
  "Business",
];

export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "GCash", "Maya"];

export const CAMPAIGN_CHANNELS: CampaignChannel[] = [
  "Facebook",
  "Flyers",
  "Referral",
  "Tarpaulin",
  "Promo",
];

export interface Customer {
  id: string;
  name: string;
  barangay: string;
  type: CustomerType;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  name: string;
  unitLabel: string;
  price: number;
  cost: number;
  machineHoursPerUnit: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  serviceId: string;
  service: string;
  unitLabel: string;
  week: number;
  month: string;
  units: number;
  paymentAmount: number | null;
}

export interface Payment {
  id: string;
  orderId: string;
  service: string;
  units: number;
  amount: number;
  method: PaymentMethod;
  month: string;
}

export interface MachineUsage {
  id: string;
  day: number;
  hoursAvailable: number;
  hoursUsed: number;
}

export interface MarketingCampaign {
  id: string;
  channel: CampaignChannel;
  cost: number;
  leads: number;
}

export interface Settings {
  currency: string;
  machineHoursDefault: number;
  datasetLabel?: string;
}

export type CustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt">;
export type ServiceInput = Omit<Service, "id" | "createdAt" | "updatedAt">;
export type OrderInput = Pick<Order, "serviceId" | "week" | "units">;
export type PaymentInput = Pick<Payment, "orderId" | "method">;
export type MachineUsageInput = Pick<MachineUsage, "day" | "hoursAvailable" | "hoursUsed">;
export type MarketingInput = Pick<MarketingCampaign, "channel" | "cost" | "leads">;

export type ExportEntity =
  | "customers"
  | "services"
  | "orders"
  | "payments"
  | "machine-usage"
  | "marketing";

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  barangay?: string;
  type?: string;
  serviceId?: string;
  method?: string;
  channel?: string;
}

export interface MonthlySales {
  month: string;
  sales: number;
  profit: number;
}

export interface Kpis {
  totalSales: number;
  totalProfit: number;
  orderRecords: number;
  customers: number;
}

export interface ProfitServiceRow {
  id: string;
  name: string;
  unitLabel: string;
  price: number;
  cost: number;
  hoursPerUnit: number;
  profitPerUnit: number;
  profitPerHour: number;
  unitsProcessed: number;
}

export type Granularity = "month" | "week";

/** One point of the sales chart at the requested granularity. */
export interface SalesSeriesRow {
  label: string;
  period: string;
  sales: number;
  profit: number;
}

export interface DescriptiveQuery {
  granularity: Granularity;
}

export interface DescriptivePayload {
  kpis: Kpis;
  monthlySales: MonthlySales[];
  granularity: Granularity;
  salesSeries: SalesSeriesRow[];
  profitByService: ProfitServiceRow[];
  finding: {
    highest: { name: string; profitPerHour: number } | null;
    lowest: { name: string; profitPerHour: number } | null;
    message: string;
  };
}

export type ForecastModel = "moving_average" | "exp_smoothing" | "linear";

/** What one forecast number covers. */
export type ForecastHorizon = "month" | "week" | "days15";

export interface ForecastParams {
  model: ForecastModel;
  window: number;
  alpha: number;
}

/** What `GET /analytics/forecast` accepts; the horizon defaults to a month. */
export interface ForecastQuery extends ForecastParams {
  horizon?: ForecastHorizon;
}

export interface ForecastServiceRow {
  id: string;
  name: string;
  unitLabel: string;
  /** Recorded units per period, at the payload's horizon. */
  points: number[];
  fitted: Array<number | null>;
  forecast: number;
  /** Next-month forecast, whatever horizon the payload was built for. */
  monthForecast: number;
  mad: number;
  average: number;
  lastPoint: number;
  changePct: number;
  slope: number;
  intercept: number;
  r2: number;
  band: Array<{ period: string; fitted: number | null; low: number; high: number }>;
}

/** GET /analytics/forecast */
export interface ForecastPayload {
  model: ForecastModel;
  window: number;
  alpha: number;
  horizon: ForecastHorizon;
  /** Labels of the recorded periods the model was fitted on. */
  periods: string[];
  nextPeriod: string;
  backtestFrom: number;
  services: ForecastServiceRow[];
  modelComparison: Array<{ model: ForecastModel; totalMad: number }>;
  bestFit: ForecastModel;
}

export type PlanStatus = "full" | "partial" | "skipped";

export interface PlanRow {
  rank: number;
  serviceId: string;
  service: string;
  unitLabel: string;
  forecast: number;
  units: number;
  hoursUsed: number;
  hoursLeft: number;
  profit: number;
  profitPerUnit: number;
  hoursPerUnit: number;
  profitPerHour: number;
  status: PlanStatus;
}

export interface PlanSummary {
  totalProfit: number;
  hoursUsed: number;
  units: number;
  rows: PlanRow[];
}

/** POST /analytics/optimize-plan */
export interface OptimizePlanPayload {
  model: ForecastModel;
  modelLabel: string;
  window: number;
  alpha: number;
  hoursAvailable: number;
  hoursNeededAll: number;
  currentPlan: PlanSummary & { percent: number };
  optimizedPlan: PlanSummary;
  rows: PlanRow[];
  totals: {
    currentProfit: number;
    optimizedProfit: number;
    currentUnits: number;
    optimizedUnits: number;
    forecastUnits: number;
  };
  gainPesos: number;
  gainPct: number;
  recommendation: string;
  chart: Array<{ service: string; forecast: number; current: number; optimized: number }>;
}

export interface DashboardPayload {
  kpis: Kpis;
  monthlySales: MonthlySales[];
  paymentMix: Array<{ method: PaymentMethod; value: number }>;
  machineHours: {
    totalUsed: number;
    totalAvailable: number;
    utilization: number;
    series: Array<{ day: number; used: number; available: number }>;
  };
  marketing: Array<{ channel: CampaignChannel; leads: number; cost: number }>;
  recentOrders: Array<{
    id: string;
    service: string;
    week: number;
    month: string;
    units: number;
    amount: number | null;
  }>;
}
