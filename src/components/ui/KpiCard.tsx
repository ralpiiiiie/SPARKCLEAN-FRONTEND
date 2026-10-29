import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  type LucideIcon,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "./AnimatedNumber";

interface KpiCardProps {
  title: string;
  value: string | number;
  format?: (value: number) => string;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  sparklineData?: number[];
  sparklineColor?: string;
  caption?: ReactNode;
  className?: string;
}

function TrendPill({ change, trend }: { change: number; trend: string }) {
  const styles =
    trend === "up"
      ? "bg-success/10 text-success dark:bg-success/15 dark:text-success-light"
      : trend === "down"
        ? "bg-coral/10 text-coral-hover dark:bg-coral/15 dark:text-coral-light"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>
        {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </span>
    </div>
  );
}

export function KpiCard({
  title,
  value,
  format,
  change,
  icon: Icon,
  trend = "neutral",
  sparklineData,
  sparklineColor = "#07519b",
  caption,
  className,
}: KpiCardProps) {
  const reduced = useReducedMotion();
  const gradId = `spark-${sparklineColor.replace("#", "")}`;
  const showSpark = !!sparklineData && sparklineData.length > 1;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduced ? undefined : { y: -4, transition: { type: "spring", stiffness: 300, damping: 22 } }}
      className={cn(
        "card-hover-subtle relative overflow-hidden rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)] dark:border-border-dark dark:bg-card-dark",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `${sparklineColor}1f` }}
        aria-hidden
      />

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${sparklineColor}1a`, color: sparklineColor }}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          {change !== undefined && (
            <TrendPill change={change} trend={trend} />
          )}
        </div>

        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        <p className="mt-1 font-display text-[1.75rem] leading-tight font-bold text-slate-900 tabular-nums dark:text-white">
          {typeof value === "number" ? (
            <AnimatedNumber value={value} format={format} />
          ) : (
            value
          )}
        </p>
        {caption && (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{caption}</p>
        )}

        {showSpark && (
          <div className="-mx-2 mt-3 h-12" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparklineData!.map((v, i) => ({ v, i }))}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                  isAnimationActive={!reduced}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
}
