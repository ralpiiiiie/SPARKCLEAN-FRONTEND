import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}

const variants: Record<Variant, string> = {
  default:
    "bg-aqua/10 text-teal ring-1 ring-inset ring-aqua/20 dark:bg-aqua/15 dark:text-aqua",
  secondary:
    "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  success:
    "bg-success/10 text-success ring-1 ring-inset ring-success/20 dark:bg-success/15 dark:text-success-light",
  warning:
    "bg-warning/10 text-warning-hover ring-1 ring-inset ring-warning/25 dark:bg-warning/15 dark:text-warning-light",
  danger:
    "bg-coral/10 text-coral-hover ring-1 ring-inset ring-coral/20 dark:bg-coral/15 dark:text-coral-light",
  info: "bg-primary/10 text-primary-hover ring-1 ring-inset ring-primary/20 dark:bg-primary/15 dark:text-primary-light",
  purple:
    "bg-purple/10 text-purple-hover ring-1 ring-inset ring-purple/20 dark:bg-purple/15 dark:text-purple-light",
};

const dotColor: Record<Variant, string> = {
  default: "bg-teal",
  secondary: "bg-slate-400",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-coral",
  info: "bg-primary",
  purple: "bg-purple",
};

export function Badge({ children, variant = "default", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
    >
      {dot && <span className={cn("status-dot", dotColor[variant])} />}
      {children}
    </span>
  );
}
