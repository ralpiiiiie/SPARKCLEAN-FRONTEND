import { useId, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ListChecks,
  Plus,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "../../types";
import type { BusinessData } from "../../lib/business";
import {
  PRIORITY_ORDER,
  suggestedDueDate,
  type PlannerTask,
} from "../../lib/analytics/tasks";
import { useTaskPlanner } from "../../hooks/useTaskPlanner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { EASE_OUT } from "../ui/motion";
import { TaskRow } from "./TaskRow";
import { cn } from "../../lib/utils";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;
type SortMode = "priority" | "due" | "newest";

const CATEGORY_OPTIONS: TaskCategory[] = [
  "Orders",
  "Revenue",
  "Customers",
  "Operations",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["High", "Medium", "Low"];

const PRIORITY_VARIANT = {
  High: "danger",
  Medium: "warning",
  Low: "secondary",
} as const;

interface TaskFormValues {
  title: string;
  notes: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string;
}

function TaskForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: PlannerTask;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "Medium");
  const [category, setCategory] = useState<TaskCategory>(
    initial &&
      CATEGORY_OPTIONS.includes(initial.category as TaskCategory)
      ? (initial.category as TaskCategory)
      : "Operations",
  );
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ?? suggestedDueDate("Medium"),
  );
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give the task a short, action-oriented title.");
      return;
    }
    onSubmit({
      title: title.trim(),
      notes: notes.trim(),
      priority,
      category,
      dueDate,
    });
  };

  return (
    <Card reveal={false}>
      <CardHeader>
        <CardTitle subtitle="Your own follow-up, saved alongside the recommended actions">
          {initial ? "Edit task" : "New task"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Task title
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Call the Mandaue branch about weekend staffing"
              className="focus-ring h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            {error && <p className="mt-1 text-xs text-coral">{error}</p>}
          </div>
          <div>
            <label
              htmlFor="task-notes"
              className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any detail that helps whoever picks this up."
              className="focus-ring w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="focus-ring h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-category"
                className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Category
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="focus-ring h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-due"
                className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="focus-ring h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {initial ? "Save changes" : "Add task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function TaskPlanner({ data }: { data: BusinessData }) {
  const pillId = useId();
  const {
    tasks,
    counts,
    statusOf,
    setTaskStatus,
    addCustomTask,
    updateCustomTask,
    deleteCustomTask,
  } = useTaskPlanner(data);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [sort, setSort] = useState<SortMode>("priority");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PlannerTask | null>(null);

  const editingTask = editingId
    ? tasks.find((task) => task.id === editingId)
    : undefined;

  const filtered = useMemo(() => {
    const list = tasks.filter((task) => {
      const status = statusOf(task);
      if (filter !== "all" && status !== filter) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === "newest") {
        return (
          (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        );
      }
      if (sort === "due") {
        return (
          (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        );
      }
      return (
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31")
      );
    });
  }, [tasks, statusOf, filter, priority, sort]);

  const priorityCounts = useMemo(() => {
    const out: Record<TaskPriority, number> = { High: 0, Medium: 0, Low: 0 };
    for (const task of tasks) out[task.priority] += 1;
    return out;
  }, [tasks]);

  const tabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.total },
    { id: "todo", label: "To do", count: counts.todo },
    { id: "in-progress", label: "In progress", count: counts.inProgress },
    { id: "completed", label: "Completed", count: counts.completed },
  ];

  const openAdd = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (values: TaskFormValues) => {
    if (editingId) {
      updateCustomTask(editingId, {
        title: values.title,
        notes: values.notes || undefined,
        priority: values.priority,
        category: values.category,
        dueDate: values.dueDate || undefined,
      });
      toast.success("Task updated");
    } else {
      addCustomTask({
        id: `custom:${globalThis.crypto.randomUUID()}`,
        title: values.title,
        notes: values.notes || undefined,
        priority: values.priority,
        category: values.category,
        dueDate: values.dueDate || undefined,
        createdAt: new Date().toISOString(),
      });
      toast.success("Task added to your plan");
    }
    closeForm();
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteCustomTask(pendingDelete.id);
    toast.success("Task deleted");
    if (editingId === pendingDelete.id) closeForm();
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total tasks"
          value={<AnimatedNumber value={counts.total} />}
          hint={`${counts.recommended} recommended · ${counts.custom} custom`}
          icon={ListChecks}
          accent="#07519b"
        />
        <StatCard
          label="To do"
          value={<AnimatedNumber value={counts.todo} />}
          hint="Not started"
          icon={Circle}
          accent="#f59e0b"
        />
        <StatCard
          label="In progress"
          value={<AnimatedNumber value={counts.inProgress} />}
          hint="Being worked on"
          icon={PlayCircle}
          accent="#8b5cf6"
        />
        <StatCard
          label="Completed"
          value={<AnimatedNumber value={counts.completed} />}
          hint={`${counts.percent}% of all tasks`}
          icon={CheckCircle2}
          accent="#20b84b"
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Completion progress
              </p>
              <p className="font-display text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
                <AnimatedNumber value={counts.percent} format={(n) => `${Math.round(n)}%`} />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRIORITY_OPTIONS.map((option) => (
                <Badge key={option} variant={PRIORITY_VARIANT[option]}>
                  {option} · {priorityCounts[option]}
                </Badge>
              ))}
            </div>
            <Button variant="primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden /> Add task
            </Button>
          </div>
          <div
            role="progressbar"
            aria-label="Task completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={counts.percent}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="bar-grow h-full rounded-full bg-gradient-to-r from-primary via-aqua to-teal transition-[width] duration-500"
              style={{ width: `${counts.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {counts.completed} of {counts.total} tasks complete · task progress is saved in this
            browser
          </p>
        </CardContent>
      </Card>

      <AnimatePresence initial={false}>
        {pendingDelete && (
          <motion.div
            key="delete-confirm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 dark:border-coral/30 dark:bg-coral/10">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Delete “{pendingDelete.title}”? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="danger" onClick={confirmDelete}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.div
            key={editingId ?? "new"}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <TaskForm
              initial={editingTask}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityFilter)}
                aria-label="Filter by priority"
                className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">All priorities</option>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} priority
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                aria-label="Sort tasks"
                className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="priority">Sort: Priority</option>
                <option value="due">Sort: Due date</option>
                <option value="newest">Sort: Newest</option>
              </select>
            </div>
          }
        >
          <CardTitle subtitle={`Showing ${filtered.length} of ${tasks.length} tasks`}>
            Action plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="tablist"
            aria-label="Filter tasks by status"
            className="mb-3 flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1 dark:bg-slate-800/50"
          >
            {tabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "focus-ring relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "text-primary dark:text-aqua"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`task-status-pill-${pillId}`}
                      className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-900"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">
                    {tab.label}
                    <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                      {tab.count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No tasks match this view.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try another status or priority filter, or add your own task.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setPriority("all");
                  }}
                >
                  Clear filters
                </Button>
                <Button size="sm" variant="primary" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Add task
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {filtered.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    status={statusOf(task)}
                    onStatusChange={(status) => setTaskStatus(task.id, status)}
                    onEdit={
                      task.source === "custom" ? () => openEdit(task.id) : undefined
                    }
                    onDelete={
                      task.source === "custom"
                        ? () => setPendingDelete(task)
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
