import { generateMockData } from './generator';

// Generate data once and export
const data = generateMockData();

export const {
  customers,
  orders,
  branchMonthlyDemand,
  marketingCampaigns,
  plantDeliveries,
  branches,
  plants,
  services,
  deliveryCostMatrix,
} = data;

// Export counts for reference
export const recordCounts = {
  customers: customers.length,
  orders: orders.length,
  branchMonthlyDemand: branchMonthlyDemand.length,
  marketingCampaigns: marketingCampaigns.length,
  plantDeliveries: plantDeliveries.length,
  branches: branches.length,
  plants: plants.length,
  services: services.length,
  deliveryCostMatrix: deliveryCostMatrix.length,
};

// Helper to get data by branch
export const getDemandByBranch = (branchName?: string) => {
  if (!branchName) return branchMonthlyDemand;
  return branchMonthlyDemand.filter(d => d.branch === branchName);
};

// Helper to get recent data
export const getRecentOrders = (limit = 20) => {
  return [...orders]
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
    .slice(0, limit);
};
