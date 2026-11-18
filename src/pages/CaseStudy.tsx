import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  MapPin,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { money } from "../lib/format";

const TABLES = [
  {
    name: "customers",
    label: "Customers",
    count: 60,
    fields: ["id", "name", "barangay", "type"],
    note: "Students, households, boarding houses and nearby businesses across 13 barangays.",
  },
  {
    name: "services",
    label: "Services",
    count: 4,
    fields: ["id", "name", "unitLabel", "price", "cost", "machineHoursPerUnit"],
    note: "The four official services. Price and cost feed every profit calculation.",
  },
  {
    name: "orders",
    label: "Orders",
    count: 192,
    fields: ["id", "serviceId", "week", "month", "units"],
    note: "Four services × 48 weeks. One volume record per service per week.",
  },
  {
    name: "payments",
    label: "Payments",
    count: 192,
    fields: ["id", "orderId", "amount", "method", "month"],
    note: "Amount is captured at payment time, so later price edits never rewrite history.",
  },
  {
    name: "machine_usage",
    label: "Machine usage",
    count: 60,
    fields: ["id", "day", "hoursAvailable", "hoursUsed"],
    note: "Thirteen machines across 60 days; every row logs used against available hours.",
  },
  {
    name: "marketing_campaigns",
    label: "Marketing campaigns",
    count: 50,
    fields: ["id", "channel", "cost", "leads"],
    note: "Facebook, flyers, referral, tarpaulin and promo spend with the leads each produced.",
  },
] as const;

const SERVICES = [
  { name: "Wash & Fold", unit: "kg", price: 60, cost: 25, hours: 0.12 },
  { name: "Dry Cleaning", unit: "item", price: 150, cost: 70, hours: 0.5 },
  { name: "Comforters", unit: "piece", price: 250, cost: 100, hours: 1.5 },
  { name: "Self-Service", unit: "load", price: 120, cost: 55, hours: 0.9 },
] as const;

const STAGES = [
  {
    key: "descriptive",
    to: "/descriptive",
    icon: BarChart3,
    label: "01 · Descriptive",
    question: "What happened?",
    points: [
      "Total sales, total profit and order records for the full dataset.",
      "Monthly sales and profit, so the trend is visible before any model.",
      "Profit per unit and profit per machine hour for every service.",
    ],
  },
  {
    key: "predictive",
    to: "/predictive",
    icon: TrendingUp,
    label: "02 · Predictive",
    question: "What demand should we expect next month?",
    points: [
      "A fitted linear trend for each service across 12 recorded months.",
      "Next-month units with R² so the fit can be judged, not trusted blindly.",
      "Service mix follows recorded demand instead of a flat average.",
    ],
  },
  {
    key: "prescriptive",
    to: "/prescriptive",
    icon: Sparkles,
    label: "03 · Prescriptive",
    question: "What should we process to maximise profit?",
    points: [
      "Greedy allocation of the machine-hour limit by profit per hour.",
      "Recommended units per service that never exceed forecast demand.",
      "Profit gained against the equal-split baseline, with the hours left over.",
    ],
  },
] as const;

