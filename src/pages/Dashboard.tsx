import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Megaphone,
  PieChart as PieIcon,
  ShoppingBag,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
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
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import {
  AccentHeroCard,
  BentoBody,
  BentoCard,
  BentoGrid,
  BentoHeader,
  Chip,
  HeroStat,
  MiniStat,
  Money,
  ProgressRow,
  type AccentTone,
} from "../components/ui/Bento";
import { EmptyPanel, PanelError, PanelLoading } from "../components/ui/PanelState";
import {
  AXIS,
  CHART,
  CHART_ANIM,
  TOOLTIP_ANIM,
  tooltipStyle,
} from "../components/charts/palette";
import {
  AXIS_LINE,
  GRID,
  SMOOTH_LINE,
  endDot,
  hoverDot,
  paddedDomain,
  useLineAnimation,
} from "../components/charts/lineStyle";
import { useApiResource } from "../hooks/useApiResource";
import { getDashboard } from "../services/api";
import { integer, money, percent, shortMonth } from "../lib/format";
import type { PaymentMethod } from "../types";

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  Cash: CHART.primary,
  GCash: CHART.aqua,
  Maya: CHART.purple,
};

const CHANNEL_TONES: AccentTone[] = ["primary", "aqua", "success", "purple", "warning"];

const ANALYSIS_STEPS: {
  to: string;
  stage: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: AccentTone;
}[] = [
  {
    to: "/descriptive",
    stage: "01 · Descriptive",
    title: "What happened?",
    description: "Sales, profit per service and profit earned per machine hour.",
    icon: BarChart3,
    tone: "primary",
  },
  {
    to: "/predictive",
    stage: "02 · Predictive",
    title: "What demand comes next?",
    description: "Next-month units per service from a fitted trend and its R².",
    icon: TrendingUp,
    tone: "aqua",
  },
  {
    to: "/prescriptive",
    stage: "03 · Prescriptive",
    title: "What should we process?",
    description: "Units by service that maximise profit within the machine-hour limit.",
    icon: ShoppingBag,
    tone: "success",
  },
];

