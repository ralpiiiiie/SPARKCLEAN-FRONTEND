import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Clock,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { TaskStatus } from "../../types";
import { dueMeta, type PlannerTask } from "../../lib/analytics/tasks";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

const PRIORITY_VARIANT = {
  High: "danger",
  Medium: "warning",
  Low: "secondary",
} as const;

const PRIORITY_ACCENT = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#168bd2",
} as const;

interface TaskRowProps {
  task: PlannerTask;
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function TaskRow({
  task,
  status,
  onStatusChange,
  onEdit,
  onDelete,
  compact = false,
}: TaskRowProps) {
  const reduced = useReducedMotion();
  const completed = status === "completed";
  const due = dueMeta(task.dueDate, status);
  const accent = PRIORITY_ACCENT[task.priority];

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-border-dark dark:bg-card-dark",
        completed && "bg-slate-50/70 dark:bg-elevated-dark/60",
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: completed ? "#94a3b8" : accent }}
        aria-hidden
      />
      <div className={cn("flex gap-3 pl-5", compact ? "p-3.5" : "p-4")}>
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
          onClick={() => onStatusChange(completed ? "todo" : "completed")}
          className={cn(
            "focus-ring mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition",
            completed
              ? "border-success bg-success text-white"
              : "border-slate-300 bg-white hover:border-primary dark:border-slate-600 dark:bg-slate-900",
          )}
        >
          {completed && <Check className="h-3.5 w-3.5" aria-hidden />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={task.source === "recommended" ? "info" : "secondary"}>
              {task.source === "recommended" ? "Recommended" : "Custom"}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[task.priority]} dot>
              {task.priority}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {task.category}
            </span>
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium",
                  due.overdue
                    ? "text-coral"
                    : "text-slate-400 dark:text-slate-500",
                )}
              >
                {due.overdue ? (
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden />
                )}
                {due.label}
              </span>
            )}
          </div>

          <p
            className={cn(
              "mt-1.5 text-sm font-semibold text-slate-900 dark:text-white",
              completed && "text-slate-400 line-through dark:text-slate-500",
            )}
          >
            {task.title}
          </p>

          {!compact && task.reason && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Why · </span>
              {task.reason}
            </p>
          )}
          {!compact && task.notes && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {task.notes}
            </p>
          )}

          {!compact && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {status === "todo" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange("in-progress")}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden /> Start
                </Button>
              )}
              {status === "in-progress" && (
                <Button size="sm" variant="primary" onClick={() => onStatusChange("completed")}>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Complete
                </Button>
              )}
              {completed && (
                <Button size="sm" variant="ghost" onClick={() => onStatusChange("todo")}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reopen
                </Button>
              )}
              {task.source === "custom" && onEdit && onDelete && (
                <>
                  <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit task">
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    aria-label="Delete task"
                    className="text-coral hover:bg-coral/10 dark:text-coral-light"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}
