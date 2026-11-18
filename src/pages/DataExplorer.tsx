import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  X,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { ZodType } from "zod";
import { toast } from "sonner";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Field, NumberInput, SelectInput, TextInput } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { EmptyPanel, PanelError } from "../components/ui/PanelState";
import { EASE_OUT } from "../components/ui/motion";
import { cn } from "../lib/utils";
import { integer, money, number } from "../lib/format";
import {
  customerFormSchema,
  machineUsageFormSchema,
  marketingFormSchema,
  orderFormSchema,
  paymentFormSchema,
  serviceFormSchema,
  validateForm,
} from "../lib/schemas";
import { errorMessage } from "../services/http";
import * as api from "../services/api";
import { useApiResource } from "../hooks/useApiResource";
import {
  BARANGAYS,
  CAMPAIGN_CHANNELS,
  CUSTOMER_TYPES,
  PAYMENT_METHODS,
  type CustomerInput,
  type ExportEntity,
  type ListParams,
  type MachineUsageInput,
  type MarketingInput,
  type Order,
  type OrderInput,
  type Paged,
  type PaymentInput,
  type Service,
  type ServiceInput,
} from "../types";

type Row = Record<string, unknown>;

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "right";
  kind?: "id" | "money" | "badge" | "number";
  render?: (row: Row) => ReactNode;
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  hint?: string;
  step?: string;
}

