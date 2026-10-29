import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { EASE_OUT } from "./motion";
import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
  className?: string;
}

/** Compact secondary metric tile used inside analytics panels. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "#07519b",
  className,
}: StatCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -30px 0px" }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={cn(
        "card-hover-subtle rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] dark:border-border-dark dark:bg-card-dark",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <span
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </motion.div>
  );
}
