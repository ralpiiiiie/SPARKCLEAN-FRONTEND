import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { EASE_OUT } from "./motion";

/* ────────────────────────────────────────────────────────────────────────────
   Bento layout primitives
   Only shape, spacing, elevation and type scale live here. Every colour is an
   existing token (primary / aqua / teal / success / warning / coral / purple /
   slate). No new hex values are introduced by this file.
   ──────────────────────────────────────────────────────────────────────────── */

export type AccentTone =
  | "primary"
  | "aqua"
  | "success"
  | "warning"
  | "coral"
  | "purple"
  | "neutral";

export const CHIP_TONES: Record<AccentTone, string> = {
  primary:
    "bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua",
  aqua:
    "bg-aqua-light text-aqua dark:bg-aqua/15 dark:text-aqua",
  success:
    "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
  warning:
    "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  coral:
    "bg-coral-light text-coral-dark dark:bg-coral/15 dark:text-coral-light",
  purple:
    "bg-purple-light text-purple-dark dark:bg-purple/15 dark:text-purple-light",
  neutral:
    "bg-surface-muted text-slate-500 dark:bg-elevated-dark dark:text-slate-400",
};

export const BAR_TONES: Record<AccentTone, string> = {
  primary: "bg-primary dark:bg-aqua",
  aqua: "bg-aqua",
  success: "bg-success",
  warning: "bg-warning",
  coral: "bg-coral",
  purple: "bg-purple",
  neutral: "bg-slate-400",
};

/** 12-column bento grid with the reference's 16–20px gutters. */
export function BentoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-12 gap-4 sm:gap-5", className)}>
      {children}
    </div>
  );
}

/**
 * Borderless, large-radius surface. `ring` replaces the old hard border with a
 * hairline that disappears against the canvas in dark mode.
 */
export function BentoCard({
  children,
  className,
  hover = false,
  reveal = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  reveal?: boolean;
}) {
  const reduced = useReducedMotion();
  const animate = reveal && !reduced;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
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

/** Card header: icon chip + title + subtitle + pill action. */
export function BentoHeader({
  icon: Icon,
  tone = "primary",
  title,
  subtitle,
  action,
  className,
}: {
  icon?: LucideIcon;
  tone?: AccentTone;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-5 pt-5 pb-1 sm:px-6 sm:pt-6",
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
        <div className="min-w-0">
          <h3 className="font-display text-[15px] leading-snug font-medium tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function BentoBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 pt-3 pb-5 sm:px-6 sm:pb-6", className)}>
      {children}
    </div>
  );
}

/** Small circular icon button used in headers and the top bar. */
export function IconButton({
  icon: Icon,
  label,
  variant = "soft",
  className,
  ...props
}: {
  icon: LucideIcon;
  label: string;
  variant?: "soft" | "ghost" | "solid";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    soft: "bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-surface-hover dark:bg-elevated-dark dark:text-slate-300 dark:ring-border-dark/70 dark:hover:bg-slate-800",
    ghost:
      "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
    solid: "bg-primary text-white hover:bg-primary-hover dark:bg-aqua dark:hover:bg-aqua/90",
  } as const;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 active:scale-95",
        styles[variant],
        className,
      )}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}

const TREND_TONES = {
  positive: {
    icon: ArrowUpRight,
    className:
      "bg-success/10 text-success-dark dark:bg-success/15 dark:text-success-light",
  },
  negative: {
    icon: ArrowDownRight,
    className:
      "bg-coral/10 text-coral-dark dark:bg-coral/15 dark:text-coral-light",
  },
  neutral: {
    icon: Minus,
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
} as const;

export function TrendChip({
  children,
  tone = "positive",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TREND_TONES;
  className?: string;
}) {
  const t = TREND_TONES[tone];
  const Icon = t.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums",
        t.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  tone?: AccentTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
        CHIP_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  );
}

/* ── Privacy ──────────────────────────────────────────────────────────────── */

