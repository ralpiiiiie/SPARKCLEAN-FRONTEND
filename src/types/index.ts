export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  branch: string;
  type: CustomerType;
  joinDate: string;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

export type CustomerType = 'Individual' | 'Condo' | 'Dormitory' | 'Hotel' | 'Restaurant' | 'Clinic';

export interface Order {
  id: string;
  customerId: string;
  branch: string;
  serviceId: string;
  kg: number;
  loads: number;
  amount: number;
  paymentMethod: 'Cash' | 'GCash' | 'Maya' | 'Card';
  status: 'Received' | 'Washing' | 'Ready' | 'Delivered' | 'Cancelled';
  orderDate: string;
  isPickup: boolean;
}

export interface BranchMonthlyDemand {
  branch: string;
  monthNo: number;
  loads: number;
  monthLabel: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  branch: string;
  startDate: string;
  endDate: string;
  budget: number;
  newCustomers: number;
  revenueGenerated: number;
}

export type CampaignChannel = 'Facebook' | 'TikTok' | 'Flyers' | 'Referral' | 'Radio' | 'Promo Code';

export interface PlantDelivery {
  id: string;
  plant: string;
  branch: string;
  date: string;
  loads: number;
  cost: number;
  status: 'Completed' | 'In Transit' | 'Delayed';
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  manager: string;
}

export interface Plant {
  id: string;
  name: string;
  city: string;
  monthlyCapacity: number;
  lat: number;
  lng: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  pricePerKg: number;
  turnaroundHours: number;
}

export interface DeliveryCostMatrix {
  plant: string;
  branch: string;
  costPerLoad: number;
  distanceKm: number;
}

export interface DescriptiveStats {
  mean: number;
  median: number;
  mode?: number;
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

export interface RegressionResults {
  modelType: 'linear' | 'quadratic' | 'cubic';
  coefficients: number[];
  rSquared: number;
  fStatistic: number;
  pValue: number;
  mad: number;
  predictions: number[];
  residuals: number[];
}

export interface ForecastResult {
  branch: string;
  month: number;
  actual?: number;
  fitted?: number;
  forecast?: number;
}

export interface TransportationSolution {
  plant: string;
  branch: string;
  loads: number;
  cost: number;
}

export type FilterState = {
  dateRange: { start: string; end: string };
  branch: string;
  service: string;
};

export type ThemeState = 'light' | 'dark';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';
export type TaskCategory =
  | 'Orders'
  | 'Revenue'
  | 'Customers'
  | 'Operations'
  | 'Capacity'
  | 'Marketing'
  | 'Retention';

export interface CustomTask {
  id: string;
  title: string;
  notes?: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate?: string;
  createdAt: string;
}

export interface SettingsState {
  rushCostPerLoad: number;
  storageCostPerLoad: number;
  currency: string;
  units: string;
}
