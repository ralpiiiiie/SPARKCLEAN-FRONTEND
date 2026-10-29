import { useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Info,
  ListChecks,
  PlayCircle,
  Route,
  Target,
  TrendingDown,
} from "lucide-react";
import type { BusinessData } from "../../lib/business";
import { PRIORITY_ORDER } from "../../lib/analytics/tasks";
import {
  solveTransportationProblem,
  compareWithBaseline,
} from "../../lib/analytics/transportation";
import { useTaskPlanner } from "../../hooks/useTaskPlanner";
import { TaskPlanner } from "./TaskPlanner";
import { TaskRow } from "./TaskRow";
import { StatCard } from "../ui/StatCard";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { CHART } from "../charts/palette";
import { peso } from "../../lib/metrics";

const PLANT_COLORS = [CHART.primary, CHART.teal, CHART.aqua];

export function PrescriptivePanel({
  data,
  compact = false,
}: {
  data: BusinessData;
  compact?: boolean;
}) {
  const {
    tasks,
    recommended,
    counts,
    statusOf,
    setTaskStatus,
  } = useTaskPlanner(data);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => statusOf(task) !== "completed")
        .sort(
          (a, b) =>
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"),
        )
        .slice(0, 3),
    [tasks, statusOf],
  );

  const routing = useMemo(() => {
    if (!data.plants.length || !data.branches.length) return null;

    const supply = data.plants.map((p) => p.monthlyCapacity);
    const totalSupply = supply.reduce((s, v) => s + v, 0);
    if (!totalSupply) return null;

    const rawDemand = data.branches.map((b) => {
      const rows = data.demand
        .filter((d) => d.branch === b.name)
        .sort((a, c) => a.monthNo - c.monthNo)
        .slice(-3);
      return rows.length ? rows.reduce((s, r) => s + r.loads, 0) / rows.length : 0;
    });
    const rawTotal = rawDemand.reduce((s, v) => s + v, 0);
    if (!rawTotal) return null;

    const demand = rawDemand.map((v) => Math.round((v / rawTotal) * totalSupply));
    demand[demand.length - 1] += totalSupply - demand.reduce((s, v) => s + v, 0);

    const costs = data.plants.map((p) =>
      data.branches.map((b) => {
        const hit = data.costMatrix.find(
          (c) => c.branch === b.name && c.plant === p.name,
        );
        return hit?.costPerLoad ?? 10;
      }),
    );

    try {
      const solution = solveTransportationProblem({ supply, demand, costs });
      if (!solution.isFeasible || !Number.isFinite(solution.totalCost)) return null;
      const comparison = compareWithBaseline(solution, supply, demand, costs);
      const plants = data.plants.map((plant, i) => ({
        name: plant.name,
        loads: solution.allocations[i].reduce((sum, v) => sum + v, 0),
      }));
      return {
        totalCost: solution.totalCost,
        baselineCost:
          Number.isFinite(comparison.savings) && comparison.savings > 0
            ? solution.totalCost + comparison.savings
            : null,
        savingsPercent: Number.isFinite(comparison.savingsPercent)
          ? comparison.savingsPercent
          : null,
        lanes: solution.allocations.flat().filter((v) => v > 0).length,
        plants,
        totalLoads: plants.reduce((sum, p) => sum + p.loads, 0),
      };
    } catch {
      return null;
    }
  }, [data]);

  if (compact && counts.total === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Info className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          More history is needed for tailored recommendations
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {data.orders.length < 30
            ? `Only ${data.orders.length} orders are available. At least 30 records are required to support evidence-based actions.`
            : "The current records do not yet show a clear pattern that supports specific actions. Add more order history and revisit this view."}
        </p>
      </Card>
    );
  }

  if (!compact) {
    return (
      <div className="space-y-4">
        {recommended.length === 0 && (
          <Card className="border-dashed bg-slate-50/60 dark:bg-slate-800/30">
            <CardContent className="flex items-start gap-3 pt-5 text-sm text-slate-500 dark:text-slate-400">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
              <p>
                The recorded order history does not yet support specific recommendations. More
                records are needed before the engine can cite evidence for an action. You can
                still add and track your own tasks below.
              </p>
            </CardContent>
          </Card>
        )}

        <TaskPlanner data={data} />

        {routing && (
          <Card>
            <CardHeader>
              <CardTitle subtitle="Minimum-cost plant-to-branch allocation for the next demand cycle">
                Delivery Routing Outlook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Estimated delivery cost"
                  value={peso(routing.totalCost, true)}
                  hint="Next month, at current rates"
                  icon={Route}
                  accent="#07519b"
                />
                <StatCard
                  label="Savings vs simple allocation"
                  value={
                    routing.savingsPercent !== null
                      ? `${routing.savingsPercent.toFixed(0)}%`
                      : "—"
                  }
                  hint={
                    routing.baselineCost !== null
                      ? `${peso(routing.baselineCost, true)} at the proportional baseline`
                      : "Compared with shipping in proportion to demand"
                  }
                  icon={TrendingDown}
                  accent="#20b84b"
                />
                <StatCard
                  label="Active supply lanes"
                  value={routing.lanes}
                  hint={`${data.plants.length} plants · ${data.branches.length} branches`}
                  icon={Target}
                  accent="#8b5cf6"
                />
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Plant load allocation
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                    <AnimatedNumber value={routing.totalLoads} /> loads optimized
                  </p>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {routing.plants.map((plant, i) => {
                    const share =
                      routing.totalLoads > 0 ? (plant.loads / routing.totalLoads) * 100 : 0;
                    const color = PLANT_COLORS[i % PLANT_COLORS.length];
                    return (
                      <li key={plant.name}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                            <span className="truncate">{plant.name}</span>
                          </span>
                          <span className="flex-shrink-0 text-slate-500 tabular-nums dark:text-slate-400">
                            {plant.loads.toLocaleString()} loads · {share.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="bar-grow h-full rounded-full"
                            style={{ width: `${share}%`, backgroundColor: color }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Based on the latest three months of branch loads and recorded plant capacities.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Plan progress
            </p>
            <p className="text-xs font-semibold text-primary">
              <AnimatedNumber value={counts.percent} format={(n) => `${Math.round(n)}%`} />
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Plan completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={counts.percent}
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="bar-grow h-full rounded-full bg-gradient-to-r from-primary via-aqua to-teal transition-[width] duration-500"
              style={{ width: `${counts.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {counts.completed} of {counts.total} tasks complete · updates are saved in this
            browser
          </p>
        </CardContent>
      </Card>

      {upcoming.length > 0 ? (
        <ul className="space-y-2.5">
          {upcoming.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              status={statusOf(task)}
              onStatusChange={(status) => setTaskStatus(task.id, status)}
              compact
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every task in the plan is complete. Add a new action or revisit this view when new
          orders are recorded.
        </p>
      )}

      {tasks.length > upcoming.length && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {upcoming.length} open action{upcoming.length === 1 ? "" : "s"} of{" "}
          {tasks.length}. Open the full Prescriptive view to filter, edit, or add tasks.
        </p>
      )}
    </div>
  );
}
