import {
  branchMonthlyDemand,
  branches,
  customers,
  deliveryCostMatrix,
  marketingCampaigns,
  orders,
  plantDeliveries,
  plants,
  services,
} from "../data";
import type {
  Branch,
  BranchMonthlyDemand,
  Customer,
  DeliveryCostMatrix,
  MarketingCampaign,
  Order,
  Plant,
  PlantDelivery,
  Service,
} from "../types";

/** Every dataset the analytics workspace draws from. */
export interface BusinessData {
  orders: Order[];
  customers: Customer[];
  demand: BranchMonthlyDemand[];
  services: Service[];
  branches: Branch[];
  plants: Plant[];
  costMatrix: DeliveryCostMatrix[];
  campaigns: MarketingCampaign[];
  deliveries: PlantDelivery[];
}

export function getBusinessData(): BusinessData {
  return {
    orders: orders as Order[],
    customers,
    demand: branchMonthlyDemand,
    services,
    branches,
    plants,
    costMatrix: deliveryCostMatrix,
    campaigns: marketingCampaigns,
    deliveries: plantDeliveries,
  };
}
