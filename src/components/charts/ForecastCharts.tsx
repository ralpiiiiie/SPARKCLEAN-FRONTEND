import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS, CHART, CHART_ANIM, CHART_SERIES, TOOLTIP_ANIM, tooltipStyle } from "./palette";
import { GRID, LINE_WIDTH, hoverDot, paddedDomain } from "./lineStyle";
import { integer, periodLabel } from "../../lib/format";
import type { ForecastPayload, ForecastServiceRow } from "../../types";

/**
 * Supporting charts for the Predictive page.
 *
 * Both of them are derived from the payload `GET /analytics/forecast` already
 * returns — recorded units, fitted values, MAD and forecast — for whichever
 * horizon is selected, so no extra request is needed. Colours come only from
 * the shared chart palette, and the line chart reuses the app's smooth,
 * marker-free series style.
 */

/** Height shared by the two charts so the row lines up. */
const ROW_HEIGHT = "h-[240px]";

/** Services keep the same colour they already have in the small multiples. */
const colorFor = (index: number) => CHART_SERIES[index % CHART_SERIES.length];

const round1 = (value: number) => Math.round(value * 100) / 100;

const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;

/**
 * Axis limits snapped to a readable step, so the bars fill the panel without
 * the tick labels turning into quarters of an odd number.
 */
function niceLimit(raw: number): number {
  const unit = 10 ** Math.floor(Math.log10(Math.max(raw, 0.001)));
  return (
    [1, 2, 4, 5, 8, 10].map((m) => m * unit).find((step) => step >= raw) ?? 10 * unit
  );
}

/** Symmetric about zero, with whole-number ticks at halves. */
const symmetricTicks = (limit: number) =>
  [-limit, -limit / 2, 0, limit / 2, limit].map(round1);

/** One tooltip body shared by the two charts below. */
function TipBody({
  title,
  note,
  lines,
}: {
  title: string;
  note?: ReactNode;
  lines: Array<{ label: ReactNode; value: ReactNode; color?: string }>;
}) {
  return (
    <div style={tooltipStyle} className="rounded-xl px-3 py-2">
      <p className="text-[11px] font-medium tracking-[0.08em] uppercase opacity-70">{title}</p>
      <dl className="mt-1 space-y-0.5 text-[11px] tabular-nums">
        {lines.map((line, index) => (
          <div key={index} className="flex justify-between gap-4">
            <dt className="flex items-center gap-1.5 opacity-70">
              {line.color ? (
                <span
                  aria-hidden
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
              ) : null}
              {line.label}
            </dt>
            <dd className="font-medium">{line.value}</dd>
          </div>
        ))}
      </dl>
      {note ? (
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed opacity-70">{note}</p>
      ) : null}
    </div>
  );
}

/**
 * Axis pair for the two charts. `categoryWidth` reserves the label column,
 * `valueDomain`/`valueFormatter` belong on the numeric axis.
 */
