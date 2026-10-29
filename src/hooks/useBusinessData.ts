import { useCallback, useEffect, useState } from "react";
import { apiService } from "../services/api";
import type { BusinessData } from "../lib/business";
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

type LoadStatus = "loading" | "ready" | "error";

/** Loads the full analytics dataset through the existing API facade. */
export function useBusinessData() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [data, setData] = useState<BusinessData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const all = await apiService.getAllData();
      setData({
        orders: all.orders as unknown as Order[],
        customers: all.customers as unknown as Customer[],
        demand: all.branchMonthlyDemand as unknown as BranchMonthlyDemand[],
        services: all.services as unknown as Service[],
        branches: all.branches as unknown as Branch[],
        plants: all.plants as unknown as Plant[],
        costMatrix: all.deliveryCostMatrix as unknown as DeliveryCostMatrix[],
        campaigns: all.marketingCampaigns as unknown as MarketingCampaign[],
        deliveries: all.plantDeliveries as unknown as PlantDelivery[],
      });
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const reload = useCallback(async () => {
    setStatus("loading");
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loading from the async data facade is an external sync
    void fetchData();
  }, [fetchData]);

  return { status, data, reload };
}
