import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Factory,
  GitBranch,
  Megaphone,
  RotateCcw,
  Route,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent } from "../components/ui/Card";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { PanelError, PanelLoading } from "../components/ui/PanelState";
import { EASE_OUT } from "../components/ui/motion";
import { cn } from "../lib/utils";
import { peso } from "../lib/metrics";
import { apiService } from "../services/api";
import { errorMessage } from "../services/http";
import { useApiResource } from "../hooks/useApiResource";
import type { Branch } from "../types/api";

type Row = Record<string, unknown>;

interface EntityDef {
  key: string;
  endpoint: string;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
  columns: string[];
  sortable: string[];
  branchAware: boolean;
  clientPaged?: boolean;
}

const ENTITIES: EntityDef[] = [
  {
    key: "orders",
    endpoint: "orders",
    label: "Orders",
    description: "Every laundry transaction with branch, service, amount and status.",
    icon: ShoppingBag,
    columns: [
      "id",
      "customerId",
      "branch",
      "serviceId",
      "kg",
      "loads",
      "amount",
      "paymentMethod",
      "status",
      "orderDate",
      "isPickup",
    ],
    sortable: ["id", "branch", "amount", "orderDate", "status", "kg", "loads"],
    branchAware: true,
  },
  {
    key: "customers",
    endpoint: "customers",
    label: "Customers",
    description: "Customer profiles, home branch, segment and loyalty tier.",
    icon: Users,
    columns: ["id", "name", "phone", "email", "address", "branch", "type", "joinDate", "loyaltyTier"],
    sortable: ["id", "name", "branch", "joinDate", "loyaltyTier"],
    branchAware: true,
  },
  {
    key: "branchMonthlyDemand",
    endpoint: "demand",
    label: "Branch Demand",
    description: "Recorded monthly laundry loads for each branch.",
    icon: Activity,
    columns: ["branch", "monthNo", "monthLabel", "loads"],
    sortable: ["branch", "monthNo", "loads", "monthLabel"],
    branchAware: true,
  },
  {
    key: "marketingCampaigns",
    endpoint: "campaigns",
    label: "Marketing",
    description: "Campaign budgets, new customers and attributed revenue.",
    icon: Megaphone,
    columns: [
      "id",
      "name",
      "channel",
      "branch",
      "startDate",
      "endDate",
      "budget",
      "newCustomers",
      "revenueGenerated",
    ],
    sortable: [
      "id",
      "name",
      "channel",
      "branch",
      "startDate",
      "budget",
      "newCustomers",
      "revenueGenerated",
    ],
    branchAware: true,
  },
  {
    key: "plantDeliveries",
    endpoint: "deliveries",
    label: "Deliveries",
    description: "Plant-to-branch delivery runs with loads, cost and status.",
    icon: Truck,
    columns: ["id", "plant", "branch", "date", "loads", "cost", "status"],
    sortable: ["id", "plant", "branch", "date", "loads", "cost", "status"],
    branchAware: true,
  },
  {
    key: "branches",
    endpoint: "branches",
    label: "Branches",
    description: "Branch locations, cities and branch managers.",
    icon: Store,
    columns: ["id", "name", "city", "lat", "lng", "manager"],
    sortable: ["id", "name", "city", "manager"],
    branchAware: false,
  },
  {
    key: "plants",
    endpoint: "plants",
    label: "Plants",
    description: "Processing plants, cities and monthly capacity.",
    icon: Factory,
    columns: ["id", "name", "city", "monthlyCapacity", "lat", "lng"],
    sortable: ["id", "name", "city"],
    branchAware: false,
  },
  {
    key: "services",
    endpoint: "services",
    label: "Services",
    description: "Service catalogue with pricing and turnaround time.",
    icon: Sparkles,
    columns: ["id", "name", "description", "pricePerKg", "turnaroundHours"],
    sortable: ["id", "name", "pricePerKg", "turnaroundHours"],
    branchAware: false,
  },
  {
    key: "deliveryCostMatrix",
    endpoint: "delivery-costs",
    label: "Cost Matrix",
    description: "Plant-to-branch delivery cost and distance per load.",
    icon: Route,
    columns: ["plant", "branch", "costPerLoad", "distanceKm"],
    sortable: ["plant", "branch", "costPerLoad", "distanceKm"],
    branchAware: true,
    clientPaged: true,
  },
];

