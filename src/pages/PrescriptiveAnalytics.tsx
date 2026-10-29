import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { PrescriptivePanel } from "../components/analytics/PrescriptivePanel";
import { ScenarioPlanner } from "../components/analytics/ScenarioPlanner";
import { NotesPanel } from "../components/analytics/NotesPanel";
import {
  AnalyticsError,
  AnalyticsSkeleton,
} from "../components/analytics/AnalyticsState";
import { useBusinessData } from "../hooks/useBusinessData";

export function PrescriptiveAnalytics() {
  const { status, data, reload } = useBusinessData();

  if (status === "error") return <AnalyticsError onRetry={reload} />;
  if (status === "loading" || !data) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stage 3 · What should we do?"
        title="Prescriptive Analytics"
        description="Ranked actions drawn from the recorded performance and the projections in the predictive stage, each with the evidence behind it."
        actions={<Badge variant="purple">Action plan</Badge>}
      />
      <PrescriptivePanel data={data} />
      <ScenarioPlanner />
      <NotesPanel pageName="prescriptive" branches={data.branches} />
    </div>
  );
}
