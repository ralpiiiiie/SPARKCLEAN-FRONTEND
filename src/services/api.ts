import { ApiError, USE_MOCK, download, queryString, request } from "./http";
import { mockApi } from "./mock";
import type {
  Customer,
  CustomerInput,
  DashboardPayload,
  DescriptivePayload,
  ExportEntity,
  ForecastParams,
  ForecastPayload,
  ForecastQuery,
  Granularity,
  ListParams,
  MachineUsage,
  MachineUsageInput,
  MarketingCampaign,
  MarketingInput,
  OptimizePlanPayload,
  Order,
  OrderInput,
  Paged,
  Payment,
  PaymentInput,
  Service,
  ServiceInput,
  Settings,
} from "../types";

interface Envelope<T> {
  data: T;
}

/**
 * Every mock call resolves through this helper. The mock throws plain errors
 * carrying `status` and `code`; convert them once so callers only ever deal
 * with `ApiError`.
 */
function run<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const typed = error as Error & { status: number; code?: string };
      return Promise.reject(
        new ApiError(typed.status, typed.code ?? "REQUEST_FAILED", typed.message),
      );
    }
    return Promise.reject(error);
  }
}

const pageQuery = (params: ListParams): string =>
  queryString({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search?.trim() || undefined,
    sort: params.sort,
    order: params.order,
    barangay: params.barangay,
    type: params.type,
    serviceId: params.serviceId,
    method: params.method,
    channel: params.channel,
  });

/* ── Analytics ── */

export function getDashboard(signal?: AbortSignal): Promise<DashboardPayload> {
  if (USE_MOCK) return run(() => mockApi.dashboard());
  return request<DashboardPayload>("/dashboard", { signal });
}

export function getDescriptive(
  granularity: Granularity = "month",
  signal?: AbortSignal,
): Promise<DescriptivePayload> {
  if (USE_MOCK) return run(() => mockApi.descriptive({ granularity }));
  return request<DescriptivePayload>(
    `/analytics/descriptive${queryString({ granularity })}`,
    { signal },
  );
}

export function getForecast(
  params: ForecastQuery,
  signal?: AbortSignal,
): Promise<ForecastPayload> {
  if (USE_MOCK) return run(() => mockApi.forecast(params));
  return request<ForecastPayload>(
    `/analytics/forecast${queryString({
      model: params.model,
      window: params.window,
      alpha: params.alpha,
      horizon: params.horizon ?? "month",
    })}`,
    { signal },
  );
}

export function optimizePlan(
  input: { hoursAvailable: number } & ForecastParams,
  signal?: AbortSignal,
): Promise<OptimizePlanPayload> {
  if (USE_MOCK) return run(() => mockApi.optimizePlan(input));
  return request<OptimizePlanPayload>("/analytics/optimize-plan", {
    method: "POST",
    body: input,
    signal,
  });
}

/* ── Customers ── */

export function listCustomers(params: ListParams = {}): Promise<Paged<Customer>> {
  if (USE_MOCK) return run(() => mockApi.listCustomers(params));
  return request<Paged<Customer>>(`/customers${pageQuery(params)}`);
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  if (USE_MOCK) return run(() => mockApi.createCustomer(input));
  return request<Envelope<Customer>>("/customers", { method: "POST", body: input }).then(
    (result) => result.data,
  );
}

export function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  if (USE_MOCK) return run(() => mockApi.updateCustomer(id, input));
  return request<Envelope<Customer>>(`/customers/${id}`, { method: "PATCH", body: input }).then(
    (result) => result.data,
  );
}

export function deleteCustomer(id: string): Promise<void> {
  if (USE_MOCK) return run(() => mockApi.deleteCustomer(id));
  return request(`/customers/${id}`, { method: "DELETE" }).then(() => undefined);
}

/* ── Services ── */

export function listServices(params: ListParams = {}): Promise<Paged<Service>> {
  if (USE_MOCK) return run(() => mockApi.listServices(params));
  return request<Paged<Service>>(`/services${pageQuery(params)}`);
}

export function createService(input: ServiceInput): Promise<Service> {
  if (USE_MOCK) return run(() => mockApi.createService(input));
  return request<Envelope<Service>>("/services", { method: "POST", body: input }).then(
    (result) => result.data,
  );
}

export function updateService(id: string, input: Partial<ServiceInput>): Promise<Service> {
  if (USE_MOCK) return run(() => mockApi.updateService(id, input));
  return request<Envelope<Service>>(`/services/${id}`, { method: "PATCH", body: input }).then(
    (result) => result.data,
  );
}

export function deleteService(id: string): Promise<void> {
  if (USE_MOCK) return run(() => mockApi.deleteService(id));
  return request(`/services/${id}`, { method: "DELETE" }).then(() => undefined);
}

/* ── Orders ── */

export function listOrders(params: ListParams = {}): Promise<Paged<Order>> {
  if (USE_MOCK) return run(() => mockApi.listOrders(params));
  return request<Paged<Order>>(`/orders${pageQuery(params)}`);
}