const COVERAGE_KEYS = [
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "branchMonthlyDemand", label: "Branch demand" },
  { key: "plantDeliveries", label: "Plant deliveries" },
  { key: "marketingCampaigns", label: "Marketing campaigns" },
] as const;

const MONEY_KEYS = new Set([
  "amount",
  "cost",
  "budget",
  "revenueGenerated",
  "pricePerKg",
  "costPerLoad",
]);

const STATUS_VARIANTS: Record<
  string,
  "success" | "info" | "warning" | "danger" | "secondary"
> = {
  Delivered: "success",
  Completed: "success",
  Ready: "warning",
  "In Transit": "info",
  Washing: "info",
  Received: "secondary",
  Cancelled: "danger",
  Delayed: "danger",
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

function prettyLabel(key: string): string {
  if (key === "id") return "ID";
  const spaced = key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  return spaced.replace(/ Id$/, " ID");
}

function compareRows(a: Row, b: Row, key: string): number {
  const av = a[key];
  const bv = b[key];
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

function cellContent(key: string, value: unknown) {
  if (key === "status") {
    const text = String(value);
    return (
      <Badge variant={STATUS_VARIANTS[text] ?? "secondary"} dot>
        {text}
      </Badge>
    );
  }
  if (MONEY_KEYS.has(key) && typeof value === "number") {
    return <span className="tabular-nums">{peso(value)}</span>;
  }
  if (key === "id") {
    return <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{String(value)}</span>;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function DataExplorer() {
  const reduced = useReducedMotion();
  const [entityKey, setEntityKey] = useState(ENTITIES[0].key);
  const [branchId, setBranchId] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const entity = ENTITIES.find((e) => e.key === entityKey) ?? ENTITIES[0];

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: branches } = useApiResource(() => apiService.getBranches(), []);
  const { data: counts } = useApiResource(async () => {
    const results = await Promise.all([
      ...ENTITIES.filter((item) => !item.clientPaged).map(async (item) => {
        const page = await apiService.listCore<Row>(item.endpoint, { pageSize: 1 });
        return [item.key, page.total] as const;
      }),
      apiService.listDeliveryCosts().then((rows) => ["deliveryCostMatrix", rows.length] as const),
    ]);
    return Object.fromEntries(results) as Record<string, number>;
  }, []);

  const table = useApiResource(
    async () => {
      if (entity.clientPaged) {
        const rows = await apiService.listDeliveryCosts({
          search: debounced || undefined,
          branchId: branchId || undefined,
        });
        const sorted = sort
          ? [...rows].sort((a, b) => {
              const result = compareRows(a as unknown as Row, b as unknown as Row, sort.key);
              return sort.dir === "asc" ? result : -result;
            })
          : rows;
        return { rows: sorted as unknown as Row[], total: sorted.length };
      }
      const result = await apiService.listCore<Row>(entity.endpoint, {
        page: page + 1,
        pageSize,
        search: debounced || undefined,
        branchId: branchId || undefined,
        sort: sort?.key,
        order: sort?.dir,
      });
      return { rows: result.data, total: result.total };
    },
    [entity.key, page, pageSize, debounced, branchId, sort?.key, sort?.dir],
  );

  const rows = useMemo(() => table.data?.rows ?? [], [table.data]);
  const total = table.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = entity.clientPaged
    ? rows.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : rows;
  const from = total ? safePage * pageSize + 1 : 0;
  const to = Math.min(total, (safePage + 1) * pageSize);

  const branchOptions = (branches ?? []).map((branch: Branch) => ({
    id: branch.id,
    name: branch.name,
  }));
  const activeBranch = branchOptions.find((branch) => branch.id === branchId)?.name;

  const isFiltered = query.trim() !== "" || branchId !== "" || sort !== null;

  function selectEntity(key: string) {
    setEntityKey(key);
    setBranchId("");
    setQuery("");
    setDebounced("");
    setSort(null);
    setPage(0);
  }

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(0);
  }

  function resetFilters() {
    setQuery("");
    setDebounced("");
    setBranchId("");
    setSort(null);
    setPage(0);
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const count = await apiService.exportEntity(entity.endpoint, `${entity.endpoint}.csv`);
      toast.success(`Exported ${entity.label.toLowerCase()}`, {
        description: `${count.toLocaleString()} rows downloaded in full`,
      });
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Data Explorer"
        description="Browse every dataset behind the dashboard. Search and sort server-side, filter by branch, and export the full dataset."
        actions={
          <Button variant="primary" onClick={() => void exportCSV()} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      {/* Data coverage */}
      <Card className="border-success/20 bg-success/[0.03]">
        <CardContent className="flex flex-col gap-3 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Data coverage check
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {counts
                  ? `${COVERAGE_KEYS.filter((item) => (counts[item.key] ?? 0) >= 50).length} of ${COVERAGE_KEYS.length} core datasets hold at least 50 records each.`
                  : "Checking record coverage…"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COVERAGE_KEYS.map((item) => {
              const count = counts?.[item.key] ?? 0;
              return (
                <Badge key={item.key} variant={count >= 50 ? "success" : "secondary"} dot>
                  {item.label} · {count.toLocaleString()}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dataset picker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {ENTITIES.map((item) => {
          const selected = item.key === entityKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectEntity(item.key)}
              aria-pressed={selected}
              title={item.description}
              className={cn(
                "focus-ring rounded-[var(--radius-card)] text-left transition",
                selected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas dark:ring-offset-canvas-dark"
                  : "",
              )}
            >
              <Card
                hover
                className={cn(
                  "h-full",
                  selected && "border-primary/40 bg-primary/[0.03]",
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
                    <AnimatedNumber value={counts?.[item.key] ?? 0} />
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">records</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <div className="space-y-3 px-6 pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={`Search ${entity.label.toLowerCase()}…`}
                className="focus-ring h-10 w-full rounded-xl border border-slate-300 bg-white pr-9 pl-9 text-sm text-slate-700 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                  aria-label="Clear search"
                  className="focus-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <GitBranch className="h-4 w-4" aria-hidden />
                <span className="sr-only">Filter by branch</span>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setPage(0);
                  }}
                  disabled={!entity.branchAware}
                  className="focus-ring h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">All branches</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                variant={sort?.key === "branch" ? "primary" : "outline"}
                onClick={() => toggleSort("branch")}
                disabled={!entity.branchAware}
                title={
                  entity.branchAware
                    ? "Sort rows by branch name"
                    : "This reference table has no branch column"
                }
              >
                <ArrowUpDown className="h-4 w-4" />
                Sort by branch
                {sort?.key === "branch" && (
                  <span className="text-xs opacity-80">
                    {sort?.dir === "asc" ? "A–Z" : "Z–A"}
                  </span>
                )}
              </Button>

              {isFiltered && (
                <Button variant="ghost" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {entity.branchAware && branchOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBranchId("");
                  setPage(0);
                }}
                aria-pressed={branchId === ""}
                className={cn(
                  "focus-ring rounded-full px-3 py-1 text-xs font-medium transition",
                  branchId === ""
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                All
              </button>
              {branchOptions.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    setBranchId(branch.id);
                    setPage(0);
                  }}
                  className={cn(
                    "focus-ring rounded-full px-3 py-1 text-xs font-medium transition",
                    branchId === branch.id
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
                >
                  {branch.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800/50">
                {entity.columns.map((col) => {
                  const active = sort?.key === col;
                  const sortable = entity.sortable.includes(col);
                  return (
                    <th
                      key={col}
                      scope="col"
                      aria-sort={
                        active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"
                      }
                      className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className="focus-ring inline-flex items-center gap-1 rounded hover:text-primary"
                        >
                          {prettyLabel(col)}
                          {active ? (
                            sort?.dir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        prettyLabel(col)
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <motion.tbody
              key={`${entity.key}-${safePage}-${pageSize}-${branchId}-${debounced}-${sort?.key ?? ""}-${sort?.dir ?? ""}`}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              {visibleRows.map((row, i) => (
                <tr
                  key={`${safePage}-${i}`}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  {entity.columns.map((col) => (
                    <td
                      key={col}
                      className="max-w-[280px] truncate px-4 py-2.5 text-slate-600 dark:text-slate-300"
                    >
                      {cellContent(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </motion.tbody>
          </table>

          {table.status === "loading" && <PanelLoading label="Loading records…" />}
          {table.status === "error" && (
            <div className="p-4">
              <PanelError
                message={table.error ?? "Could not load this dataset"}
                onRetry={() => void table.reload()}
              />
            </div>
          )}
          {table.status === "ready" && visibleRows.length === 0 && (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No rows match the current filters.
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Try a different search term, branch, or reset the filters.
              </p>
              {isFiltered && (
                <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset filters
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {from.toLocaleString()}–{to.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {total.toLocaleString()}
            </span>{" "}
            {entity.label.toLowerCase()}
            {activeBranch && ` · ${activeBranch}`}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="focus-ring h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
