import {
  customers as customersData,
  orders as ordersData,
  branchMonthlyDemand as demandData,
  marketingCampaigns as campaignsData,
  plantDeliveries as deliveriesData,
  branches as branchesData,
  plants as plantsData,
  services as servicesData,
  deliveryCostMatrix as costMatrixData,
} from "../data";
import type { Customer, Order, BranchMonthlyDemand } from "../types";
import type {
  AnalystNote,
  AppSettings,
  BaReport,
  Branch,
  CampaignInput,
  CostAssumption,
  CustomerInput,
  DashboardSummary,
  DeliveryCostInput,
  DeliveryCostMatrix,
  DemandInput,
  DemandRecord,
  DescriptivePayload,
  ForecastModelOption,
  ForecastPayload,
  ForecastRun,
  ForecastRunInput,
  MarketingCampaign,
  ModelOverride,
  NoteInput,
  NotePage,
  Paginated,
  PerformancePayload,
  Plant,
  PlantDelivery,
  PredictivePayload,
  ProcedureRun,
  ProcedureStep,
  Recommendation,
  RecommendationInput,
  RecommendationSuggestion,
  SavedView,
  Scenario,
  ScenarioComparison,
  ScenarioDetail,
  ScenarioInput,
  ScheduleItem,
  ScheduleStatus,
  Service,
  SettingsInput,
} from "../types/api";
import { ApiError, USE_MOCK, download, queryString, request } from "./http";

const ALL = { pageSize: 5000 } as const;

type ListParams = {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: string;
};

const pageQuery = (params: Record<string, string | number | boolean | undefined>) =>
  queryString(params);

class ApiService {
  private branchCache: Branch[] | null = null;

  /* ── Core reference data ── */

  async getBranches(): Promise<Branch[]> {
    if (USE_MOCK) return [...branchesData];
    const page = await request<Paginated<Branch>>(`/branches${pageQuery({ ...ALL })}`);
    this.branchCache = page.data;
    return page.data;
  }