interface EntityDef {
  key: ExportEntity;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  columns: Column[];
  form: FieldDef[];
  schema: ZodType;
  defaults: Record<string, string>;
  searchPlaceholder: string;
  note: string;
  list: (params: ListParams) => Promise<{ data: Row[]; total: number }>;
  create: (input: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, input: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
}

function asRows<T>(promise: Promise<Paged<T>>): Promise<{ data: Row[]; total: number }> {
  return promise.then((result) => ({
    data: result.data as unknown as Row[],
    total: result.total,
  }));
}

const BADGE_VARIANTS: Record<string, "success" | "info" | "warning" | "danger" | "secondary" | "purple"> = {
  Student: "info",
  Household: "secondary",
  "Boarding house": "purple",
  Business: "warning",
  Cash: "success",
  GCash: "info",
  Maya: "purple",
  Facebook: "info",
  Flyers: "warning",
  Referral: "success",
  Tarpaulin: "purple",
  Promo: "secondary",
};

const ENTITIES: EntityDef[] = [
  {
    key: "customers",
    label: "Customers",
    singular: "Customer",
    description: "Names, barangays and customer types",
    icon: Users,
    searchPlaceholder: "Search name, barangay or ID…",
    note: "Barangay must be one of the 13 Cordova barangays used by the case.",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "name", label: "Name", sortable: true },
      { key: "barangay", label: "Barangay", sortable: true },
      { key: "type", label: "Type", sortable: true, kind: "badge" },
    ],
    form: [
      { key: "name", label: "Customer name", type: "text" },
      {
        key: "barangay",
        label: "Barangay",
        type: "select",
        options: BARANGAYS.map((value) => ({ value, label: value })),
      },
      {
        key: "type",
        label: "Customer type",
        type: "select",
        options: CUSTOMER_TYPES.map((value) => ({ value, label: value })),
      },
    ],
    schema: customerFormSchema,
    defaults: { name: "", barangay: "Gabi", type: "Household" },
    list: (params) => asRows(api.listCustomers(params)),
    create: (input) => api.createCustomer(input as unknown as CustomerInput),
    update: (id, input) => api.updateCustomer(id, input as unknown as Partial<CustomerInput>),
    remove: (id) => api.deleteCustomer(id),
  },
  {
    key: "services",
    label: "Services",
    singular: "Service",
    description: "The four services, prices, costs and machine time",
    icon: Sparkles,
    searchPlaceholder: "Search service name, unit or ID…",
    note: "Editing a price never rewrites an existing payment amount; payments keep the price captured when they were recorded.",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "name", label: "Service", sortable: true },
      { key: "unitLabel", label: "Unit" },
      { key: "price", label: "Price", sortable: true, align: "right", kind: "money" },
      { key: "cost", label: "Cost", sortable: true, align: "right", kind: "money" },
      {
        key: "machineHoursPerUnit",
        label: "Hours / unit",
        sortable: true,
        align: "right",
        kind: "number",
      },
    ],
    form: [
      { key: "name", label: "Service name", type: "text" },
      { key: "unitLabel", label: "Unit label", type: "text", hint: "kg, item, piece or load." },
      { key: "price", label: "Price", type: "number", step: "0.01" },
      { key: "cost", label: "Cost", type: "number", step: "0.01" },
      {
        key: "machineHoursPerUnit",
        label: "Machine hours per unit",
        type: "number",
        step: "0.01",
      },
    ],
    schema: serviceFormSchema,
    defaults: { name: "", unitLabel: "kg", price: "60", cost: "25", machineHoursPerUnit: "0.12" },
    list: (params) => asRows(api.listServices(params)),
    create: (input) => api.createService(input as unknown as ServiceInput),
    update: (id, input) => api.updateService(id, input as unknown as Partial<ServiceInput>),
    remove: (id) => api.deleteService(id),
  },
  {
    key: "orders",
    label: "Orders",
    singular: "Order",
    description: "Weekly volume per service with payment state",
    icon: ShoppingBag,
    searchPlaceholder: "Search service, month, method or ID…",
    note: "Month is derived from the week number: weeks 1–4 are November, 5–8 December, and so on.",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "service", label: "Service", sortable: true },
      { key: "week", label: "Week", sortable: true, align: "right", kind: "number" },
      { key: "month", label: "Month", sortable: true },
      { key: "units", label: "Units", sortable: true, align: "right", kind: "number" },
      {
        key: "paymentAmount",
        label: "Payment",
        align: "right",
        render: (row) =>
          row.paymentAmount === null ? (
            <Badge variant="secondary">Unpaid</Badge>
          ) : (
            <span className="tabular-nums">{money(Number(row.paymentAmount))}</span>
          ),
      },
    ],
    form: [
      {
        key: "serviceId",
        label: "Service",
        type: "select",
        options: [],
        hint: "Only services in the catalogue can be selected.",
      },
      { key: "week", label: "Week", type: "number", hint: "Between 1 and 48." },
      { key: "units", label: "Units", type: "number", hint: "Whole number greater than zero." },
    ],
    schema: orderFormSchema,
    defaults: { serviceId: "", week: "", units: "" },
    list: (params) => asRows(api.listOrders(params)),
    create: (input) => api.createOrder(input as unknown as OrderInput),
    update: (id, input) => api.updateOrder(id, input as unknown as Partial<OrderInput>),
    remove: (id) => api.deleteOrder(id),
  },
  {
    key: "payments",
    label: "Payments",
    singular: "Payment",
    description: "Payment method, amount and the order it settles",
    icon: Clock,
    searchPlaceholder: "Search order, service, month or method…",
    note: "The amount is calculated from the order units and the service price at save time, then frozen.",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "orderId", label: "Order", kind: "id" },
      { key: "service", label: "Service", sortable: true },
      { key: "units", label: "Units", align: "right", kind: "number" },
      { key: "amount", label: "Amount", sortable: true, align: "right", kind: "money" },
      { key: "method", label: "Method", sortable: true, kind: "badge" },
      { key: "month", label: "Month", sortable: true },
    ],
    form: [
      {
        key: "orderId",
        label: "Order",
        type: "select",
        options: [],
        hint: "An order can hold only one payment.",
      },
      {
        key: "method",
        label: "Payment method",
        type: "select",
        options: PAYMENT_METHODS.map((value) => ({ value, label: value })),
      },
    ],
    schema: paymentFormSchema,
    defaults: { orderId: "", method: "Cash" },
    list: (params) => asRows(api.listPayments(params)),
    create: (input) => api.createPayment(input as unknown as PaymentInput),
    update: (id, input) => api.updatePayment(id, input as unknown as Partial<PaymentInput>),
    remove: (id) => api.deletePayment(id),
  },
  {
    key: "machine-usage",
    label: "Machine usage",
    singular: "Machine day",
    description: "Daily used and available machine hours",
    icon: Clock,
    searchPlaceholder: "Search by day or ID…",
    note: "One row per day. Used hours cannot exceed the available hours for that day.",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "day", label: "Day", sortable: true, align: "right", kind: "number" },
      { key: "hoursAvailable", label: "Available", sortable: true, align: "right", kind: "number" },
      { key: "hoursUsed", label: "Used", sortable: true, align: "right", kind: "number" },
      {
        key: "utilization",
        label: "Utilization",
        align: "right",
        render: (row) => {
          const available = Number(row.hoursAvailable);
          const used = Number(row.hoursUsed);
          const percent = available > 0 ? (used / available) * 100 : 0;
          return (
            <span
              className={cn(
                "tabular-nums",
                percent >= 90 ? "text-warning" : "text-slate-600 dark:text-slate-300",
              )}
            >
              {percent.toFixed(0)}%
            </span>
          );
        },
      },
    ],
    form: [
      { key: "day", label: "Day", type: "number", hint: "Between 1 and 60." },
      { key: "hoursAvailable", label: "Hours available", type: "number", step: "0.1", hint: "0–24." },
      { key: "hoursUsed", label: "Hours used", type: "number", step: "0.1", hint: "Cannot exceed available." },
    ],
    schema: machineUsageFormSchema,
    defaults: { day: "", hoursAvailable: "13", hoursUsed: "10" },
    list: (params) => asRows(api.listMachineUsage(params)),
    create: (input) => api.createMachineUsage(input as unknown as MachineUsageInput),
    update: (id, input) =>
      api.updateMachineUsage(id, input as unknown as Partial<MachineUsageInput>),
    remove: (id) => api.deleteMachineUsage(id),
  },
  {
    key: "marketing",
    label: "Marketing",
    singular: "Campaign",
    description: "Campaign channels, spend and leads",
    icon: Megaphone,
    searchPlaceholder: "Search channel or ID…",
    note: "Leads and cost feed the dashboard marketing summary and the case narrative.",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "channel", label: "Channel", sortable: true, kind: "badge" },
      { key: "cost", label: "Cost", sortable: true, align: "right", kind: "money" },
      { key: "leads", label: "Leads", sortable: true, align: "right", kind: "number" },
    ],
    form: [
      {
        key: "channel",
        label: "Channel",
        type: "select",
        options: CAMPAIGN_CHANNELS.map((value) => ({ value, label: value })),
      },
      { key: "cost", label: "Campaign cost", type: "number", step: "0.01" },
      { key: "leads", label: "Leads", type: "number", hint: "Whole number, zero or more." },
    ],
    schema: marketingFormSchema,
    defaults: { channel: "Facebook", cost: "0", leads: "0" },
    list: (params) => asRows(api.listMarketing(params)),
    create: (input) => api.createCampaign(input as unknown as MarketingInput),
    update: (id, input) => api.updateCampaign(id, input as unknown as Partial<MarketingInput>),
    remove: (id) => api.deleteCampaign(id),
  },
];

