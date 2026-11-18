import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full bg-slate-100/80 p-1 ring-1 ring-slate-200/50 dark:bg-elevated-dark/80 dark:ring-border-dark/50",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "focus-ring relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "text-primary dark:text-aqua"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {active && (
              <motion.span
                layoutId={reduced ? undefined : layoutId}
                className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-card-dark"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    active
                      ? "bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua"
                      : "bg-white/70 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
