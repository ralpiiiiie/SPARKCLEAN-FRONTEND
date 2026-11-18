/** Shared display helpers. Money is never used for calculations. */

import type { ForecastHorizon } from "../types";

export function money(value: number, options: { cents?: boolean; compact?: boolean } = {}): string {
  const { cents = false, compact = false } = options;
  if (compact) {
    const compacted = new Intl.NumberFormat("en-PH", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
    return `₱${compacted}`;
  }
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`;
}

export function number(value: number): string {
  return value.toLocaleString("en-PH", { maximumFractionDigits: 2 });
}

export function integer(value: number): string {
  return Math.round(value).toLocaleString("en-PH");
}

export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** "Nov 2025" → "Nov". Month labels are already human-readable. */
export function shortMonth(label: string): string {
  return label.split(" ")[0] ?? label;
}

/**
 * Axis-length label for one forecast period. Month labels carry a year the
 * axis has no room for; week and 15-day labels are already as short as they get.
 */
export function periodLabel(horizon: ForecastHorizon, label: string): string {
  return horizon === "month" ? shortMonth(label) : label;
}

export function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