export function CaseStudy() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Case Study · Business Analytics and Database"
        title="Spark Clean Laundry"
        description="A single-shop analytics database for Barangay Gabi, Cordova, Cebu — 60 customers, four services and the machine-hour limit that turns sales data into a processing decision."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" dot>
              Seeded dataset
            </Badge>
            <Badge variant="secondary">
              <MapPin className="h-3 w-3" aria-hidden /> Gabi, Cordova
            </Badge>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle subtitle="Background and the exact decision this project supports">
              Business problem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Spark Clean Laundry serves households, students, boarding houses and small businesses
              around Barangay Gabi. Every week the shop records how many kilos, items, pieces and
              loads it processes, who paid and how, what each service earns, and how many machine
              hours were available. Those records exist, but nothing connects them to next month's
              workload.
            </p>
            <blockquote className="rounded-3xl bg-primary/[0.05] p-5 dark:bg-aqua/[0.07]">
              <p className="text-[11px] font-medium tracking-[0.12em] text-primary uppercase dark:text-aqua">
                Problem statement
              </p>
              <p className="mt-1.5 font-display text-base leading-relaxed font-medium text-slate-900 dark:text-white">
                How many kilos or items of each service should Spark Clean process next month to
                maximise profit, given forecasted demand and a limited number of machine hours?
              </p>
            </blockquote>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" dot>
                4 official services
              </Badge>
              <Badge variant="success" dot>
                12 recorded months
              </Badge>
              <Badge variant="success" dot>
                60 to 192 rows per table
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle subtitle="One shop, one capacity constraint">
              At a glance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                ["Location", "Brgy. Gabi, Cordova, Cebu"],
                ["Hours", "6:00 AM – 9:00 PM daily"],
                ["Machines", "13 washers and dryers"],
                ["Data window", "12 months (Nov – Oct)"],
                ["Default limit", "400 machine hours"],
                ["Range", "200 – 600 machine hours"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-right font-medium text-slate-900 tabular-nums dark:text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="tables-heading" className="space-y-4">
        <div>
          <p className="section-eyebrow">Business database</p>
          <h2
            id="tables-heading"
            className="font-display text-xl font-medium text-slate-900 dark:text-white"
          >
            Six connected tables
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Row counts describe the deterministic seed. The Data Explorer can add, edit and delete
            rows, and every mutation is reflected in the analytics on the next load.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TABLES.map((table) => (
            <Card key={table.name} className="flex flex-col" hover>
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua">
                    <Database className="h-5 w-5" aria-hidden />
                  </span>
                  <Badge variant="secondary">{table.name}</Badge>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <p className="font-display text-3xl font-medium text-slate-900 tabular-nums dark:text-white">
                    {table.count.toLocaleString()}
                  </p>
                  <p className="pb-1 text-xs text-slate-400">seeded rows</p>
                </div>
                <h3 className="mt-1 font-display text-sm font-medium text-slate-900 dark:text-white">
                  {table.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {table.note}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {table.fields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10.5px] text-slate-500 dark:bg-elevated-dark dark:text-slate-400"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle subtitle="Price, cost and machine time per unit">
              Service catalogue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase dark:border-slate-800 dark:text-slate-500">
                    <th scope="col" className="pb-2 font-medium">Service</th>
                    <th scope="col" className="pb-2 text-right font-medium">Price</th>
                    <th scope="col" className="pb-2 text-right font-medium">Cost</th>
                    <th scope="col" className="pb-2 text-right font-medium">Hours / unit</th>
                  </tr>
                </thead>
                <tbody>
                  {SERVICES.map((service) => (
                    <tr
                      key={service.name}
                      className="border-b border-slate-50 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="py-2.5">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {service.name}
                        </span>
                        <span className="ml-1.5 text-[11px] text-slate-400">
                          per {service.unit}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums dark:text-slate-300">
                        {money(service.price)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 tabular-nums dark:text-slate-400">
                        {money(service.cost)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 tabular-nums dark:text-slate-400">
                        {service.hours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Dry Cleaning earns the most per machine hour ({money(160)}), while Wash &amp; Fold
              earns the most in total because its volume is far larger. That trade-off is the whole
              case.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle subtitle="The three pages follow this order">
              Analytics path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {[
                "Business database",
                "Descriptive",
                "Predictive",
                "Prescriptive",
                "Processing plan",
              ].map((step, index, list) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      index === 0
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {step}
                  </span>
                  {index < list.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-2xl bg-surface-muted/60 p-3.5 text-xs leading-relaxed text-slate-500 dark:bg-elevated-dark/50 dark:text-slate-400">
              Descriptive explains what was recorded. Predictive fits a trend and estimates next
              month's demand. Prescriptive spends the machine-hour budget where profit per hour is
              highest, so the plan is defensible and repeatable.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="stages-heading" className="space-y-4">
        <div>
          <p className="section-eyebrow">Connected analytics</p>
          <h2
            id="stages-heading"
            className="font-display text-xl font-medium text-slate-900 dark:text-white"
          >
            Descriptive → Predictive → Prescriptive
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.key} hover>
                <CardContent className="flex h-full flex-col p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-aqua/15 dark:text-aqua">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-3 text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                    {stage.label}
                  </p>
                  <h3 className="mt-0.5 font-display text-base font-medium text-slate-900 dark:text-white">
                    {stage.question}
                  </h3>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {stage.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success"
                          aria-hidden
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={stage.to}
                    className="focus-ring mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-aqua"
                  >
                    Open {stage.key} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-slate-500 dark:bg-elevated-dark dark:text-slate-400">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Seeded, reproducible and server-computed
              </p>
              <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                A seeded generator produces the same 60 customers and 192 orders on every run.
                Every percentage, forecast and recommendation is calculated by the API, never typed
                into a page.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Clock className="h-3 w-3" aria-hidden /> 400 h default
            </Badge>
            <Link to="/prescriptive">
              <Button variant="primary" size="sm">
                <Wallet className="h-3.5 w-3.5" /> Plan the month
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
