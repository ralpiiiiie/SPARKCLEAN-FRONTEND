import { Gauge, RefreshCw, TrendingDown } from "lucide-react";
import { apiService } from "../../services/api";
import { useApiResource } from "../../hooks/useApiResource";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { PanelError, PanelLoading } from "../ui/PanelState";
import { StatCard } from "../ui/StatCard";
import { peso } from "../../lib/metrics";
import { CHART } from "../charts/palette";

export function PerformancePanel() {
  const { data, status, error, reload } = useApiResource(
    () => apiService.getPerformanceImprovement(),
    [],
  );

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <Badge variant="success" dot>
              Server-computed
            </Badge>
            <Button variant="ghost" size="sm" onClick={reload} disabled={status === "loading"}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        }
      >
        <CardTitle subtitle="Quantified opportunity from rush penalties, storage costs and routing efficiency">
          Performance Improvement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && <PanelLoading label="Calculating opportunity…" />}
        {status === "error" && (
          <PanelError message={error ?? "Could not load the performance analysis"} onRetry={reload} />
        )}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Rush penalty"
                value={peso(data.rushCost)}
                hint={`${data.rushLoads.toLocaleString()} orders still received · ₱${data.rushCostPerLoad}/load`}
                icon={Gauge}
                accent={CHART.amber}
              />
              <StatCard
                label="Storage penalty"
                value={peso(data.storageCost)}
                hint={`${data.storageLoads.toLocaleString()} orders ready but undelivered · ₱${data.storageCostPerLoad}/load`}
                icon={Gauge}
                accent={CHART.coral}
              />
              <StatCard
                label="Routing savings"
                value={peso(data.routing.savings)}
                hint={`${data.routing.savingsPct.toFixed(1)}% below the proportional baseline`}
                icon={TrendingDown}
                accent={CHART.teal}
              />
              <StatCard
                label="Net opportunity"
                value={peso(Math.abs(data.totalOpportunity))}
                hint={
                  data.totalOpportunity >= 0
                    ? "Savings exceed penalties"
                    : "Penalties currently exceed routing savings"
                }
                icon={TrendingDown}
                accent={CHART.primary}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Optimized delivery cost
                </p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums dark:text-white">
                  <AnimatedNumber value={data.routing.optimizedCost} format={(n) => peso(n)} />
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Baseline: {peso(data.routing.baselineCost)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Active assumption set
                </p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                  {data.assumption?.name ?? "App settings"}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Combined penalty exposure: {peso(data.penaltyCost)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
