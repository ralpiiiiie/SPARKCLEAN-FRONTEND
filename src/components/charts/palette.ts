// Spark Clean brand palette for every chart series.
export const CHART = {
  primary: "#07519b",
  aqua: "#168bd2",
  teal: "#168a3b",
  blue: "#38a7f2",
  purple: "#8b5cf6",
  pink: "#ec4899",
  amber: "#f59e0b",
  green: "#20b84b",
  coral: "#ef4444",
} as const;

export const CHART_SERIES = [
  CHART.primary,
  CHART.teal,
  CHART.aqua,
  CHART.purple,
  CHART.pink,
  CHART.amber,
];

/** Axis + grid colors resolve through CSS variables so dark mode swaps cleanly. */
export const AXIS = {
  stroke: "var(--chart-axis)",
  grid: "var(--chart-grid)",
} as const;

/** One timing profile for every Recharts series keeps charts in sync. */
export const CHART_ANIM = {
  animationBegin: 0,
  animationDuration: 700,
  animationEasing: "ease-out",
} as const;

export const TOOLTIP_ANIM = {
  animationDuration: 150,
  animationEasing: "ease-out",
} as const;

export const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--chart-tooltip-border)",
  backgroundColor: "var(--chart-tooltip-bg)",
  color: "var(--chart-tooltip-text)",
  boxShadow: "0 12px 32px -16px rgba(7, 81, 155, 0.45)",
  fontSize: 12,
} as const;
