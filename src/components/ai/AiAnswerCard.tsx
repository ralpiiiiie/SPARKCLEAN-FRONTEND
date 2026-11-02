import { useState } from "react";
import { CalendarDays, Check, Copy, Sparkles } from "lucide-react";
import type { AiAnswer } from "../../types/ai";
import { cn } from "../../lib/utils";
import { AiChartView } from "./AiChartView";
import { AiDataTable } from "./AiDataTable";
import { formatMetric, renderInline } from "./format";

interface AiAnswerCardProps {
  answer: AiAnswer;
  isLatest: boolean;
  onFollowup?: (question: string) => void;
}

export function AiAnswerCard({ answer, isLatest, onFollowup }: AiAnswerCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(answer.answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be blocked; the answer stays readable in place.
    }
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-sm">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(18,59,112,0.04)] dark:border-border-dark dark:bg-card-dark">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {renderInline(answer.answer)}
            </p>
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Answer copied" : "Copy answer"}
              className="focus-ring -mr-1 -mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {answer.meta.degraded && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-dark dark:bg-warning/15 dark:text-warning-light">
              Computed summary — AI narration is temporarily unavailable
            </p>
          )}

          {answer.kpis.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {answer.kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-white/[0.03]"
                >
                  <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500" title={kpi.label}>
                    {kpi.label}
                  </p>
                  <p className="mt-0.5 font-display text-[15px] font-bold leading-tight text-slate-900 tabular-nums dark:text-white">
                    {formatMetric(kpi.value, kpi.format)}
                    {kpi.delta !== undefined && (
                      <span
                        className={cn(
                          "ml-1.5 align-middle text-[10px] font-semibold",
                          (kpi.trend ?? (kpi.delta >= 0 ? "up" : "down")) === "down"
                            ? "text-coral-hover dark:text-coral-light"
                            : "text-success dark:text-success-light",
                        )}
                        title={kpi.deltaLabel}
                      >
                        {kpi.delta >= 0 ? "+" : ""}
                        {kpi.delta.toFixed(1)}%
                      </span>
                    )}
                  </p>
                  {kpi.caption && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-slate-500" title={kpi.caption}>
                      {kpi.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {answer.chart && (
            <figure className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-2.5 dark:border-slate-800 dark:bg-white/[0.02]">
              <figcaption className="mb-1.5 px-0.5">
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  {answer.chart.title}
                </span>
                {answer.chart.subtitle && (
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                    {answer.chart.subtitle}
                  </span>
                )}
              </figcaption>
              <AiChartView chart={answer.chart} />
            </figure>
          )}

          {answer.table && (
            <div className="mt-3">
              <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {answer.table.title}
              </p>
              <AiDataTable table={answer.table} />
            </div>
          )}

          {answer.range && (
            <div className="mt-3 flex items-start gap-1.5 border-t border-slate-100 pt-2.5 text-[10px] leading-snug text-slate-400 dark:border-slate-800 dark:text-slate-500">
              <CalendarDays className="mt-px h-3 w-3 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {answer.range.start} → {answer.range.end}
                </span>
                {" · "}
                {answer.range.note}
              </span>
            </div>
          )}
        </div>

        {isLatest && answer.followups.length > 0 && onFollowup && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {answer.followups.slice(0, 3).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onFollowup(question)}
                className="focus-ring rounded-full border border-primary/20 bg-primary/[0.04] px-2.5 py-1 text-left text-[11px] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 dark:border-aqua/25 dark:bg-aqua/10 dark:text-aqua-light dark:hover:bg-aqua/20"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
