import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-navy text-white hover:bg-navy-hover shadow-sm hover:shadow-md",
  primary:
    "bg-brand-gradient text-white shadow-sm hover:brightness-[1.06] hover:shadow-md",
  secondary:
    "bg-surface-muted text-slate-900 hover:bg-slate-200/80 dark:bg-elevated-dark dark:text-white dark:hover:bg-slate-700",
  outline:
    "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-surface-hover dark:bg-elevated-dark/60 dark:text-slate-200 dark:ring-border-dark dark:hover:bg-slate-800",
  ghost:
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  danger: "bg-coral text-white hover:bg-coral-hover shadow-sm hover:shadow-md",
};

const sizes = {
  sm: "h-8 gap-1.5 px-3.5 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-6 text-sm",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex items-center justify-center rounded-full font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