  async getBranch(id: string): Promise<Branch | null> {
    if (USE_MOCK) return branchesData.find((b) => b.id === id) ?? null;
    try {
      return await request<Branch>(`/branches/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getPlants(): Promise<Plant[]> {
    if (USE_MOCK) return [...plantsData];
    return (await request<Paginated<Plant>>(`/plants${pageQuery({ ...ALL })}`)).data;
  }

  async getServices(): Promise<Service[]> {
    if (USE_MOCK) return [...servicesData];
    return (await request<Paginated<Service>>(`/services${pageQuery({ ...ALL })}`)).data;
  }

  private async branchIdByName(name: string): Promise<string> {
    if (!this.branchCache) await this.getBranches();
    const match = this.branchCache?.find((b) => b.name === name || b.id === name);
    if (!match) throw new ApiError(400, "UNKNOWN_BRANCH", `Unknown branch "${name}"`);
    return match.id;
  }

  /* ── Customers ── */

  async getCustomers(): Promise<Customer[]> {
    await this.delay();
    if (USE_MOCK) return [...customersData];
    return (await request<Paginated<Customer>>(`/customers${pageQuery({ ...ALL })}`)).data;
  }

  async getCustomer(id: string): Promise<Customer | null> {
    await this.delay();
    if (USE_MOCK) return customersData.find((c) => c.id === id) || null;
    try {
      return await request<Customer>(`/customers/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
    await this.delay();
    if (USE_MOCK) return { ...customer, id: `CUS${Date.now()}` };
    const input: CustomerInput = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      branchId: await this.branchIdByName(customer.branch),
      type: customer.type,
      joinDate: customer.joinDate,
      loyaltyTier: customer.loyaltyTier,
    };
    return request<Customer>("/customers", { method: "POST", body: input });
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | null> {
    await this.delay();
    if (USE_MOCK) {
      const index = customersData.findIndex((c) => c.id === id);
      if (index === -1) return null;
      customersData[index] = { ...customersData[index], ...customer };
      return customersData[index];
    }
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(customer)) {
      if (key === "id" || key === "branch") continue;
      body[key] = value;
    }
    if (customer.branch) body.branchId = await this.branchIdByName(customer.branch);
    try {
      return await request<Customer>(`/customers/${id}`, { method: "PATCH", body });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await this.delay();
    if (USE_MOCK) {
      const index = customersData.findIndex((c) => c.id === id);
      if (index === -1) return false;
      customersData.splice(index, 1);
      return true;
    }
    try {
      await request(`/customers/${id}`, { method: "DELETE" });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  }

  /* ── Orders ── */

  async getOrders(): Promise<Order[]> {
    await this.delay();
    if (USE_MOCK) return [...ordersData] as Order[];
    return (await request<Paginated<Order>>(`/orders${pageQuery({ ...ALL })}`)).data;
  }

  /* ── Demand ── */

  async getBranchDemand(branch?: string): Promise<BranchMonthlyDemand[]> {
    await this.delay();
    if (USE_MOCK) {
      if (!branch) return [...demandData];
      return demandData.filter((d) => d.branch === branch);
    }
    const records = (await request<Paginated<DemandRecord>>(`/demand${pageQuery({ ...ALL })}`)).data;
    const rows = records.map(({ branch: name, monthNo, loads, monthLabel }) => ({
      branch: name,
      monthNo,
      loads,
      monthLabel,
    }));
    return branch ? rows.filter((d) => d.branch === branch) : rows;
  }

  async listDemand(params: ListParams & { branchId?: string } = {}): Promise<Paginated<DemandRecord>> {
    return request<Paginated<DemandRecord>>(
      `/demand${pageQuery({ ...params, search: params.search })}`,
    );
  }

  async createDemand(input: DemandInput): Promise<DemandRecord> {
    return request<DemandRecord>("/demand", { method: "POST", body: input });
  }

  async updateDemand(id: number, input: Partial<DemandInput>): Promise<DemandRecord> {
    return request<DemandRecord>(`/demand/${id}`, { method: "PATCH", body: input });
  }

  async deleteDemand(id: number): Promise<void> {
    await request(`/demand/${id}`, { method: "DELETE" });
  }

  /* ── Campaigns, deliveries, cost matrix ── */

  async getCampaigns(): Promise<MarketingCampaign[]> {
    if (USE_MOCK) return [...campaignsData];
    return (await request<Paginated<MarketingCampaign>>(`/campaigns${pageQuery({ ...ALL })}`)).data;
  }

  async createCampaign(input: CampaignInput): Promise<MarketingCampaign> {
    return request<MarketingCampaign>("/campaigns", { method: "POST", body: input });
  }

  async updateCampaign(id: string, input: Partial<CampaignInput>): Promise<MarketingCampaign> {
    return request<MarketingCampaign>(`/campaigns/${id}`, { method: "PATCH", body: input });
  }

  async deleteCampaign(id: string): Promise<void> {
    await request(`/campaigns/${id}`, { method: "DELETE" });
  }

  async getDeliveries(): Promise<PlantDelivery[]> {
    if (USE_MOCK) return [...deliveriesData];
    return (await request<Paginated<PlantDelivery>>(`/deliveries${pageQuery({ ...ALL })}`)).data;
  }

  async getDeliveryCosts(): Promise<DeliveryCostMatrix[]> {
    if (USE_MOCK) return [...costMatrixData];
    return request<DeliveryCostMatrix[]>(`/delivery-costs${pageQuery({ ...ALL })}`);
  }

  async listDeliveryCosts(
    params: { search?: string; branchId?: string } = {},
  ): Promise<DeliveryCostMatrix[]> {
    return request(`/delivery-costs${pageQuery(params)}`);
  }

  async upsertDeliveryCost(input: DeliveryCostInput) {
    return request("/delivery-costs", { method: "POST", body: input });
  }

  /* ── Aggregated dataset ── */

  async getAllData() {
    await this.delay();
    if (USE_MOCK) {
      return {
        customers: customersData,
        orders: ordersData,
        branchMonthlyDemand: demandData,
        marketingCampaigns: campaignsData,
        plantDeliveries: deliveriesData,
        branches: branchesData,
        plants: plantsData,
        services: servicesData,
        deliveryCostMatrix: costMatrixData,
      };
    }

    const [customers, orders, demand, campaigns, deliveries, branches, plants, services, costs] =
      await Promise.all([
        request<Paginated<Customer>>(`/customers${pageQuery({ ...ALL })}`),
        request<Paginated<Order>>(`/orders${pageQuery({ ...ALL })}`),
        request<Paginated<DemandRecord>>(`/demand${pageQuery({ ...ALL })}`),
        request<Paginated<MarketingCampaign>>(`/campaigns${pageQuery({ ...ALL })}`),
        request<Paginated<PlantDelivery>>(`/deliveries${pageQuery({ ...ALL })}`),
        request<Paginated<Branch>>(`/branches${pageQuery({ ...ALL })}`),
        request<Paginated<Plant>>(`/plants${pageQuery({ ...ALL })}`),
        request<Paginated<Service>>(`/services${pageQuery({ ...ALL })}`),
        request<DeliveryCostMatrix[]>(`/delivery-costs`),
      ]);

    this.branchCache = branches.data;

    return {
      customers: customers.data,
      orders: orders.data,
      branchMonthlyDemand: demand.data.map(({ branch, monthNo, loads, monthLabel }) => ({
        branch,
        monthNo,
        loads,
        monthLabel,
      })),
      marketingCampaigns: campaigns.data,
      plantDeliveries: deliveries.data,
      branches: branches.data,
      plants: plants.data,
      services: services.data,
      deliveryCostMatrix: costs,
    };
  }

  /* ── Dashboard & analytics ── */

  async getDashboardSummary(params: {
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    serviceId?: string;
  } = {}): Promise<DashboardSummary> {
    return request(`/dashboard/summary${pageQuery(params)}`);
  }

  async getDescriptive(branchId?: string): Promise<DescriptivePayload> {
    return request(`/analytics/descriptive${pageQuery({ branchId })}`);
  }

  async getPredictive(branchId?: string): Promise<PredictivePayload> {
    return request(`/analytics/predictive${pageQuery({ branchId })}`);
  }

  async getForecast(params: {
    branchId: string;
    model?: ForecastModelOption;
    horizon?: number;
    validationMonths?: number;
  }): Promise<ForecastPayload> {
    return request(`/analytics/forecast${pageQuery(params)}`);
  }

  async getPerformanceImprovement(params: {
    rushCostPerLoad?: number;
    storageCostPerLoad?: number;
  } = {}): Promise<PerformancePayload> {
    return request(`/analytics/performance-improvement${pageQuery(params)}`);
  }

  /* ── Analyst notes ── */

  async getNotes(params: { pageName?: NotePage; branchId?: string } = {}): Promise<AnalystNote[]> {
    if (USE_MOCK) return [];
    return (await request<Paginated<AnalystNote>>(`/analytics/notes${pageQuery(params)}`)).data;
  }

  async createNote(input: NoteInput): Promise<AnalystNote> {
    return request("/analytics/notes", { method: "POST", body: input });
  }

  async updateNote(id: number, input: Partial<NoteInput>): Promise<AnalystNote> {
    return request(`/analytics/notes/${id}`, { method: "PATCH", body: input });
  }

  async deleteNote(id: number): Promise<void> {
    await request(`/analytics/notes/${id}`, { method: "DELETE" });
  }

  /* ── Saved views ── */

  async getSavedViews(pageName: string): Promise<SavedView[]> {
    if (USE_MOCK) return [];
    return (await request<Paginated<SavedView>>(`/analytics/saved-views${pageQuery({ pageName })}`))
      .data;
  }

  async createSavedView(input: {
    name: string;
    page: string;
    filtersJson: Record<string, unknown>;
    isDefault?: boolean;
  }): Promise<SavedView> {
    return request("/analytics/saved-views", { method: "POST", body: input });
  }

  async updateSavedView(id: number, input: Partial<{ name: string; isDefault: boolean }>) {
    return request<SavedView>(`/analytics/saved-views/${id}`, { method: "PATCH", body: input });
  }

  async deleteSavedView(id: number): Promise<void> {
    await request(`/analytics/saved-views/${id}`, { method: "DELETE" });
  }

  /* ── Forecast runs ── */

  async getForecastRuns(params: { branchId?: string; pageSize?: number } = {}) {
    return request<Paginated<ForecastRun>>(`/analytics/forecast-runs${pageQuery(params)}`);
  }

  async createForecastRun(input: ForecastRunInput): Promise<ForecastRun> {
    return request("/analytics/forecast-runs", { method: "POST", body: input });
  }

  async updateForecastRun(
    id: number,
    input: Partial<{ name: string; status: ForecastRun["status"]; notes: string | null }>,
  ): Promise<ForecastRun> {
    return request(`/analytics/forecast-runs/${id}`, { method: "PATCH", body: input });
  }

  async rerunForecastRun(id: number): Promise<ForecastRun> {
    return request(`/analytics/forecast-runs/${id}/rerun`, { method: "POST" });
  }

  async duplicateForecastRun(id: number): Promise<ForecastRun> {
    return request(`/analytics/forecast-runs/${id}/duplicate`, { method: "POST" });
  }

  async deleteForecastRun(id: number): Promise<void> {
    await request(`/analytics/forecast-runs/${id}`, { method: "DELETE" });
  }

  /* ── Model overrides ── */

  async getModelOverrides(params: { branchId?: string } = {}): Promise<ModelOverride[]> {
    return request(`/analytics/model-overrides${pageQuery(params)}`);
  }

  async saveModelOverride(input: {
    branchId: string;
    chosenModel: string;
    reason: string;
    active?: boolean;
  }): Promise<ModelOverride> {
    return request("/analytics/model-overrides", { method: "POST", body: input });
  }

  async updateModelOverride(id: number, input: Partial<{ active: boolean; reason: string }>) {
    return request<ModelOverride>(`/analytics/model-overrides/${id}`, {
      method: "PATCH",
      body: input,
    });
  }

  async deleteModelOverride(id: number): Promise<void> {
    await request(`/analytics/model-overrides/${id}`, { method: "DELETE" });
  }

  /* ── Cost assumptions ── */

  async getCostAssumptions(): Promise<CostAssumption[]> {
    return request("/analytics/cost-assumptions");
  }

  async createCostAssumption(input: {
    name: string;
    rushCostPerLoad: number;
    storageCostPerLoad: number;
    isActive?: boolean;
  }): Promise<CostAssumption> {
    return request("/analytics/cost-assumptions", { method: "POST", body: input });
  }

  async updateCostAssumption(
    id: number,
    input: Partial<{ name: string; rushCostPerLoad: number; storageCostPerLoad: number }>,
  ): Promise<CostAssumption> {
    return request(`/analytics/cost-assumptions/${id}`, { method: "PATCH", body: input });
  }

  async activateCostAssumption(id: number): Promise<CostAssumption> {
    return request(`/analytics/cost-assumptions/${id}/activate`, { method: "PATCH" });
  }

  async deleteCostAssumption(id: number): Promise<void> {
    await request(`/analytics/cost-assumptions/${id}`, { method: "DELETE" });
  }

  /* ── Scenarios ── */

  async getScenarios(params: { status?: string; search?: string } = {}) {
    return request<Paginated<Scenario>>(`/analytics/scenarios${pageQuery({ ...params, pageSize: 200 })}`);
  }

  async getScenario(id: number): Promise<ScenarioDetail> {
    return request(`/analytics/scenarios/${id}`);
  }

  async createScenario(input: ScenarioInput): Promise<ScenarioDetail> {
    return request("/analytics/scenarios", { method: "POST", body: input });
  }

  async updateScenario(id: number, input: Partial<ScenarioInput>): Promise<ScenarioDetail> {
    return request(`/analytics/scenarios/${id}`, { method: "PATCH", body: input });
  }

  async solveScenario(id: number): Promise<ScenarioDetail> {
    return request(`/analytics/scenarios/${id}/solve`, { method: "POST" });
  }

  async duplicateScenario(id: number, name?: string): Promise<ScenarioDetail> {
    return request(`/analytics/scenarios/${id}/duplicate`, {
      method: "POST",
      body: name ? { name } : {},
    });
  }

  async approveScenario(
    id: number,
    writeDeliveries = false,
  ): Promise<{ scenario: ScenarioDetail; deliveriesCreated: number }> {
    return request(`/analytics/scenarios/${id}/approve`, {
      method: "POST",
      body: { writeDeliveries },
    });
  }

  async compareScenarios(ids: number[]): Promise<ScenarioComparison> {
    return request(`/analytics/scenarios/compare${queryString({ ids: ids.join(",") })}`);
  }

  async deleteScenario(id: number): Promise<void> {
    await request(`/analytics/scenarios/${id}`, { method: "DELETE" });
  }

  /* ── Schedule ── */

  async getScheduleItems(params: { scenarioId?: number; status?: ScheduleStatus } = {}) {
    return request<ScheduleItem[]>(`/analytics/schedule-items${pageQuery(params)}`);
  }

  async updateScheduleItem(
    id: number,
    input: Partial<{
      loads: number;
      unitCost: number;
      status: ScheduleStatus;
      isManualOverride: boolean;
    }>,
  ): Promise<ScheduleItem> {
    return request(`/analytics/schedule-items/${id}`, { method: "PATCH", body: input });
  }

  /* ── Procedure runs ── */

  async getProcedureRuns(): Promise<ProcedureRun[]> {
    return (await request<Paginated<ProcedureRun>>(`/ba/procedure-runs${pageQuery({ pageSize: 100 })}`))
      .data;
  }

  async createProcedureRun(input: { monthNo: number; periodLabel: string; owner?: string }) {
    return request<ProcedureRun>("/ba/procedure-runs", { method: "POST", body: input });
  }

  async updateProcedureRun(
    id: number,
    input: Partial<{ periodLabel: string; owner: string; notes: string | null }>,
  ) {
    return request<ProcedureRun>(`/ba/procedure-runs/${id}`, { method: "PATCH", body: input });
  }

  async updateProcedureStep(
    runId: number,
    stepId: number,
    input: { done?: boolean; note?: string | null },
  ) {
    await request<ProcedureStep>(`/ba/procedure-runs/${runId}/steps/${stepId}`, {
      method: "PATCH",
      body: input,
    });
    return this.getProcedureRun(runId);
  }

  async getProcedureRun(id: number): Promise<ProcedureRun> {
    return request(`/ba/procedure-runs/${id}`);
  }

  async deleteProcedureRun(id: number): Promise<void> {
    await request(`/ba/procedure-runs/${id}`, { method: "DELETE" });
  }

  /* ── Recommendations ── */

  async getRecommendations(params: { status?: string; priority?: string } = {}) {
    return request<Paginated<Recommendation>>(`/ba/recommendations${pageQuery({ ...params, pageSize: 200 })}`);
  }

  async getRecommendationSuggestions(): Promise<RecommendationSuggestion[]> {
    return request("/ba/recommendations/suggestions");
  }

  async createRecommendation(input: RecommendationInput): Promise<Recommendation> {
    return request("/ba/recommendations", { method: "POST", body: input });
  }

  async updateRecommendation(
    id: number,
    input: Partial<RecommendationInput>,
  ): Promise<Recommendation> {
    return request(`/ba/recommendations/${id}`, { method: "PATCH", body: input });
  }

  async deleteRecommendation(id: number): Promise<void> {
    await request(`/ba/recommendations/${id}`, { method: "DELETE" });
  }

  /* ── Reports ── */

  async getReports(): Promise<BaReport[]> {
    return (await request<Paginated<BaReport>>(`/ba/reports${pageQuery({ pageSize: 100 })}`)).data;
  }

  async createReportSnapshot(input: {
    title?: string;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BaReport> {
    return request("/ba/reports/snapshot", { method: "POST", body: input });
  }

  async renameReport(id: number, title: string): Promise<BaReport> {
    return request(`/ba/reports/${id}`, { method: "PATCH", body: { title } });
  }

  async deleteReport(id: number): Promise<void> {
    await request(`/ba/reports/${id}`, { method: "DELETE" });
  }

  /* ── Settings ── */

  async getSettings(): Promise<AppSettings> {
    return request("/settings");
  }

  async updateSettings(input: Partial<SettingsInput>): Promise<AppSettings> {
    return request("/settings", { method: "PUT", body: input });
  }

  /* ── Generic lists & exports ── */

  async listCore<T>(entity: string, params: ListParams = {}): Promise<Paginated<T>> {
    return request<Paginated<T>>(`/${entity}${pageQuery({ ...params, search: params.search })}`);
  }

  async exportEntity(entity: string, filename: string): Promise<number> {
    return download(`/export/${entity}.csv`, filename);
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, USE_MOCK ? 100 : 0));
  }
}

export const apiService = new ApiService();

export type { CampaignInput, CustomerInput, DemandInput, NoteInput, ScenarioInput };
