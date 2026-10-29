import type {
  Branch,
  BranchMonthlyDemand,
  CampaignChannel,
  Customer,
  CustomerType,
  DeliveryCostMatrix,
  MarketingCampaign,
  Order,
  Plant,
  PlantDelivery,
  Service,
} from "./index";

/* ── Envelopes ── */

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ── Core reference data ── */

export interface DemandRecord extends BranchMonthlyDemand {
  id: number;
  branchId: string;
}

export interface DemandInput {
  branchId: string;
  monthNo: number;
  loads: number;
  monthLabel: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  branchId: string;
  type: CustomerType;
  joinDate: string;
  loyaltyTier: Customer["loyaltyTier"];
}

export type OrderInput = Omit<Order, "id" | "branch"> & { branchId: string };

export interface CampaignInput {
  name: string;
  channel: CampaignChannel;
  branchId: string;
  startDate: string;
  endDate: string;
  budget: number;
  newCustomers: number;
  revenueGenerated: number;
}

export interface DeliveryInput {
  plantId: string;
  branchId: string;
  date: string;
  loads: number;
  cost: number;
  status: PlantDelivery["status"];
}

export interface DeliveryCostInput {
  plantId: string;
  branchId: string;
  costPerLoad: number;
  distanceKm: number;
}

export type BranchInput = Omit<Branch, "id"> & { id?: string };
export type PlantInput = Omit<Plant, "id"> & { id?: string };
export type ServiceInput = Omit<Service, "id"> & { id?: string };

export interface AppSettings {
  id: number;
  rushCostPerLoad: number;
  storageCostPerLoad: number;
  currency: string;
  units: string;
  validationMonths: number;
}

export type SettingsInput = Pick<
  AppSettings,
  "rushCostPerLoad" | "storageCostPerLoad" | "currency" | "units" | "validationMonths"
>;

/* ── Descriptive ── */

export type NotePage = "descriptive" | "predictive" | "prescriptive" | "summary";
export type NoteTag = "Insight" | "Warning" | "Action" | "Question";

export interface AnalystNote {
  id: number;
  page: NotePage;
  branchId: string | null;
  branch: string | null;
  title: string;
  body: string;
  tag: NoteTag;
  pinned: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  page: NotePage;
  branchId?: string | null;
  title: string;
  body: string;
  tag: NoteTag;
  pinned: boolean;
  author: string;
}