export function createOrder(input: OrderInput): Promise<Order> {
  if (USE_MOCK) return run(() => mockApi.createOrder(input));
  return request<Envelope<Order>>("/orders", { method: "POST", body: input }).then(
    (result) => result.data,
  );
}

export function updateOrder(id: string, input: Partial<OrderInput>): Promise<Order> {
  if (USE_MOCK) return run(() => mockApi.updateOrder(id, input));
  return request<Envelope<Order>>(`/orders/${id}`, { method: "PATCH", body: input }).then(
    (result) => result.data,
  );
}

export function deleteOrder(id: string): Promise<void> {
  if (USE_MOCK) return run(() => mockApi.deleteOrder(id));
  return request(`/orders/${id}`, { method: "DELETE" }).then(() => undefined);
}

/* ── Payments ── */

export function listPayments(params: ListParams = {}): Promise<Paged<Payment>> {
  if (USE_MOCK) return run(() => mockApi.listPayments(params));
  return request<Paged<Payment>>(`/payments${pageQuery(params)}`);
}

export function createPayment(input: PaymentInput): Promise<Payment> {
  if (USE_MOCK) return run(() => mockApi.createPayment(input));
  return request<Envelope<Payment>>("/payments", { method: "POST", body: input }).then(
    (result) => result.data,
  );
}

export function updatePayment(id: string, input: Partial<PaymentInput>): Promise<Payment> {
  if (USE_MOCK) return run(() => mockApi.updatePayment(id, input));
  return request<Envelope<Payment>>(`/payments/${id}`, { method: "PATCH", body: input }).then(
    (result) => result.data,
  );
}

export function deletePayment(id: string): Promise<void> {
  if (USE_MOCK) return run(() => mockApi.deletePayment(id));
  return request(`/payments/${id}`, { method: "DELETE" }).then(() => undefined);
}

/* ── Machine usage ── */

export function listMachineUsage(params: ListParams = {}): Promise<Paged<MachineUsage>> {
  if (USE_MOCK) return run(() => mockApi.listMachineUsage(params));
  return request<Paged<MachineUsage>>(`/machine-usage${pageQuery(params)}`);
}

export function createMachineUsage(input: MachineUsageInput): Promise<MachineUsage> {
  if (USE_MOCK) return run(() => mockApi.createMachineUsage(input));
  return request<Envelope<MachineUsage>>("/machine-usage", { method: "POST", body: input }).then(
    (result) => result.data,
  );
}

export function updateMachineUsage(
  id: string,
  input: Partial<MachineUsageInput>,
): Promise<MachineUsage> {
  if (USE_MOCK) return run(() => mockApi.updateMachineUsage(id, input));
  return request<Envelope<MachineUsage>>(`/machine-usage/${id}`, {
    method: "PATCH",
    body: input,
  }).then((result) => result.data);
}

export function deleteMachineUsage(id: string): Promise<void> {
  if (USE_MOCK) return run(() => mockApi.deleteMachineUsage(id));
  return request(`/machine-usage/${id}`, { method: "DELETE" }).then(() => undefined);
}

/* ── Marketing campaigns ── */

export function listMarketing(params: ListParams = {}): Promise<Paged<MarketingCampaign>> {
  if (USE_MOCK) return run(() => mockApi.listMarketing(params));
  return request<Paged<MarketingCampaign>>(`/marketing${pageQuery(params)}`);
}

export function createCampaign(input: MarketingInput): Promise<MarketingCampaign> {
  if (USE_MOCK) return run(() => mockApi.createCampaign(input));
  return request<Envelope<MarketingCampaign>>("/marketing", {
    method: "POST",
    body: input,
  }).then((result) => result.data);
}

export function updateCampaign(
  id: string,
  input: Partial<MarketingInput>,
): Promise<MarketingCampaign> {
  if (USE_MOCK) return run(() => mockApi.updateCampaign(id, input));
  return request<Envelope<MarketingCampaign>>(`/marketing/${id}`, {
    method: "PATCH",
    body: input,
  }).then((result) => result.data);
}

export function deleteCampaign(id: string): Promise<void> {
  if (USE_MOCK) return run(() => mockApi.deleteCampaign(id));
  return request(`/marketing/${id}`, { method: "DELETE" }).then(() => undefined);
}

/* ── Settings ── */

export function getSettings(): Promise<Settings> {
  if (USE_MOCK) return run(() => mockApi.getSettings());
  return request<Envelope<Settings>>("/settings").then((result) => result.data);
}

export function updateSettings(input: Partial<Settings>): Promise<Settings> {
  if (USE_MOCK) return run(() => mockApi.updateSettings(input));
  return request<Envelope<Settings>>("/settings", { method: "PUT", body: input }).then(
    (result) => result.data,
  );
}

/* ── CSV exports ── */

export async function downloadEntity(entity: ExportEntity): Promise<number> {
  if (USE_MOCK) {
    const { filename, csv } = mockApi.csvFor(entity);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return blob.size;
  }
  return download(`/export/${entity}.csv`, `sparkclean-${entity}.csv`);
}
