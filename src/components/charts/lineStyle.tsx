import type { ReactElement } from "react";
import { useReducedMotion } from "framer-motion";
import { AXIS, CHART_ANIM } from "./palette";

/**
 * Shared look for every time-series line in the app.
 *
 * The reference chart is a single smooth curve with an irregular rhythm: no
 * markers on the line, round ends, light dashed horizontal gridlines, muted
 * small labels, and a Y axis that hugs the data instead of starting at zero.
 * Everything here is expressed with the existing palette and theme tokens.
 */

/** Stroke width for an actual-data line (2.5–3px in the reference). */
export const LINE_WIDTH = 2.75;

/** Props every actual-data series shares: smooth, marker-free, round joins. */
export const SMOOTH_LINE = {
  type: "monotone",
  strokeWidth: LINE_WIDTH,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  dot: false,
} as const;

/** The marker that appears where the pointer or keyboard focus lands. */
export const hoverDot = (color: string) =>
  ({
    r: 4,
    strokeWidth: 2,
    stroke: color,
    fill: "var(--chart-tooltip-bg)",
  }) as const;

/**
 * A single marker on the last recorded point, so the eye can find where the
 * history stops and the forecast begins. Every other point stays bare.
 */
export const endDot = (color: string, lastIndex: number) =>
  function EndDot(props: {
    cx?: number;
    cy?: number;
    index?: number;
  }): ReactElement {
    const { cx, cy, index } = props;
    const key = `end-dot-${String(index)}`;
    if (cx === undefined || cy === undefined || index !== lastIndex) {
      return <g key={key} />;
    }
    return (
      <g key={key}>
        <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--chart-tooltip-bg)" strokeWidth={2} />
      </g>
    );
  };

/** Horizontal dashed gridlines only, at low opacity, in the theme's grid colour. */
export const GRID = {
  strokeDasharray: "3 3",
  stroke: AXIS.grid,
  strokeOpacity: 0.6,
  vertical: false,
} as const;

/** Small muted axis labels, no tick marks and no axis line. */
export const AXIS_LINE = {
  stroke: AXIS.stroke,
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fontWeight: 400, fill: AXIS.stroke },
} as const;

function niceStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw));
  const base = 10 ** exponent;
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    if (base * multiple >= raw) return base * multiple;
  }
  return base * 10;
}

/**
 * Padded, rounded domain that hugs the data. Bar series start at zero; the
 * lines here must not, or the irregular rhythm flattens into a straight edge.
 *
 * The upper bound snaps to the tick step. The lower bound snaps to the finest
 * division of that step that still keeps the baseline above zero, so a series
 * whose minimum sits below one tick interval does not collapse back to zero.
 */
export function paddedDomain(
  values: Array<number | null | undefined>,
  options: { pad?: number; ticks?: number } = {},
): [number, number] {
  const { pad = 0.12, ticks = 4 } = options;
  const numbers = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  if (numbers.length === 0) return [0, 1];
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const span = max - min || Math.abs(max) || 1;
  const step = niceStep((span * (1 + 2 * pad)) / ticks);
  const rawLow = min - span * pad;
  const rawHigh = max + span * pad;
  const high = Math.ceil(rawHigh / step) * step;
  let low = 0;
  if (rawLow > 0) {
    for (const divisor of [1, 0.5, 0.25, 0.2, 0.1]) {
      const candidate = Math.floor(rawLow / (step * divisor)) * step * divisor;
      if (candidate > 0) {
        low = candidate;
        break;
      }
    }
  }
  return [Number(low.toFixed(6)), Number(high.toFixed(6))];
}

/** Draw-in animation that stops when the user asks for reduced motion. */
export function useLineAnimation(enabled = true) {
  const reduced = useReducedMotion();
  return enabled && !reduced
    ? { isAnimationActive: true, ...CHART_ANIM }
    : { isAnimationActive: false };
}
