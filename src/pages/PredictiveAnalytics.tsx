import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { PredictivePanel } from "../components/analytics/PredictivePanel";
import {
  CostAssumptionsPanel,
  ForecastWorkbench,
  ModelOverridesPanel,
} from "../components/analytics/ForecastWorkbench";
import { PerformancePanel } from "../components/analytics/PerformancePanel";
import { NotesPanel } from "../components/analytics/NotesPanel";
import {
  AnalyticsError,
  AnalyticsSkeleton,
} from "../components/analytics/AnalyticsState";
import { useBusinessData } from "../hooks/useBusinessData";

export function PredictiveAnalytics() {
  const { status, data, reload } = useBusinessData();

  if (status === "error") return <AnalyticsError onRetry={reload} />;
  if (status === "loading" || !data) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stage 2 · What will happen?"
        title="Predictive Analytics"
        description="Expected order volume, revenue and branch workload projected from recorded history. Every projection is an estimate, not a guarantee."
        actions={<Badge variant="warning">Estimates</Badge>}
      />
      <PredictivePanel data={data} />
      <ForecastWorkbench branches={data.branches} />
      <ModelOverridesPanel branches={data.branches} />
      <CostAssumptionsPanel />
      <PerformancePanel />
      <NotesPanel pageName="predictive" branches={data.branches} />
    </div>
  );
}