const ENTITY_BY_KEY = new Map(ENTITIES.map((entity) => [entity.key, entity]));

interface RefData {
  services: Service[];
  orders: Order[];
}

interface FormState {
  mode: "create" | "edit";
  id?: string;
  values: Record<string, string>;
  errors: Record<string, string>;
}

function cellContent(column: Column, row: Row): ReactNode {
  if (column.render) return column.render(row);
  const value = row[column.key];

  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }
  if (column.kind === "badge") {
    const text = String(value);
    return (
      <Badge variant={BADGE_VARIANTS[text] ?? "secondary"} dot>
        {text}
      </Badge>
    );
  }
  if (column.kind === "money") {
    return <span className="tabular-nums">{money(Number(value))}</span>;
  }
  if (column.kind === "id") {
    return (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{String(value)}</span>
    );
  }
  if (column.kind === "number") {
    return <span className="tabular-nums">{typeof value === "number" ? number(value) : String(value)}</span>;
  }
  return String(value);
}

function defaultsFor(entity: EntityDef, reference: RefData | null): Record<string, string> {
  const values = { ...entity.defaults };
  if (entity.key === "orders" && reference?.services[0]) {
    values.serviceId = reference.services[0].id;
  }
  if (entity.key === "payments" && reference) {
    const unpaid = reference.orders.find((order) => order.paymentAmount === null);
    if (unpaid) values.orderId = unpaid.id;
  }
  return values;
}

