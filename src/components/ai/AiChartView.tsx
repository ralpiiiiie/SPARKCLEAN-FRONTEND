import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS, CHART, CHART_ANIM, CHART_SERIES, TOOLTIP_ANIM, tooltipStyle } from "../charts/palette";
import type { AiChart } from "../../types/ai";
import { formatMetric } from "./format";

const AXIS_TICK = { fontSize: 10.5, fill: AXIS.stroke } as const;

/**
 * Renders a server-validated chart specification with Recharts.
 * The assistant never supplies JSX, HTML or arbitrary chart options.
 */
export function AiChartView({ chart }: { chart: AiChart }) {
  if (!chart.data.length) return null;

  const format = (value: number) =>
    formatMetric(value, chart.valueFormat, true);
  const tooltipFormatter = (value: unknown) =>
    formatMetric(Number(value), chart.valueFormat);

  if (chart.type === "doughnut") {
    return <DonutChart chart={chart} />;
  }

  if (chart.type === "comparison") {
    const key = chart.series[0]?.key ?? "value";
    return (
      <div className="h-[180px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 18, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />
            <XAxis
              dataKey={chart.xKey}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: AXIS.grid }}
              interval={0}
            />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={format} width={46} />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
              contentStyle={tooltipStyle}
              formatter={tooltipFormatter}
              {...TOOLTIP_ANIM}
            />
            <Bar dataKey={key} name={chart.series[0]?.label ?? "Value"} radius={[6, 6, 0, 0]} maxBarSize={54} {...CHART_ANIM}>
              {chart.data.map((_, index) => (
                <Cell key={index} fill={index === 0 ? CHART.primary : CHART.aqua} />
              ))}
              <LabelList dataKey={key} position="top" formatter={(v: unknown) => format(Number(v))} fill={AXIS.stroke} fontSize={10.5} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const horizontal =
    chart.type === "bar" && chart.data.length >= 4 && chart.xKey !== "month" && chart.xKey !== "label";

  if (horizontal) {
    return (
      <div className="w-full min-w-0" style={{ height: Math.min(240, 42 + chart.data.length * 26) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chart.data}
            layout="vertical"
            margin={{ top: 4, right: 23, bottom: 0, left: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={AXIS.grid} />
            <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={format} />
            <YAxis
              type="category"
              dataKey={chart.xKey}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={94}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
              contentStyle={tooltipStyle}
              formatter={tooltipFormatter}
              {...TOOLTIP_ANIM}
            />
            {chart.series.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                fill={CHART_SERIES[index % CHART_SERIES.length]}
                radius={[0, 5, 5, 0]}
                maxBarSize={18}
                {...CHART_ANIM}
              >
                <LabelList
                  dataKey={series.key}
                  position="right"
                  formatter={(v: unknown) => format(Number(v))}
                  fill={AXIS.stroke}
                  fontSize={10}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "line" || chart.type === "area") {
    return <TrendChart chart={chart} />;
  }

  return (
    <div className="h-[190px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} margin={{ top: 8, right: 6, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />
          <XAxis
            dataKey={chart.xKey}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: AXIS.grid }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={format} width={44} />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
            contentStyle={tooltipStyle}
            formatter={tooltipFormatter}
            {...TOOLTIP_ANIM}
          />
          {chart.series.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              fill={CHART_SERIES[index % CHART_SERIES.length]}
              radius={[5, 5, 0, 0]}
              maxBarSize={36}
              {...CHART_ANIM}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendChart({ chart }: { chart: AiChart }) {
  const gradientId = useId().replace(/:/g, "");
  const isArea = chart.type === "area";
  const format = (value: number) => formatMetric(value, chart.valueFormat, true);

  const series = chart.series.map((item, index) => {
    const color = CHART_SERIES[index % CHART_SERIES.length];
    return isArea ? (
      <Area
        key={item.key}
        type="monotone"
        dataKey={item.key}
        name={item.label}
        stroke={color}
        strokeWidth={2}
        fill={`url(#${gradientId}-${index})`}
        dot={false}
        activeDot={{ r: 3.5 }}
        {...CHART_ANIM}
      />
    ) : (
      <Line
        key={item.key}
        type="monotone"
        dataKey={item.key}
        name={item.label}
        stroke={color}
        strokeWidth={2}
        dot={chart.data.length <= 14 ? { r: 2.5, strokeWidth: 0, fill: color } : false}
        activeDot={{ r: 3.5 }}
        {...CHART_ANIM}
      />
    );
  });

  return (
    <div className="h-[190px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        {isArea ? (
          <AreaChart data={chart.data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <defs>
              {chart.series.map((item, index) => (
                <linearGradient key={item.key} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_SERIES[index % CHART_SERIES.length]} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={CHART_SERIES[index % CHART_SERIES.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />
            <XAxis
              dataKey={chart.xKey}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: AXIS.grid }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={format} width={46} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown) => formatMetric(Number(value), chart.valueFormat)}
              {...TOOLTIP_ANIM}
            />
            {series}
          </AreaChart>
        ) : (
          <LineChart data={chart.data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AXIS.grid} />
            <XAxis
              dataKey={chart.xKey}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: AXIS.grid }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={format} width={46} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown) => formatMetric(Number(value), chart.valueFormat)}
              {...TOOLTIP_ANIM}
            />
            {series}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({ chart }: { chart: AiChart }) {
  const valueKey = chart.series[0]?.key ?? "value";
  const total = chart.data.reduce((sum, row) => sum + Number(row[valueKey] ?? 0), 0);

  return (
    <div className="w-full min-w-0">
      <div className="relative h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={valueKey}
              nameKey={chart.xKey}
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
              {...CHART_ANIM}
            >
              {chart.data.map((_, index) => (
                <Cell key={index} fill={CHART_SERIES[index % CHART_SERIES.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown, name: unknown) => [
                formatMetric(Number(value), chart.valueFormat),
                String(name),
              ]}
              {...TOOLTIP_ANIM}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-slate-900 tabular-nums dark:text-white">
            {formatMetric(total, chart.valueFormat)}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Total</span>
        </div>
      </div>
      <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {chart.data.map((row, index) => (
          <li key={index} className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_SERIES[index % CHART_SERIES.length] }}
            />
            <span className="truncate">{String(row[chart.xKey] ?? "—")}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {formatMetric(Number(row[valueKey] ?? 0), chart.valueFormat)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
