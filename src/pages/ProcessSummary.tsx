import { Card, CardContent } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { CheckCircle2, TrendingUp, Factory, MapPin } from 'lucide-react';
import { ProcedureTracker } from '../components/analytics/ProcedureTracker';
import { RecommendationBoard } from '../components/analytics/RecommendationBoard';
import { ReportsPanel } from '../components/analytics/ReportsPanel';
import { NotesPanel } from '../components/analytics/NotesPanel';
import { useApiResource } from '../hooks/useApiResource';
import { apiService } from '../services/api';

export function ProcessSummary() {
  const { data: branches } = useApiResource(() => apiService.getBranches(), []);

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        eyebrow="Methodology"
        title="BA Process Summary"
        description="Capstone overview — the journey from descriptive, to predictive, to prescriptive analytics."
      />

      <div className="grid gap-6">
        {[
          {
            icon: CheckCircle2,
            title: 'Descriptive Analytics',
            desc: 'Analysis of historical demand patterns showing branch-specific trends',
            metrics: ['6 branches analyzed', '27 months data', 'Statistical patterns identified'],
            color: 'aqua',
          },
          {
            icon: TrendingUp,
            title: 'Predictive Analytics',
            desc: 'Curve estimation and forecasting with model validation',
            metrics: ['3 models tested per branch', 'Validation MAD computed', 'Best models selected'],
            color: 'teal',
          },
          {
            icon: Factory,
            title: 'Prescriptive Analytics',
            desc: 'Transportation optimization for minimum cost delivery',
            metrics: ['2 plants × 6 branches', 'Cost optimization applied', 'Savings identified'],
            color: 'navy',
          },
          {
            icon: MapPin,
            title: 'Business Impact',
            desc: 'Proven improvement over current methods',
            metrics: ['MAD reduction per branch', 'Cost savings calculated', 'Repeatable process'],
            color: 'sunshine',
          },
        ].map((phase) => (
          <Card key={phase.title} hover className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-aqua/10">
                  <phase.icon className="w-6 h-6 text-teal" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-display font-semibold mb-2">{phase.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{phase.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {phase.metrics.map(metric => (
                      <span key={metric} className="px-3 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProcedureTracker />
      <RecommendationBoard />
      <ReportsPanel />
      <NotesPanel pageName="summary" branches={branches ?? []} />
    </div>
  );
}