function Axes({
  categoryKey,
  categoryWidth,
  valueDomain,
  valueFormatter,
  valueTicks,
}: {
  categoryKey: string;
  categoryWidth: number;
  valueDomain: [number, number];
  valueFormatter: (value: number) => string;
  valueTicks?: number[];
}) {
  const numeric = {
    type: "number" as const,
    stroke: AXIS.stroke,
    tickLine: false,
    axisLine: false,
    fontSize: 11,
    domain: valueDomain,
    ticks: valueTicks,
    includeHiddenTicks: true,
    tickFormatter: valueFormatter,
  };
  return (
    <>
      <XAxis
        type="category"
        dataKey={categoryKey}
        stroke={AXIS.stroke}
        tickLine={false}
        axisLine={false}
        fontSize={11}
        minTickGap={10}
        interval="preserveStartEnd"
      />
      <YAxis {...numeric} width={categoryWidth} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 1. Growth shape, indexed to the first month
 * ------------------------------------------------------------------ */

/**
 * One row per recorded period. The indexed value for a service sits under its
 * service id (that is the key the `<Line dataKey>` reads) and the raw units
 * ride along in `units` for the tooltip.
 */
interface IndexRow {
  label: string;
  isForecast: boolean;
  units: Record<string, number>;
  [serviceId: string]: string | number | boolean | Record<string, number>;
}

/**
 * The services are measured in kg, items, pieces and loads, so their absolute
 * curves cannot share an axis. Indexing every series to its own first period =
 * 100 answers what the small multiples cannot: which service is really growing
 * fastest, and whether the forecast continues that shape.
 */
export function GrowthIndexChart({ data, animate }: { data: ForecastPayload; animate: boolean }) {
  const bases = data.services.map((service) => service.points[0] || 1);
  const label = (value: string) => periodLabel(data.horizon, value);

  const rows: IndexRow[] = data.periods.map((period, periodIndex) => {
    const indexed: Record<string, number> = {};
    const units: Record<string, number> = {};
    data.services.forEach((service, index) => {
      const value = service.points[periodIndex] ?? 0;
      indexed[service.id] = round1((value / bases[index]) * 100);
      units[service.id] = value;
    });
    // Recharts reads a flat key per series, so the indexed values sit at the
    // top level of the row and the raw units stay beside them for the tooltip.
    return { label: label(period), isForecast: false, units, ...indexed };
  });

  const forecastIndexed: Record<string, number> = {};
  const forecastUnits: Record<string, number> = {};
  data.services.forEach((service, index) => {
    forecastIndexed[service.id] = round1((service.forecast / bases[index]) * 100);
    forecastUnits[service.id] = service.forecast;
  });
  rows.push({
    label: label(data.nextPeriod),
    isForecast: true,
    units: forecastUnits,
    ...forecastIndexed,
  });

  const [low, high] = paddedDomain(
    rows.flatMap((row) => data.services.map((service) => Number(row[service.id]))),
    { pad: 0.08 },
  );

  return (
    <div className={`${ROW_HEIGHT} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 14, right: 16, bottom: 0, left: -14 }}>
          <CartesianGrid {...GRID} />
          <Axes
            categoryKey="label"
            categoryWidth={40}
            valueDomain={[low, high]}
            valueFormatter={(value) => `${value}`}
          />
          <ReferenceLine
            y={100}
            stroke={AXIS.stroke}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{
              value: "first period = 100",
              position: "insideTopRight",
              fill: AXIS.stroke,
              fontSize: 10,
            }}
          />
          <Tooltip
            {...TOOLTIP_ANIM}
            cursor={{ stroke: AXIS.stroke, strokeDasharray: "3 3" }}
            content={(props) => {
              const row = (props.payload?.[0] as { payload?: IndexRow } | undefined)?.payload;
              if (!props.active || !row) return null;
              return (
                <TipBody
                  title={row.isForecast ? `${row.label} · forecast` : row.label}
                  note="100 is the same service in the first recorded period."
                  lines={data.services.map((service, index) => ({
                    label: service.name,
                    color: colorFor(index),
                    value: `${row[service.id]} · ${integer(row.units[service.id])} ${
                      service.unitLabel
                    }`,
                  }))}
                />
              );
            }}
          />
          {data.services.map((service, index) => (
            <Line
              key={service.id}
              type="monotone"
              dataKey={service.id}
              name={service.name}
              stroke={colorFor(index)}
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={hoverDot(colorFor(index))}
              legendType="none"
              {...(animate
                ? { isAnimationActive: true, ...CHART_ANIM }
                : { isAnimationActive: false })}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2. Period-by-period fit error for one service
 * ------------------------------------------------------------------ */

type ResidualRow = {
  label: string;
  residual: number | null;
  actual: number;
  fitted: number | null;
};

/**
 * The forecast chart shows the curve; this shows the miss. Each bar is the
 * recorded units minus what the model expected for that period, so the spikes
 * and shoulders carried by the reference shape stay visible as the model's
 * remaining error instead of disappearing inside the trend.
 */
export function FitResidualChart({
  service,
  data,
  animate,
}: {
  service: ForecastServiceRow;
  data: ForecastPayload;
  animate: boolean;
}) {
  const rows: ResidualRow[] = data.periods.map((period, index) => {
    const fitted = service.fitted[index] ?? null;
    const actual = service.points[index] ?? 0;
    return {
      label: periodLabel(data.horizon, period),
      residual: fitted === null ? null : round1(actual - fitted),
      actual,
      fitted,
    };
  });
  const peak = Math.max(1, ...rows.map((row) => Math.abs(row.residual ?? 0)));
  const limit = niceLimit(peak * 1.2);

  return (
    <div className={`${ROW_HEIGHT} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: -6 }}>
          <CartesianGrid {...GRID} />
          <Axes
            categoryKey="label"
            categoryWidth={44}
            valueDomain={[-limit, limit]}
            valueTicks={symmetricTicks(limit)}
            valueFormatter={(value) => `${value}`}
          />
          <ReferenceLine y={0} stroke={AXIS.stroke} strokeOpacity={0.8} />
          <Tooltip
            {...TOOLTIP_ANIM}
            cursor={{ fill: "var(--chart-grid)" }}
            content={(props) => {
              const row = (props.payload?.[0] as { payload?: ResidualRow } | undefined)?.payload;
              if (!props.active || !row) return null;
              return (
                <TipBody
                  title={row.label}
                  note={
                    row.residual === null || row.residual === 0
                      ? "The model landed on the record for this period."
                      : row.residual > 0
                        ? "Demand ran above what the model expected."
                        : "Demand fell below what the model expected."
                  }
                  lines={[
                    { label: "Recorded", value: `${integer(row.actual)} ${service.unitLabel}` },
                    { label: "Model fit", value: row.fitted === null ? "—" : integer(row.fitted) },
                    {
                      label: "Error",
                      color: (row.residual ?? 0) >= 0 ? CHART.green : CHART.coral,
                      value: row.residual === null ? "—" : signed(row.residual),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="residual"
            radius={3}
            maxBarSize={26}
            legendType="none"
            {...(animate ? { isAnimationActive: true, ...CHART_ANIM } : { isAnimationActive: false })}
          >
            {rows.map((row) => (
              <Cell
                key={row.label}
                fill={(row.residual ?? 0) >= 0 ? CHART.green : CHART.coral}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
