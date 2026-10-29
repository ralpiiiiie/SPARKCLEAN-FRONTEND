import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";

export function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-coral/10">
          <AlertCircle className="h-6 w-6 text-coral" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Couldn’t load analytics data
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The workspace is unavailable right now. Try again in a moment.
        </p>
        <Button variant="primary" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </Card>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="skeleton h-3 w-56" />
        <div className="skeleton h-7 w-80" />
        <div className="skeleton h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="skeleton h-[320px] lg:col-span-2" />
        <div className="skeleton h-[320px]" />
      </div>
      <Card>
        <CardContent className="space-y-3 pt-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