export interface SavedView {
  id: number;
  name: string;
  page: string;
  filtersJson: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DescriptiveStatsPayload {
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  stdError: number;
  variance: number;
  kurtosis: number;
  skewness: number;
  min: number;
  max: number;
  range: number;
  sum: number;
  count: number;
}

export interface DescriptivePayload {
  totals: {
    branches: number;
    services: number;
    customers: number;
    orders: number;
    revenue: number;
    demandLoads: number;
    demandRecords: number;
  };
  demand: {
    stats: DescriptiveStatsPayload;
    histogram: { start: number; end: number; label: string; count: number }[];
    records: { id: number; branchId: string; monthNo: number; monthLabel: string; loads: number }[];
  };
  branches: {
    branchId: string;
    branch: string;
    stats: DescriptiveStatsPayload;
    bestFit: { model: string; r2: number; mad: number } | null;
  }[];
  monthly: { key: string; month: string; orders: number; revenue: number; loads: number }[];
  status: Record<string, number>;
  serviceMix: { name: string; orders: number; revenue: number }[];
  paymentMix: { name: string; orders: number; revenue: number }[];
  repeat: { uniqueCustomers: number; repeatCustomers: number; repeatRate: number };
}

/* ── Predictive ── */

export type ForecastModel = "linear" | "quadratic" | "cubic" | "exponential" | "smoothing";
export type ForecastModelOption = ForecastModel | "auto";

export interface ForecastPoint {
  monthNo: number;
  monthLabel?: string;
  forecastLoads: number;
  lower: number;
  upper: number;
}

export interface ModelFit {
  model: ForecastModel;
  coefficients: number[];
  rSquared: number;
  mad: number;
  validationMad: number;
}

export interface ForecastPayload {
  branchId?: string;
  branch?: string;
  model: ForecastModel;
  autoModel: ForecastModel;
  overridden: boolean;
  trainingEndMonthNo: number;
  r2: number;
  mad: number;
  models: ModelFit[];
  history: { monthNo: number; monthLabel: string; loads: number }[];
  forecast: ForecastPoint[];
  override?: { model: ForecastModel; reason: string } | null;
}

export interface PredictivePayload {
  workloads: {
    branchId: string;
    branch: string;
    recentAvg: number;
    lastMonth: number;
    forecastLoads: number;
    changePct: number;
    direction: "up" | "down" | "flat";
  }[];
  branchForecasts: {
    branchId: string;
    branch: string;
    model: ForecastModel;
    autoModel: ForecastModel;
    overridden: boolean;
    r2: number;
    mad: number;
    forecast: ForecastPoint[];
  }[];
}

export interface ForecastRun {
  id: number;
  name: string;
  branchId: string;
  branch: string;
  model: ForecastModelOption;
  horizon: number;
  trainingEnd: string;
  validationMonths: number;
  r2: number;
  mad: number;
  status: "Draft" | "Approved" | "Archived";
  notes: string | null;
  results: { id: number; monthNo: number; forecastLoads: number; lower: number; upper: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface ForecastRunInput {
  name: string;
  branchId: string;
  model: ForecastModelOption;
  horizon: number;
  validationMonths: number;
  notes?: string;
}

export interface ModelOverride {
  id: number;
  branchId: string;
  branch: string;
  chosenModel: ForecastModel;
  reason: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostAssumption {
  id: number;
  name: string;
  rushCostPerLoad: number;
  storageCostPerLoad: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformancePayload {
  assumption: CostAssumption | null;
  rushCostPerLoad: number;
  storageCostPerLoad: number;
  rushLoads: number;
  storageLoads: number;
  rushCost: number;
  storageCost: number;
  penaltyCost: number;
  routing: { optimizedCost: number; baselineCost: number; savings: number; savingsPct: number };
  totalOpportunity: number;
}

/* ── Prescriptive ── */

export type ScenarioStatus = "Draft" | "Solved" | "Approved" | "Archived";
export type ScheduleStatus = "Planned" | "Dispatched" | "Delivered" | "Cancelled";

export interface ScenarioSupply {
  plantId: string;
  plant: string;
  supply: number;
}

export interface ScenarioDemand {
  branchId: string;
  branch: string;
  demand: number;
  isOverride: boolean;
}

export interface ScenarioCost {
  plantId: string;
  branchId: string;
  costPerLoad: number;
}

export interface ScheduleItem {
  id: number;
  scenarioId: number;
  plantId: string;
  plant: string;
  branchId: string;
  branch: string;
  loads: number;
  unitCost: number;
  totalCost: number;
  status: ScheduleStatus;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  fuelCostPct: number;
  demandPct: number;
  capacityPct: number;
  demandSource: "forecast" | "manual";
  status: ScenarioStatus;
  baselineMethod: "proportional" | "smoothing";
  totalCost: number | null;
  baselineCost: number | null;
  savingsAmount: number | null;
  savingsPct: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioDetail extends Scenario {
  supply: ScenarioSupply[];
  demand: ScenarioDemand[];
  costs: ScenarioCost[];
  schedule: ScheduleItem[];
}

export interface ScenarioInput {
  name: string;
  description: string;
  fuelCostPct: number;
  demandPct: number;
  capacityPct: number;
  demandSource: "forecast" | "manual";
  baselineMethod: "proportional" | "smoothing";
  supply?: { plantId: string; supply: number }[];
  demand?: { branchId: string; demand: number; isOverride: boolean }[];
  costs?: { plantId: string; branchId: string; costPerLoad: number }[];
}

export interface ScenarioComparison {
  scenarios: {
    id: number;
    name: string;
    status: ScenarioStatus;
    totalCost: number | null;
    baselineCost: number | null;
    savingsAmount: number | null;
    savingsPct: number | null;
    totalSupply: number;
    totalDemand: number;
  }[];
}

/* ── BA process ── */

export type ProcedureStatus = "Not started" | "In progress" | "Completed";

export interface ProcedureStep {
  id: number;
  runId: number;
  stepNo: number;
  title: string;
  done: boolean;
  doneAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureRun {
  id: number;
  monthNo: number;
  periodLabel: string;
  status: ProcedureStatus;
  owner: string;
  notes: string | null;
  steps: ProcedureStep[];
  createdAt: string;
  updatedAt: string;
}

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  relatedStep: "Descriptive" | "Predictive" | "Prescriptive";
  owner: string;
  dueDate: string | null;
  status: "Open" | "In progress" | "Done";
  estimatedSavings: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationInput {
  title: string;
  description: string;
  priority: Recommendation["priority"];
  relatedStep: Recommendation["relatedStep"];
  owner: string;
  dueDate?: string | null;
  status: Recommendation["status"];
  estimatedSavings?: number | null;
}

export interface RecommendationSuggestion {
  id: string;
  title: string;
  description: string;
  benefit: string;
  category: string;
  priority: Recommendation["priority"];
  relatedStep: Recommendation["relatedStep"];
}

export interface BaReport {
  id: number;
  title: string;
  snapshotJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/* ── Dashboard ── */

export interface DashboardSummary {
  kpis: {
    orders: number;
    revenue: number;
    aov: number;
    activeCustomers: number;
    totalCustomers: number;
    completed: number;
    pending: number;
    inProgress: number;
    cancelled: number;
    completionRate: number;
  };
  statusBreakdown: Record<string, number>;
  monthly: { key: string; month: string; orders: number; revenue: number; aov: number }[];
  serviceMix: { name: string; orders: number; revenue: number }[];
  recentOrders: Order[];
}

export type { Branch, BranchMonthlyDemand, Customer, MarketingCampaign, Order, Plant, PlantDelivery, Service, DeliveryCostMatrix };
