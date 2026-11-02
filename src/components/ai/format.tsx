import type { ReactNode } from "react";
import { peso } from "../../lib/metrics";
import type { MetricFormat } from "../../types/ai";

/** Format a metric value using the schema's declared format. */
export function formatMetric(
  value: number,
  format: MetricFormat = "number",
  compact = false,
): string {
  if (!Number.isFinite(value)) return "—";
  if (format === "currency") {
    return value < 0 ? `-${peso(Math.abs(value), compact)}` : peso(value, compact);
  }
  if (format === "percent") return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString("en-PH");
}

/**
 * Render the limited inline formatting the assistant may emit (`**bold**`)
 * as React nodes. No HTML is ever injected, so model output cannot execute.
 */
export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part, index) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(
        <strong key={index} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(part);
    }
  });
  return nodes;
}

export function pageContextFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return "dashboard";
  if (segment === "case-study") return "case-study";
  if (["descriptive", "predictive", "prescriptive", "process", "data", "settings"].includes(segment)) {
    return segment;
  }
  return "dashboard";
}
