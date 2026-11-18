import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="section-eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-[1.85rem] leading-[1.15] font-medium tracking-[-0.02em] text-slate-900 dark:text-white sm:text-[2.15rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap flex-shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