export function DataExplorer() {
  const reduced = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const entityKey = (params.get("tab") ?? "customers") as ExportEntity;
  const entity = ENTITY_BY_KEY.get(entityKey) ?? ENTITIES[0];

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [countVersion, setCountVersion] = useState(0);
  const [refVersion, setRefVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const counts = useApiResource(async () => {
    const entries = await Promise.all(
      ENTITIES.map(async (item) => {
        const result = await item.list({ page: 1, pageSize: 1 });
        return [item.key, result.total] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<string, number>;
  }, [countVersion]);

  const reference = useApiResource(async (): Promise<RefData> => {
    const [services, orders] = await Promise.all([
      api.listServices({ page: 1, pageSize: 5000, sort: "name" }),
      api.listOrders({ page: 1, pageSize: 5000, sort: "id" }),
    ]);
    return { services: services.data, orders: orders.data };
  }, [refVersion]);

  const listParams = useMemo<ListParams>(
    () => ({
      page: page + 1,
      pageSize,
      search: debounced || undefined,
      sort: sort?.key,
      order: sort?.dir,
    }),
    [page, pageSize, debounced, sort?.key, sort?.dir],
  );

  const table = useApiResource(
    () => entity.list(listParams),
    [entity.key, page, pageSize, debounced, sort?.key, sort?.dir],
  );

  const rows = table.data?.data ?? [];
  const total = table.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const from = total ? safePage * pageSize + 1 : 0;
  const to = Math.min(total, (safePage + 1) * pageSize);
  const isFiltered = query.trim() !== "" || sort !== null;

  useEffect(() => {
    if (total > 0 && page > Math.ceil(total / pageSize) - 1) {
      setPage(Math.max(0, Math.ceil(total / pageSize) - 1));
    }
  }, [total, page, pageSize]);

  function selectEntity(key: ExportEntity) {
    setParams({ tab: key }, { replace: true });
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
    setSort(null);
    setPage(0);
  }

  function openCreate() {
    setForm({
      mode: "create",
      values: defaultsFor(entity, reference.data),
      errors: {},
    });
  }

  function openEdit(row: Row) {
    const values: Record<string, string> = {};
    for (const field of entity.form) {
      const value = row[field.key];
      values[field.key] = value === null || value === undefined ? "" : String(value);
    }
    setForm({ mode: "edit", id: String(row.id), values, errors: {} });
  }

  async function refreshAll() {
    setCountVersion((value) => value + 1);
    setRefVersion((value) => value + 1);
    await table.reload();
  }

  async function submitForm() {
    if (!form) return;
    const parsed = validateForm(entity.schema, form.values);
    if (!parsed.ok) {
      setForm({ ...form, errors: parsed.errors });
      return;
    }

    setSaving(true);
    try {
      if (form.mode === "create") {
        await entity.create(parsed.data);
        toast.success(`${entity.singular} created`);
      } else {
        await entity.update(form.id!, parsed.data);
        toast.success(`${entity.singular} updated`);
      }
      setForm(null);
      await refreshAll();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await entity.remove(String(pendingDelete.id));
      toast.success(`${entity.singular} deleted`);
      setPendingDelete(null);
      await refreshAll();
    } catch (cause) {
      toast.error(errorMessage(cause));
      setPendingDelete(null);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const size = await api.downloadEntity(entity.key);
      toast.success(`Exported ${entity.label.toLowerCase()}`, {
        description: `${(size / 1024).toFixed(1)} KB downloaded in full`,
      });
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  }

  const formFields = useMemo(() => {
    if (!form) return [];
    return entity.form.map((field) => {
      let options = field.options;
      if (field.key === "serviceId") {
        options = (reference.data?.services ?? []).map((service) => ({
          value: service.id,
          label: `${service.name} · ${money(service.price)} / ${service.unitLabel}`,
        }));
      }
      if (field.key === "orderId") {
        const currentId = form.values.orderId;
        options = (reference.data?.orders ?? [])
          .filter((order) => order.paymentAmount === null || order.id === currentId)
          .map((order) => ({
            value: order.id,
            label: `${order.id} · ${order.service} · wk ${order.week} · ${integer(order.units)} ${order.unitLabel}`,
          }));
      }
      return { ...field, options };
    });
  }, [entity.form, form, reference.data]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Workspace · Business database"
        title="Data Explorer"
        description="Search, sort and page through the six tables on the server. Add, edit or delete a row and every analytics page picks up the change on its next load."
        actions={
          <Button variant="primary" onClick={() => void exportCsv()} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      <Tabs
        ariaLabel="Business tables"
        value={entity.key}
        onChange={(key) => selectEntity(key as ExportEntity)}
        tabs={ENTITIES.map((item) => ({
          id: item.key,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <item.icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </span>
          ),
          count: counts.data?.[item.key],
        }))}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={entity.searchPlaceholder}
                aria-label={`Search ${entity.label.toLowerCase()}`}
                className="focus-ring h-10 w-full rounded-full border border-transparent bg-surface-muted/80 pr-9 pl-9 text-sm text-slate-700 transition-colors placeholder:text-slate-400 hover:bg-slate-100/80 focus:bg-white dark:bg-elevated-dark/80 dark:text-slate-200 dark:hover:bg-elevated-dark dark:focus:bg-card-dark"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                  aria-label="Clear search"
                  className="focus-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 dark:hover:bg-elevated-dark"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 tabular-nums dark:text-slate-200">
                  {total.toLocaleString()}
                </span>{" "}
                rows
              </span>
              {isFiltered && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Add {entity.singular.toLowerCase()}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {entity.note}
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-0 bg-surface-muted/60 text-left dark:bg-elevated-dark/50">
                {entity.columns.map((column) => {
                  const active = sort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"
                      }
                      className={cn(
                        "px-4 py-3 text-[10px] font-medium tracking-[0.1em] text-slate-500 uppercase dark:text-slate-400",
                        column.align === "right" && "text-right",
                      )}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            "focus-ring inline-flex items-center gap-1 rounded hover:text-primary",
                            column.align === "right" && "justify-end",
                          )}
                        >
                          {column.label}
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
                        column.label
                      )}
                    </th>
                  );
                })}
                <th scope="col" className="px-4 py-3 text-right text-[10px] font-medium tracking-[0.1em] text-slate-500 uppercase dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <motion.tbody
              key={`${entity.key}-${safePage}-${pageSize}-${debounced}-${sort?.key ?? ""}-${sort?.dir ?? ""}-${total}`}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className={cn(table.status === "loading" && rows.length > 0 && "opacity-60")}
            >
              {table.status === "loading" && rows.length === 0
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-slate-100/80 dark:border-slate-800/60">
                      {entity.columns.map((column) => (
                        <td key={column.key} className="px-4 py-3">
                          <div className="h-3 w-full max-w-[120px] animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                      </td>
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr
                      key={String(row.id)}
                      className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-surface-muted/40 dark:border-slate-800/60 dark:hover:bg-elevated-dark/40"
                    >
                      {entity.columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "max-w-[260px] truncate px-4 py-2.5 text-slate-600 dark:text-slate-300",
                            column.align === "right" && "text-right",
                          )}
                        >
                          {cellContent(column, row)}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            aria-label={`Edit ${String(row.id)}`}
                            className="focus-ring rounded-full p-1.5 text-slate-400 transition hover:bg-white hover:text-primary dark:hover:bg-slate-800 dark:hover:text-aqua"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(row)}
                            aria-label={`Delete ${String(row.id)}`}
                            className="focus-ring rounded-full p-1.5 text-slate-400 transition hover:bg-coral/10 hover:text-coral"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </motion.tbody>
          </table>
        </div>

        {table.status === "error" && (
          <div className="p-4">
            <PanelError
              message={table.error ?? "Could not load this table."}
              onRetry={() => void table.reload()}
            />
          </div>
        )}

        {table.status !== "loading" && table.status !== "error" && rows.length === 0 && (
          <div className="p-4">
            <EmptyPanel
              title="No rows match the current filters"
              description="Try another search term or reset the filters. You can also add a new record."
              action={
                <div className="flex gap-2">
                  {isFiltered && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" /> Add {entity.singular.toLowerCase()}
                  </Button>
                </div>
              }
            />
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100/80 px-5 py-4 dark:border-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium text-slate-700 tabular-nums dark:text-slate-200">
              {from.toLocaleString()}–{to.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700 tabular-nums dark:text-slate-200">
              {total.toLocaleString()}
            </span>{" "}
            {entity.label.toLowerCase()}
            {table.status === "loading" && rows.length > 0 && " · updating…"}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(0);
                }}
                className="focus-ring h-8 rounded-full border border-transparent bg-surface-muted/80 px-3 text-xs text-slate-700 transition-colors hover:bg-slate-100/80 dark:bg-elevated-dark/80 dark:text-slate-200 dark:hover:bg-elevated-dark"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
              Page {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={form !== null}
        onClose={() => {
          if (!saving) setForm(null);
        }}
        title={`${form?.mode === "edit" ? "Edit" : "Add"} ${entity.singular.toLowerCase()}`}
        description={
          form?.mode === "edit"
            ? `${entity.singular} ${form.id} · ${entity.note}`
            : entity.note
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {formFields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                htmlFor={`field-${field.key}`}
                hint={field.hint}
                className={field.type === "text" && field.key === "name" ? "sm:col-span-2" : undefined}
              >
                {field.type === "select" ? (
                  <SelectInput
                    id={`field-${field.key}`}
                    value={form?.values[field.key] ?? ""}
                    onChange={(event) => {
                      if (!form) return;
                      setForm({
                        ...form,
                        values: { ...form.values, [field.key]: event.target.value },
                        errors: { ...form.errors, [field.key]: "" },
                      });
                    }}
                  >
                    <option value="">Choose…</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectInput>
                ) : field.type === "number" ? (
                  <NumberInput
                    id={`field-${field.key}`}
                    step={field.step ?? "any"}
                    value={form?.values[field.key] ?? ""}
                    onChange={(event) => {
                      if (!form) return;
                      setForm({
                        ...form,
                        values: { ...form.values, [field.key]: event.target.value },
                        errors: { ...form.errors, [field.key]: "" },
                      });
                    }}
                  />
                ) : (
                  <TextInput
                    id={`field-${field.key}`}
                    value={form?.values[field.key] ?? ""}
                    onChange={(event) => {
                      if (!form) return;
                      setForm({
                        ...form,
                        values: { ...form.values, [field.key]: event.target.value },
                        errors: { ...form.errors, [field.key]: "" },
                      });
                    }}
                  />
                )}
                {form?.errors[field.key] && (
                  <p className="pl-1 text-xs text-coral">{form.errors[field.key]}</p>
                )}
              </Field>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100/80 pt-4 dark:border-slate-800/70">
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {form?.mode === "edit" ? "Save changes" : `Add ${entity.singular.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${entity.singular.toLowerCase()}?`}
        message={
          pendingDelete
            ? `This permanently removes ${String(pendingDelete.id)}. If another row depends on it, the server will explain what to delete first.`
            : ""
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        All rows are stored in PostgreSQL. Deleting a service with orders, or an order with a
        payment, returns a clear conflict message instead of removing dependent records.
      </p>
    </div>
  );
}
