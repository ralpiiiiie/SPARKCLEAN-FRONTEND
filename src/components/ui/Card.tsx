import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./motion";
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
      initial={animate ? { opacity: 0, y: 10 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.08, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={cn(
        "rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)] dark:border-border-dark dark:bg-card-dark",
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
}: {
  className?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-6 pt-5 pb-3",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
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
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
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
  return <div className={cn("px-6 pt-2 pb-6", className)}>{children}</div>;
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
        "rounded-b-[var(--radius-card)] border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40",
        className,
      )}
    >
      {children}
    </div>
  );
}
