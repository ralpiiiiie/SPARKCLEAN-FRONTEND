import { useCallback, useMemo } from "react";
import { useAppStore } from "../store";
import { buildRecommendedTasks, type PlannerTask } from "../lib/analytics/tasks";
import type { BusinessData } from "../lib/business";
import type { TaskStatus } from "../types";

export interface TaskCounts {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  recommended: number;
  custom: number;
  percent: number;
}

/** Combines evidence-based recommendations with the user's persisted tasks. */
export function useTaskPlanner(data: BusinessData) {
  const statuses = useAppStore((state) => state.tasks.statuses);
  const customTasks = useAppStore((state) => state.tasks.custom);
  const setTaskStatus = useAppStore((state) => state.setTaskStatus);
  const addCustomTask = useAppStore((state) => state.addCustomTask);
  const updateCustomTask = useAppStore((state) => state.updateCustomTask);
  const deleteCustomTask = useAppStore((state) => state.deleteCustomTask);

  const recommended = useMemo(() => buildRecommendedTasks(data), [data]);

  const tasks = useMemo<PlannerTask[]>(() => {
    const custom: PlannerTask[] = customTasks.map((task) => ({
      id: task.id,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
      source: "custom",
      createdAt: task.createdAt,
    }));
    return [...recommended, ...custom];
  }, [recommended, customTasks]);

  const statusOf = useCallback(
    (task: PlannerTask): TaskStatus => statuses[task.id] ?? "todo",
    [statuses],
  );

  const counts = useMemo<TaskCounts>(() => {
    let todo = 0;
    let inProgress = 0;
    let completed = 0;
    for (const task of tasks) {
      const status = statuses[task.id] ?? "todo";
      if (status === "completed") completed += 1;
      else if (status === "in-progress") inProgress += 1;
      else todo += 1;
    }
    return {
      total: tasks.length,
      todo,
      inProgress,
      completed,
      recommended: recommended.length,
      custom: customTasks.length,
      percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks, statuses, recommended.length, customTasks.length]);

  return {
    tasks,
    recommended,
    statuses,
    counts,
    statusOf,
    setTaskStatus,
    addCustomTask,
    updateCustomTask,
    deleteCustomTask,
  };
}
