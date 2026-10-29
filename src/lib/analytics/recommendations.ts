import type { BusinessData } from "../business";
import {
  computeKpis,
  repeatCustomerStats,
  serviceDemandChange,
  statusBreakdown,
  topServices,
} from "../metrics";
import { forecastBranchWorkloads } from "./forecastBusiness";

export type RecommendationPriority = "High" | "Medium" | "Low";
export type RecommendationCategory =
  | "Capacity"
  | "Operations"
  | "Marketing"
  | "Retention"
  | "Revenue";

export interface Recommendation {
  id: string;
  action: string;
  reason: string;
  priority: RecommendationPriority;
  benefit: string;
  category: RecommendationCategory;
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const MIN_ORDERS_FOR_ADVICE = 30;

/**
 * Turns observed history and projections into concrete actions. Every rule
 * only fires when the underlying records support it, so a sparse dataset
 * yields fewer (or no) recommendations instead of generic filler.
 */
export function buildRecommendations(data: BusinessData): Recommendation[] {
  if (data.orders.length < MIN_ORDERS_FOR_ADVICE) return [];

  const recommendations: Recommendation[] = [];
  const kpis = computeKpis(data.orders, data.customers);
  const statuses = statusBreakdown(data.orders);
  const repeat = repeatCustomerStats(data.orders);
  const workloads = forecastBranchWorkloads(data.demand);
  const serviceShifts = serviceDemandChange(data.orders, data.services);
  const allServices = topServices(data.orders, data.services, data.services.length);

  // Rising workload at a specific branch.
  const risingBranch = workloads
    .filter((w) => w.changePct >= 5)
    .sort((a, b) => b.changePct - a.changePct)[0];
  if (risingBranch) {
    recommendations.push({
      id: "capacity-rising-branch",
      category: "Capacity",
      action: `Plan extra staffing and plant capacity for ${risingBranch.branch} next month.`,
      reason: `${risingBranch.branch} is estimated to handle about ${risingBranch.forecastLoads.toLocaleString()} loads next month — roughly ${risingBranch.changePct.toFixed(0)}% above its latest recorded month.`,
      priority: risingBranch.changePct >= 10 ? "High" : "Medium",
      benefit: "Keeps turnaround times steady during the projected peak instead of letting queues build.",
    });
  }

  // Branch carrying the largest expected workload.
  const busiest = workloads[0];
  if (busiest && busiest.branch !== risingBranch?.branch) {
    recommendations.push({
      id: "capacity-busiest-branch",
      category: "Capacity",
      action: `Keep ${busiest.branch} fully staffed through its next demand cycle.`,
      reason: `${busiest.branch} carries the highest expected workload next month, at about ${busiest.forecastLoads.toLocaleString()} loads.`,
      priority: "Medium",
      benefit: "Protects the branch that handles the largest share of laundry volume.",
    });
  }

  // High cancellation rate.
  if (statuses.cancellationRate >= 8) {
    recommendations.push({
      id: "operations-cancellations",
      category: "Operations",
      action: "Review order confirmation and pickup scheduling to reduce cancellations.",
      reason: `${statuses.cancelled.toLocaleString()} of ${statuses.total.toLocaleString()} orders were cancelled (${statuses.cancellationRate.toFixed(0)}%).`,
      priority: statuses.cancellationRate >= 12 ? "High" : "Medium",
      benefit: "Recovering cancelled orders adds billable volume without extra acquisition spend.",
    });
  }

  // Open-order backlog.
  const openShare = statuses.total
    ? ((statuses.pending + statuses.inProgress) / statuses.total) * 100
    : 0;
  if (openShare >= 25) {
    recommendations.push({
      id: "operations-backlog",
      category: "Operations",
      action: "Prioritise clearing orders that are still pending or in progress.",
      reason: `${(statuses.pending + statuses.inProgress).toLocaleString()} orders (${openShare.toFixed(0)}%) are still pending or in progress, while ${statuses.completionRate.toFixed(0)}% of all orders are marked delivered.`,
      priority: openShare >= 40 ? "High" : "Medium",
      benefit: "Faster completion shortens the order cycle and lifts customer confidence.",
    });
  }

  // Service losing volume.
  const decliningService = serviceShifts
    .filter((s) => s.direction === "down" && s.priorOrders >= 5)
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))[0];
  if (decliningService) {
    recommendations.push({
      id: "flag-declining-service",
      category: "Marketing",
      action: `Investigate the drop in ${decliningService.name} orders and consider a targeted promotion.`,
      reason: `${decliningService.name} moved from ${decliningService.priorOrders} to ${decliningService.recentOrders} orders between the two latest six-month windows (${Math.abs(decliningService.changePct ?? 0).toFixed(0)}% lower).`,
      priority: "Medium",
      benefit: "Catches a slipping service line before it loses more of its revenue share.",
    });
  }

  // Service gaining volume.
  const risingService = serviceShifts
    .filter((s) => s.direction === "up" && s.recentOrders >= 5)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0];
  if (risingService) {
    recommendations.push({
      id: "capacity-rising-service",
      category: "Capacity",
      action: `Make sure ${risingService.name} capacity keeps pace with its growing demand.`,
      reason: `${risingService.name} rose from ${risingService.priorOrders} to ${risingService.recentOrders} orders between the two latest six-month windows (${(risingService.changePct ?? 0).toFixed(0)}% higher).`,
      priority: "Medium",
      benefit: "Prevents a popular service from becoming a bottleneck as demand grows.",
    });
  }

  // Least-requested service worth promoting.
  const leastRequested = allServices[allServices.length - 1];
  if (allServices.length >= 5 && leastRequested && leastRequested.sharePct < 5) {
    recommendations.push({
      id: "promote-least-requested",
      category: "Marketing",
      action: `Promote ${leastRequested.name} to customers who have not tried it.`,
      reason: `${leastRequested.name} accounts for only ${leastRequested.sharePct.toFixed(1)}% of billable orders (${leastRequested.orders} orders).`,
      priority: "Low",
      benefit: "Broadens demand beyond the most-requested services without new service development.",
    });
  }

  // Repeat-customer health.
  if (repeat.repeatRate < 45) {
    recommendations.push({
      id: "retention-repeat",
      category: "Retention",
      action: "Introduce a repeat-order incentive for one-time customers.",
      reason: `Only ${repeat.repeatRate.toFixed(0)}% of customers (${repeat.repeatCustomers.toLocaleString()} of ${repeat.uniqueCustomers.toLocaleString()}) have placed more than one order.`,
      priority: "Medium",
      benefit: "Repeat visits reduce reliance on acquiring new customers each period.",
    });
  } else {
    recommendations.push({
      id: "retention-loyalty",
      category: "Retention",
      action: "Reward loyal customers to protect repeat volume.",
      reason: `${repeat.repeatRate.toFixed(0)}% of customers (${repeat.repeatCustomers.toLocaleString()} of ${repeat.uniqueCustomers.toLocaleString()}) have placed more than one order.`,
      priority: "Low",
      benefit: "Sustains the repeat base that already drives most order volume.",
    });
  }

  // Revenue slipping against the prior window.
  if (kpis.revenueChangePct <= -5) {
    recommendations.push({
      id: "revenue-decline",
      category: "Revenue",
      action: "Review pricing, service mix and branch demand behind the recent revenue dip.",
      reason: `Revenue across the latest three recorded months is ${Math.abs(kpis.revenueChangePct).toFixed(0)}% below the previous three months.`,
      priority: kpis.revenueChangePct <= -15 ? "High" : "Medium",
      benefit: "Identifies whether volume, mix or pricing is driving the decline before it continues.",
    });
  }

  // Demand softening at a branch.
  const decliningBranch = workloads
    .filter((w) => w.changePct <= -5)
    .sort((a, b) => a.changePct - b.changePct)[0];
  if (decliningBranch) {
    recommendations.push({
      id: "flag-declining-branch",
      category: "Revenue",
      action: `Review demand and marketing coverage for ${decliningBranch.branch}.`,
      reason: `${decliningBranch.branch} is projected at about ${decliningBranch.forecastLoads.toLocaleString()} loads next month, ${Math.abs(decliningBranch.changePct).toFixed(0)}% below its latest recorded month.`,
      priority: "Medium",
      benefit: "Surfaces a softening location while there is still time to act on it.",
    });
  }

  return recommendations
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .slice(0, 6);
}
