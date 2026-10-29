import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { cn } from "../../lib/utils";
import { staggerChild, staggerParent } from "./motion";

export type InsightTone = "positive" | "negative" | "neutral" | "info";

export interface Insight {
  text: ReactNode;
  tone?: InsightTone;
}

const TONE_STYLES: Record<
  InsightTone,
  { icon: typeof Info; wrap: string; iconColor: string }
> = {
  positive: {
    icon: ArrowUpRight,
    wrap: "bg-success/10",
    iconColor: "text-success",
  },
  negative: {
    icon: ArrowDownRight,
    wrap: "bg-coral/10",
    iconColor: "text-coral",
  },
  neutral: {
    icon: Minus,
    wrap: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-500 dark:text-slate-400",
  },
  info: {
    icon: Info,
    wrap: "bg-primary/10",
    iconColor: "text-primary",
  },
};

export function InsightList({
  items,
  emptyText = "No notable patterns in the current data.",
  className,
}: {
  items: Insight[];
  emptyText?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (items.length === 0) {
    return (
      <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>
        {emptyText}
      </p>
    );
  }

  return (
    <motion.ul
      variants={staggerParent}
      initial={reduced ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className={cn("space-y-3", className)}
    >
      {items.map((item, i) => {
        const tone = TONE_STYLES[item.tone ?? "info"];
        const Icon = tone.icon;
        return (
          <motion.li key={i} variants={staggerChild} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                tone.wrap,
                tone.iconColor,
              )}
              aria-hidden
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {item.text}
            </p>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
