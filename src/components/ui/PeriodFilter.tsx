import { useId, useMemo } from "react";
import { motion } from "framer-motion";
import { addDays, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  monthOptions,
  type PeriodPreset,
  type PeriodSelection,
  type PeriodView,
} from "../../lib/periods";
import { cn } from "../../lib/utils";
import { EASE_OUT } from "./motion";

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "last15", label: "15 days" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
];

interface PeriodFilterProps {
  view: PeriodView;
  onChange: (selection: PeriodSelection) => void;
  className?: string;
  compact?: boolean;
}

const toKey = (date: Date): string => format(date, "yyyy-MM-dd");

export function PeriodFilter({ view, onChange, className, compact }: PeriodFilterProps) {
  const pillId = useId();
  const months = useMemo(() => monthOptions(view.bounds), [view.bounds]);
  const { selection, resolved, bounds } = view;
  const anchor = selection.anchor || bounds.max;

  const selectPreset = (preset: PeriodPreset) => {
    if (preset === "custom") {
      onChange({
        ...selection,
        preset,
        customStart: selection.customStart || resolved.start,
        customEnd: selection.customEnd || resolved.end,
      });
      return;
    }
    if (preset === "weekly" || preset === "monthly") {
      onChange({ ...selection, preset, anchor: bounds.max });
      return;
    }
    onChange({ ...selection, preset });
  };

  const shiftWeek = (direction: -1 | 1) => {
    const proposed = addDays(parseISO(anchor), direction * 7);
    const earliestEnd = addDays(parseISO(bounds.min), 6);
    let next = proposed;
    if (next < earliestEnd) next = earliestEnd;
    if (toKey(next) > bounds.max) next = parseISO(bounds.max);
    onChange({ ...selection, preset: "weekly", anchor: toKey(next) });
  };

  const canGoEarlier = resolved.start > bounds.min;
  const canGoLater = anchor < bounds.max;
  const activeMonth = format(parseISO(anchor), "yyyy-MM");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Analytics period"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60"
        >
          {PRESETS.map((preset) => {
            const active = selection.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectPreset(preset.id)}
                className={cn(
                  "focus-ring relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  compact ? "px-2.5" : "",
                  active
                    ? "text-primary dark:text-aqua"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`period-preset-pill-${pillId}`}
                    className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-800"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {selection.preset === "weekly" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              disabled={!canGoEarlier}
              aria-label="Previous week"
              className="focus-ring rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7.5rem] text-center text-xs font-medium text-slate-600 dark:text-slate-300">
              {resolved.label}
            </span>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              disabled={!canGoLater}
              aria-label="Next week"
              className="focus-ring rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {selection.preset === "monthly" && (
          <select
            value={activeMonth}
            onChange={(e) =>
              onChange({
                ...selection,
                preset: "monthly",
                anchor: `${e.target.value}-01`,
              })
            }
            aria-label="Select month"
            className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        )}

        {selection.preset === "custom" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
          >
            <label className="sr-only" htmlFor="period-start">
              Start date
            </label>
            <input
              id="period-start"
              type="date"
              value={selection.customStart}
              min={bounds.min}
              max={selection.customEnd}
              onChange={(e) => onChange({ ...selection, customStart: e.target.value })}
              className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
            <span aria-hidden>to</span>
            <label className="sr-only" htmlFor="period-end">
              End date
            </label>
            <input
              id="period-end"
              type="date"
              value={selection.customEnd}
              min={selection.customStart}
              max={bounds.max}
              onChange={(e) => onChange({ ...selection, customEnd: e.target.value })}
              className="focus-ring h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </motion.div>
        )}

        {selection.preset !== "weekly" && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {resolved.label}
          </span>
        )}
      </div>
      {!compact && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {resolved.descriptor} · latest recorded data ends{" "}
          {format(parseISO(bounds.max), "MMM d, yyyy")}
        </p>
      )}
    </div>
  );
}