interface PrivacyValue {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyValue | null>(null);

/**
 * Lightweight context (no store / no persistence changes) that lets the eye
 * toggle in the hero mask every monetary figure rendered through <Money />.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo<PrivacyValue>(
    () => ({ hidden, toggle: () => setHidden((v) => !v) }),
    [hidden],
  );
  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyValue {
  return useContext(PrivacyContext) ?? { hidden: false, toggle: () => {} };
}

export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? "Show monetary values" : "Hide monetary values"}
      aria-pressed={hidden}
      className={cn(
        "focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25",
        className,
      )}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

/** Renders a formatted amount, respecting the hero's privacy toggle. */
export function Money({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { hidden } = usePrivacy();
  return (
    <span className={cn("tabular-nums", className)}>
      {hidden ? <span aria-label="Amount hidden">₱ ••••</span> : children}
    </span>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function SparkleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.4l1.75 5.85L19.6 10l-5.85 1.75L12 17.6l-1.75-5.85L4.4 10l5.85-1.75L12 2.4Z"
        fill="currentColor"
      />
      <path
        d="M18.8 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
        fill="currentColor"
        opacity=".55"
      />
    </svg>
  );
}

/**
 * Accent hero surface: brand gradient, oversized radius, decorative sparkles
 * and room for a large stat + supporting mini stats.
 */
export function AccentHeroCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--radius-card)] bg-brand-gradient p-6 text-white shadow-[var(--shadow-card)] sm:p-7",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <SparkleGlyph className="pointer-events-none absolute top-4 right-5 h-16 w-16 text-white/25" />
      <SparkleGlyph className="pointer-events-none absolute right-24 bottom-6 h-8 w-8 text-white/15" />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </section>
  );
}

/** Large figure with optional privacy eye, delta chip and caption. */
export function HeroStat({
  label,
  value,
  mask = false,
  caption,
  trend,
  action,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  mask?: boolean;
  caption?: ReactNode;
  trend?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { hidden } = usePrivacy();

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-[0.14em] text-white/70 uppercase">
          {label}
        </p>
        {mask && <PrivacyToggle />}
      </div>
      <p className="mt-2 font-display text-[2.5rem] leading-none font-medium tracking-tight text-white sm:text-[3rem]">
        {mask && hidden ? <span aria-label="Amount hidden">₱ ••••</span> : value}
      </p>
      {(caption || trend) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {trend && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
              {trend}
            </span>
          )}
          {caption && (
            <span className="text-xs text-white/70">{caption}</span>
          )}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Small supporting metric used inside the accent hero. */
export function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-3.5 py-3">
      <p className="text-[10px] font-medium tracking-[0.12em] text-white/65 uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-medium tracking-tight text-white tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-white/60">{hint}</p>}
    </div>
  );
}

/* ── Data display rows ────────────────────────────────────────────────────── */

export function ProgressRow({
  label,
  value,
  percent,
  tone = "primary",
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  percent: number;
  tone?: AccentTone;
  hint?: ReactNode;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </p>
        <p className="flex-shrink-0 text-sm font-medium text-slate-900 tabular-nums dark:text-white">
          {value}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("bar-grow h-full rounded-full", BAR_TONES[tone])}
          style={{ width: `${safe}%` }}
        />
      </div>
      {hint && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function ActivityRow({
  icon: Icon,
  tone = "primary",
  title,
  subtitle,
  value,
  className,
}: {
  icon?: LucideIcon;
  tone?: AccentTone;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors",
        className,
      )}
    >
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
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-slate-800 dark:text-slate-100">
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {value && (
        <div className="flex-shrink-0 text-right text-sm font-medium text-slate-900 tabular-nums dark:text-white">
          {value}
        </div>
      )}
    </div>
  );
}

/** Segmented pill control with a sliding active pill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = "md",
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-slate-100/80 p-1 dark:bg-elevated-dark/80",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "focus-ring relative rounded-full font-medium transition-colors",
              size === "sm"
                ? "px-2.5 py-1 text-[11px]"
                : "px-3 py-1.5 text-xs",
              active
                ? "text-primary dark:text-aqua"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${ariaLabel ?? "control"}`}
                className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-card-dark"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
