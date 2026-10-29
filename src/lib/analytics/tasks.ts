import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { TaskCategory, TaskPriority, TaskStatus } from "../../types";
import type { BusinessData } from "../business";
import { buildRecommendations, type RecommendationCategory } from "./recommendations";

export interface PlannerTask {
  id: string;
  title: string;
  reason?: string;
  benefit?: string;
  notes?: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate?: string;
  source: "recommended" | "custom";
  createdAt?: string;
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const CATEGORY_MAP: Record<RecommendationCategory, TaskCategory> = {
  Capacity: "Operations",
  Operations: "Operations",
  Marketing: "Marketing",
  Retention: "Customers",
  Revenue: "Revenue",
};

const DUE_IN_DAYS: Record<TaskPriority, number> = {
  High: 3,
  Medium: 7,
  Low: 14,
};

/**
 * Suggested deadlines are relative to the day the workspace is opened: high
 * priority within three days, medium within a week, low within two weeks.
 */
export function suggestedDueDate(priority: TaskPriority, from = new Date()): string {
  return format(addDays(from, DUE_IN_DAYS[priority]), "yyyy-MM-dd");
}

/** Evidence-backed actions from the recommendation engine, as planner tasks. */
export function buildRecommendedTasks(
  data: BusinessData,
  from = new Date(),
): PlannerTask[] {
  return buildRecommendations(data).map((recommendation) => ({
    id: `rec:${recommendation.id}`,
    title: recommendation.action,
    reason: recommendation.reason,
    benefit: recommendation.benefit,
    priority: recommendation.priority,
    category: CATEGORY_MAP[recommendation.category] ?? "Operations",
    dueDate: suggestedDueDate(recommendation.priority, from),
    source: "recommended",
  }));
}

export type DueMeta = {
  label: string;
  overdue: boolean;
  days: number;
};

export function dueMeta(
  dueDate: string | undefined,
  status: TaskStatus,
  now = new Date(),
): DueMeta | null {
  if (!dueDate) return null;
  const days = differenceInCalendarDays(parseISO(dueDate), now);
  const completed = status === "completed";
  const label =
    days === 0
      ? "Due today"
      : days === 1
        ? "Due tomorrow"
        : days < 0
          ? `${Math.abs(days)}d overdue`
          : `Due ${format(parseISO(dueDate), "MMM d")}`;
  return { label, overdue: !completed && days < 0, days };
}