export function Dashboard() {
  const { data, status, error, reload } = useApiResource(getDashboard, []);
  const lineAnimation = useLineAnimation();

  if (status === "loading") {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Spark Clean Laundry · Brgy. Gabi, Cordova, Cebu"
          title="Business overview"
          description="Loading recorded sales, profit and machine use."
        />
        <PanelLoading label="Loading dashboard…" />
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Spark Clean Laundry · Brgy. Gabi, Cordova, Cebu"
          title="Business overview"
        />
        <PanelError
          message={error ?? "The dashboard could not be loaded."}
          onRetry={reload}
        />
      </div>
    );
  }

  const { kpis, monthlySales, paymentMix, machineHours, marketing, recentOrders } = data;
  const margin = kpis.totalSales > 0 ? (kpis.totalProfit / kpis.totalSales) * 100 : 0;
  const paymentTotal = paymentMix.reduce((sum, row) => sum + row.value, 0);
  const maxLeads = marketing.reduce((max, row) => Math.max(max, row.leads), 0);
  const utilisationTone: AccentTone =
    machineHours.utilization >= 85 ? "warning" : "success";

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Spark Clean Laundry · Brgy. Gabi, Cordova, Cebu"
        title="Business overview"
        description="Recorded sales, profit and machine use across the seeded 60-day dataset. Every figure is computed by the server."
        actions={
          <Badge variant="secondary" dot>
            Seeded dataset
          </Badge>
        }
      />

      <BentoGrid>
        {/* Hero ------------------------------------------------------- */}
        <AccentHeroCard className="col-span-12 min-w-0 xl:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <HeroStat
              label="Total sales"
              value={
                <AnimatedNumber value={kpis.totalSales} format={(v) => money(v)} />
              }
              mask
              trend={`${percent(margin)} profit margin`}
              caption="Sales net of service cost and tax-free"
            />
            <span className="mt-1 rounded-full bg-white/15 px-3 py-1 text-[10px] font-medium tracking-wide whitespace-nowrap text-white">
              12 months
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniStat
              label="Profit"
              value={
                <AnimatedNumber value={kpis.totalProfit} format={(v) => money(v, { compact: true })} />
              }
              hint="Price minus cost"
            />
            <MiniStat
              label="Orders"
              value={<AnimatedNumber value={kpis.orderRecords} />}
              hint="Paid order records"
            />
            <MiniStat
              label="Customers"
              value={<AnimatedNumber value={kpis.customers} />}
              hint="Seeded accounts"
            />
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-[11px] text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              {integer(machineHours.totalUsed)} of {integer(machineHours.totalAvailable)} machine hours used
            </span>
            <Link
              to="/descriptive"
              className="focus-ring inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 font-medium text-white transition hover:bg-white/25"
            >
              Open descriptive <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </AccentHeroCard>

        {/* Trend ------------------------------------------------------ */}
        <BentoCard className="col-span-12 min-w-0 xl:col-span-7" hover>
          <BentoHeader
            icon={TrendingUp}
            tone="aqua"
            title="Sales and profit by month"
            subtitle="Sales and profit traced over the recorded 12 months"
            action={<Chip tone="neutral">{monthlySales.length} months</Chip>}
          />
          <BentoBody>
            <div className="h-[272px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlySales.map((row) => ({
                    ...row,
                    label: shortMonth(row.month),
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid {...GRID} />
                  <XAxis {...AXIS_LINE} dataKey="label" minTickGap={8} />
                  <YAxis
                    {...AXIS_LINE}
                    width={52}
                    domain={paddedDomain(
                      monthlySales.flatMap((row) => [row.sales, row.profit]),
                      { ticks: 5 },
                    )}
                    allowDataOverflow
                    tickFormatter={(value: number) => money(value, { compact: true }).replace("₱", "")}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    {...TOOLTIP_ANIM}
                    cursor={{ stroke: AXIS.stroke, strokeDasharray: "3 3" }}
                    formatter={(value, name) => [money(Number(value)), String(name)]}
                  />
                  <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    {...SMOOTH_LINE}
                    dataKey="sales"
                    name="Sales"
                    stroke={CHART.primary}
                    activeDot={hoverDot(CHART.primary)}
                    dot={endDot(CHART.primary, monthlySales.length - 1)}
                    {...lineAnimation}
                  />
                  <Line
                    {...SMOOTH_LINE}
                    dataKey="profit"
                    name="Profit"
                    stroke={CHART.teal}
                    activeDot={hoverDot(CHART.teal)}
                    dot={endDot(CHART.teal, monthlySales.length - 1)}
                    {...lineAnimation}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </BentoBody>
        </BentoCard>

        {/* Payment mix ------------------------------------------------ */}
        <BentoCard className="col-span-12 min-w-0 lg:col-span-4">
          <BentoHeader
            icon={PieIcon}
            tone="warning"
            title="Payment mix"
            subtitle="Recorded amount by payment method"
            action={<Chip tone="neutral">{paymentMix.length} methods</Chip>}
          />
          <BentoBody>
            {paymentMix.length === 0 ? (
              <EmptyPanel title="No payments recorded" description="Payment amounts appear here after orders are paid." />
            ) : (
              <>
                <div className="relative mx-auto h-[178px] w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMix}
                        dataKey="value"
                        nameKey="method"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        isAnimationActive
                        {...CHART_ANIM}
                      >
                        {paymentMix.map((entry) => (
                          <Cell
                            key={entry.method}
                            fill={PAYMENT_COLORS[entry.method]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        {...TOOLTIP_ANIM}
                        formatter={(value, name) => [money(Number(value)), String(name)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl font-medium tracking-tight text-slate-900 tabular-nums dark:text-white">
                      <Money>{money(paymentTotal, { compact: true })}</Money>
                    </span>
                    <span className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                      Collected
                    </span>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {paymentMix.map((entry) => (
                    <li key={entry.method} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: PAYMENT_COLORS[entry.method] }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 text-slate-500 dark:text-slate-400">
                        {entry.method}
                      </span>
                      <span className="font-medium text-slate-900 tabular-nums dark:text-white">
                        <Money>{money(entry.value)}</Money>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </BentoBody>
        </BentoCard>

        {/* Machine hours ---------------------------------------------- */}
        <BentoCard className="col-span-12 min-w-0 lg:col-span-8" hover>
          <BentoHeader
            icon={Clock}
            tone="primary"
            title="Machine hours"
            subtitle="Last 14 recorded days against available capacity"
            action={
              <Chip tone={utilisationTone}>{percent(machineHours.utilization)} used</Chip>
            }
          />
          <BentoBody>
            <div className="h-[214px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={machineHours.series.map((row) => ({
                    ...row,
                    label: `D${row.day}`,
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid {...GRID} />
                  <XAxis {...AXIS_LINE} dataKey="label" minTickGap={10} />
                  <YAxis
                    {...AXIS_LINE}
                    width={44}
                    domain={paddedDomain(
                      machineHours.series.flatMap((row) => [row.used, row.available]),
                      { ticks: 4 },
                    )}
                    allowDataOverflow
                    tickFormatter={(value: number) => `${value}h`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    {...TOOLTIP_ANIM}
                    cursor={{ stroke: AXIS.stroke, strokeDasharray: "3 3" }}
                    formatter={(value, name) => [`${Number(value)} h`, String(name)]}
                    labelFormatter={(label) => `Day ${String(label).replace("D", "")}`}
                  />
                  <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    {...SMOOTH_LINE}
                    dataKey="used"
                    name="Used"
                    stroke={CHART.primary}
                    activeDot={hoverDot(CHART.primary)}
                    dot={endDot(CHART.primary, machineHours.series.length - 1)}
                    {...lineAnimation}
                  />
                  <Line
                    type="monotone"
                    dataKey="available"
                    name="Available"
                    stroke={CHART.amber}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    dot={false}
                    isAnimationActive
                    {...CHART_ANIM}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                <span className="font-medium text-slate-900 tabular-nums dark:text-white">
                  {integer(machineHours.totalUsed)}
                </span>{" "}
                hours used of {integer(machineHours.totalAvailable)} available
              </span>
              <Link
                to="/prescriptive"
                className="focus-ring inline-flex items-center gap-1 font-medium text-primary hover:underline dark:text-aqua"
              >
                Plan next month <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </BentoBody>
        </BentoCard>

        {/* Marketing -------------------------------------------------- */}
        <BentoCard className="col-span-12 min-w-0 lg:col-span-4">
          <BentoHeader
            icon={Megaphone}
            tone="purple"
            title="Leads by channel"
            subtitle="Campaign leads and recorded spend"
            action={<Chip tone="purple">{marketing.length} channels</Chip>}
          />
          <BentoBody>
            {marketing.length === 0 ? (
              <EmptyPanel title="No campaigns recorded" description="Add campaigns in Data Explorer to see channel leads." />
            ) : (
              <div className="space-y-4">
                {marketing.map((row, index) => (
                  <ProgressRow
                    key={row.channel}
                    label={row.channel}
                    value={integer(row.leads)}
                    percent={maxLeads > 0 ? (row.leads / maxLeads) * 100 : 0}
                    tone={CHANNEL_TONES[index % CHANNEL_TONES.length]}
                    hint={`${money(row.cost)} spent`}
                  />
                ))}
              </div>
            )}
          </BentoBody>
        </BentoCard>

        {/* Recent orders ---------------------------------------------- */}
        <BentoCard className="col-span-12 min-w-0 lg:col-span-8" hover>
          <BentoHeader
            icon={ShoppingBag}
            tone="success"
            title="Recent paid orders"
            subtitle="Latest records with the amount captured at payment time"
            action={
              <Link
                to="/data?tab=orders"
                className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-aqua"
              >
                Open data <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <BentoBody>
            {recentOrders.length === 0 ? (
              <EmptyPanel title="No paid orders yet" description="Orders with a payment appear in this list." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase dark:border-slate-800">
                      <th className="pb-2 pr-3 font-medium">Service</th>
                      <th className="pb-2 pr-3 font-medium">Month</th>
                      <th className="pb-2 pr-3 text-right font-medium">Week</th>
                      <th className="pb-2 pr-3 text-right font-medium">Units</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.slice(0, 6).map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-50 last:border-0 dark:border-slate-800/60"
                      >
                        <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-100">
                          {order.service}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500 dark:text-slate-400">
                          {shortMonth(order.month)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-slate-500 tabular-nums dark:text-slate-400">
                          {order.week}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-slate-700 tabular-nums dark:text-slate-200">
                          {integer(order.units)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-900 tabular-nums dark:text-white">
                          {order.amount === null ? "—" : <Money>{money(order.amount)}</Money>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BentoBody>
        </BentoCard>

        {/* Analysis path ---------------------------------------------- */}
        <BentoCard className="col-span-12 min-w-0">
          <BentoHeader
            icon={Wallet}
            tone="primary"
            title="The question this system answers"
            subtitle="How many kilos or items of each service should Spark Clean process next month to maximise profit within the available machine hours?"
            action={<Chip tone="neutral">3 stages</Chip>}
          />
          <BentoBody>
            <div className="grid gap-3 sm:grid-cols-3">
              {ANALYSIS_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.to}
                    to={step.to}
                    className="focus-ring group flex items-start gap-3 rounded-2xl bg-surface-muted/50 p-4 transition-colors hover:bg-surface-muted dark:bg-elevated-dark/40 dark:hover:bg-elevated-dark/70"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-primary ring-1 ring-slate-200/70 dark:bg-card-dark dark:text-aqua dark:ring-border-dark/70">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase dark:text-slate-500">
                        {step.stage}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 group-hover:text-primary dark:text-white dark:group-hover:text-aqua">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {step.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:text-primary dark:text-slate-600 dark:group-hover:text-aqua" />
                  </Link>
                );
              })}
            </div>
          </BentoBody>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
