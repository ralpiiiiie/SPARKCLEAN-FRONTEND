import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { EASE_OUT } from "./motion";
import { CHIP_TONES, type AccentTone } from "./Bento";
import { cn } from "../../lib/utils";

export function Card({
  className,
  children,
  hover = false,
  reveal = true,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  reveal?: boolean;
}) {
  const reduced = useReducedMotion();
  const animate = reveal && !reduced;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      // A tiny threshold keeps very tall cards (for example the recommendation
      // board) from staying hidden: 8% of a 10,000px card can never fit on screen.
      viewport={{ once: true, amount: 0.01, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200/60 dark:bg-card-dark dark:ring-border-dark/70",
        hover && "card-hover",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  className,
  children,
  action,
  icon: Icon,
  tone = "primary",
}: {
  className?: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: AccentTone;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-5 pt-5 pb-2 sm:px-6 sm:pt-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl",
              CHIP_TONES[tone],
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">{children}</div>
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  subtitle,
}: {
  className?: string;
  children: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="font-display text-[15px] font-medium tracking-tight text-slate-900 dark:text-white">
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 pt-3 pb-5 sm:px-6 sm:pb-6", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-b-[var(--radius-card)] border-t border-slate-100/80 bg-surface-muted/40 px-6 py-4 dark:border-slate-800/70 dark:bg-slate-800/30",
        className,
      )}
    >
      {children}
    </div>
  );
}
