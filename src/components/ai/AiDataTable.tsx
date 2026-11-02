import type { AiTable } from "../../types/ai";
import { cn } from "../../lib/utils";
import { formatMetric } from "./format";

/** Renders a server-built table spec. Values are formatted, never interpreted as markup. */
export function AiDataTable({ table }: { table: AiTable }) {
  if (!table.rows.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-border-dark">
      <div className="max-h-[220px] overflow-auto">
        <table className="w-full border-collapse text-left text-[11.5px]">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-elevated-dark/95">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
                    column.align === "right" && "text-right",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-t border-slate-100 last:bg-transparent even:bg-slate-50/50 dark:border-slate-800 dark:even:bg-white/[0.02]"
              >
                {table.columns.map((column) => {
                  const raw = row[column.key];
                  const text =
                    typeof raw === "number" && column.format
                      ? formatMetric(raw, column.format)
                      : String(raw ?? "—");
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3 py-2 text-slate-700 dark:text-slate-300",
                        column.align === "right" && "text-right tabular-nums",
                        column.key === table.columns[0]?.key && "max-w-[150px] truncate font-medium text-slate-800 dark:text-slate-200",
                      )}
                      title={text}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
