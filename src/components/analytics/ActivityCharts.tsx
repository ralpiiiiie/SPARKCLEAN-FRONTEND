import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatusBreakdown } from "../../lib/metrics";
import { peso } from "../../lib/metrics";
import type { SeriesPoint } from "../../lib/periods";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { cn } from "../../lib/utils";
import {
  CHART,
  AXIS,
  CHART_ANIM,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../charts/palette";

export function EmptyChart({
  message,
  height = 240,
}: {
  message: string;
  height?: number;
}) {
  return (
    <p
      className="grid place-items-center px-4 text-center text-sm text-slate-500 dark:text-slate-400"
      style={{ height }}
    >
      {message}
    </p>
  );
}

/** Bars for order volume and a line for billed revenue on a shared day/week axis. */
export function ActivityComboChart({
  points,
  weekly = false,
  animate = true,
}: {
  points: SeriesPoint[];
  weekly?: boolean;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const animated = animate && !reduced;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={AXIS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            minTickGap={weekly ? 10 : 16}
          />
          <YAxis
            yAxisId="orders"
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={40}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="revenue"
            orientation="right"
            stroke={AXIS.stroke}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={48}
            tickFormatter={(v: number) => peso(v, true).replace("₱", "")}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            {...TOOLTIP_ANIM}
            formatter={(value, name) =>
              name === "Revenue"
                ? [peso(Number(value)), "Revenue"]
                : [`${Number(value)} orders`, "Orders"]
            }
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="orders"
            dataKey="orders"
            name="Orders"
            fill={`${CHART.teal}cc`}
            radius={[5, 5, 0, 0]}
            maxBarSize={26}
            isAnimationActive={animated}
            {...CHART_ANIM}
          />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={CHART.primary}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: CHART.primary }}
            isAnimationActive={animated}
            {...CHART_ANIM}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUS_COLORS = [CHART.green, CHART.amber, CHART.blue, CHART.coral];

const pctLabel = (share: number) => {
  if (share === 0) return "0%";
  return share >= 10 ? `${Math.round(share)}%` : `${share.toFixed(1)}%`;
};

const orderLabel = (value: number) =>
  `${value.toLocaleString()} ${value === 1 ? "order" : "orders"}`;

/** Donut of completed / pending / in-progress / cancelled orders. */
export function OrderStatusDonut({
  statuses,
  animate = true,
}: {
  statuses: StatusBreakdown;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const animated = animate && !reduced;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverSource, setHoverSource] = useState<"pie" | "legend" | null>(null);

  const total = statuses.total;
  const data = [
    { name: "Completed", value: statuses.completed, color: STATUS_COLORS[0] },
    { name: "Pending", value: statuses.pending, color: STATUS_COLORS[1] },
    { name: "In progress", value: statuses.inProgress, color: STATUS_COLORS[2] },
    { name: "Cancelled", value: statuses.cancelled, color: STATUS_COLORS[3] },
  ].map((entry) => {
    const share = total > 0 ? (entry.value / total) * 100 : 0;
    return { ...entry, share, shareLabel: pctLabel(share) };
  });

  const active = activeIndex !== null ? data[activeIndex] : null;

  if (total === 0) {
    return <EmptyChart message="No orders were recorded in this period." />;
  }

  return (
    <div
      onMouseLeave={() => {
        setActiveIndex(null);
        setHoverSource(null);
      }}
    >
      <div
        role="img"
        aria-label={`Order status split for ${total.toLocaleString()} orders: ${data
          .map((entry) => `${entry.name} ${entry.value.toLocaleString()}`)
          .join(", ")}.`}
        className="relative mx-auto h-[236px] w-full max-w-[320px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={94}
              paddingAngle={3}
              cornerRadius={7}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={animated}
              animationDuration={850}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => {
                setActiveIndex(index);
                setHoverSource("pie");
              }}
            >
              {data.map((entry, i) => {
                const dimmed = activeIndex !== null && activeIndex !== i;
                return (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    fillOpacity={dimmed ? 0.3 : 1}
                    style={{ transition: "fill-opacity 200ms ease" }}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              {...TOOLTIP_ANIM}
              active={hoverSource === "legend" ? false : undefined}
              formatter={(value, name) => [
                orderLabel(Number(value)),
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-14 text-center">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
            {active ? active.name : "Total orders"}
          </p>
          <div className="relative mt-0.5 h-9 w-full">
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center font-display text-[1.75rem] font-bold text-slate-900 tabular-nums transition-all duration-200 dark:text-white",
                active ? "scale-95 opacity-0" : "scale-100 opacity-100",
              )}
            >
              <AnimatedNumber value={total} />
            </span>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center font-display text-[1.75rem] font-bold text-slate-900 tabular-nums transition-all duration-200 dark:text-white",
                active ? "scale-100 opacity-100" : "scale-95 opacity-0",
              )}
              aria-hidden={!active}
            >
              {active ? active.shareLabel : ""}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {active
              ? `${active.value.toLocaleString()} of ${total.toLocaleString()}`
              : "recorded orders"}
          </p>
        </div>
      </div>

      <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.map((entry, i) => {
          const isActive = activeIndex === i;
          return (
            <li
              key={entry.name}
              onMouseEnter={() => {
                setActiveIndex(i);
                setHoverSource("legend");
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors duration-200",
                isActive
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "bg-slate-50/60 dark:bg-slate-800/30",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden
                />
                <span className="truncate text-xs text-slate-600 dark:text-slate-300">
                  {entry.name}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {entry.value.toLocaleString()}
                </span>
                <span className="w-9 text-right text-[10px] text-slate-400 dark:text-slate-500">
                  {entry.shareLabel}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
