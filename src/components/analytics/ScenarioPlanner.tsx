import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  GitCompare,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../services/api";
import { errorMessage } from "../../services/http";
import type {
  Scenario,
  ScenarioComparison,
  ScenarioDetail,
  ScenarioInput,
  ScheduleItem,
  ScheduleStatus,
} from "../../types/api";
import { useApiResource } from "../../hooks/useApiResource";
import { peso } from "../../lib/metrics";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, NumberInput, SelectInput, TextArea, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";
import { Tabs } from "../ui/Tabs";

const STATUS_VARIANT: Record<Scenario["status"], "secondary" | "info" | "success" | "warning"> = {
  Draft: "secondary",
  Solved: "info",
  Approved: "success",
  Archived: "warning",
};

const SCHEDULE_VARIANT: Record<ScheduleStatus, "secondary" | "info" | "success" | "danger"> = {
  Planned: "secondary",
  Dispatched: "info",
  Delivered: "success",
  Cancelled: "danger",
};

type View = "inputs" | "schedule" | "compare";

interface Draft {
  supply: Record<string, string>;
  demand: Record<string, string>;
  costs: Record<string, string>;
}

const emptyDraft: Draft = { supply: {}, demand: {}, costs: {} };

export function ScenarioPlanner() {
  const scenarios = useApiResource(() => apiService.getScenarios(), []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<View>("inputs");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
  const [savingInputs, setSavingInputs] = useState(false);
  const [solving, setSolving] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    fuelCostPct: "0",
    demandPct: "0",
    capacityPct: "0",
    demandSource: "forecast" as ScenarioInput["demandSource"],
    baselineMethod: "proportional" as ScenarioInput["baselineMethod"],
  });
  const [formSaving, setFormSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Scenario | null>(null);
  const [approveTarget, setApproveTarget] = useState<Scenario | null>(null);
  const [writeDeliveries, setWriteDeliveries] = useState(false);
  const [scheduleEdit, setScheduleEdit] = useState<ScheduleItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    loads: "",
    unitCost: "",
    status: "Planned" as ScheduleStatus,
    manual: false,
  });
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [comparing, setComparing] = useState(false);

  const list = scenarios.data?.data ?? [];

  useEffect(() => {
    if (selectedId === null && list.length > 0) setSelectedId(list[0].id);
  }, [list, selectedId]);

  const detail = useApiResource<ScenarioDetail | null>(
    () => (selectedId ? apiService.getScenario(selectedId) : Promise.resolve(null)),
    [selectedId],
  );
  const scenario = detail.data;

  useEffect(() => {
    if (!scenario) return;
    const next: Draft = { supply: {}, demand: {}, costs: {} };
    for (const row of scenario.supply) next.supply[row.plantId] = String(row.supply);
    for (const row of scenario.demand) next.demand[row.branchId] = String(row.demand);
    for (const row of scenario.costs) {
      next.costs[`${row.plantId}:${row.branchId}`] = String(row.costPerLoad);
    }
    setDraft(next);
    setDirty(false);
  }, [scenario]);

  const plantNames = useMemo(() => {
    const map = new Map<string, string>();
    scenario?.supply.forEach((row) => map.set(row.plantId, row.plant));
    return map;
  }, [scenario]);

  const branchNames = useMemo(() => {
    const map = new Map<string, string>();
    scenario?.demand.forEach((row) => map.set(row.branchId, row.branch));
    return map;
  }, [scenario]);

  function setDraftValue(kind: keyof Draft, key: string, value: string) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], [key]: value } }));
    setDirty(true);
  }

  function openCreate() {
    setEditingScenario(null);
    setForm({
      name: "",
      description: "",
      fuelCostPct: "0",
      demandPct: "0",
      capacityPct: "0",
      demandSource: "forecast",
      baselineMethod: "proportional",
    });
    setFormOpen(true);
  }

  function openEditScenario() {
    if (!scenario) return;
    setEditingScenario(scenario);
    setForm({
      name: scenario.name,
      description: scenario.description,
      fuelCostPct: String(scenario.fuelCostPct),
      demandPct: String(scenario.demandPct),
      capacityPct: String(scenario.capacityPct),
      demandSource: scenario.demandSource,
      baselineMethod: scenario.baselineMethod,
    });
    setFormOpen(true);
  }

  async function saveScenario() {
    if (!form.name.trim()) {
      toast.error("Name the scenario");
      return;
    }
    setFormSaving(true);
    try {
      const payload: ScenarioInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        fuelCostPct: Number(form.fuelCostPct) || 0,
        demandPct: Number(form.demandPct) || 0,
        capacityPct: Number(form.capacityPct) || 0,
        demandSource: form.demandSource,
        baselineMethod: form.baselineMethod,
      };
      if (editingScenario) {
        await apiService.updateScenario(editingScenario.id, payload);
        toast.success("Scenario updated");
        await detail.reload();
      } else {
        const created = await apiService.createScenario(payload);
        toast.success("Scenario created");
        setSelectedId(created.id);
      }
      setFormOpen(false);
      await scenarios.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setFormSaving(false);
    }
  }

  async function saveInputs() {
    if (!scenario) return;
    setSavingInputs(true);
    try {
      await apiService.updateScenario(scenario.id, {
        supply: scenario.supply.map((row) => ({
          plantId: row.plantId,
          supply: Math.max(0, Number(draft.supply[row.plantId] ?? row.supply) || 0),
        })),
        demand: scenario.demand.map((row) => ({
          branchId: row.branchId,
          demand: Math.max(0, Number(draft.demand[row.branchId] ?? row.demand) || 0),
          isOverride: true,
        })),
        costs: scenario.costs.map((row) => ({
          plantId: row.plantId,
          branchId: row.branchId,
          costPerLoad: Math.max(
            0,
            Number(draft.costs[`${row.plantId}:${row.branchId}`] ?? row.costPerLoad) || 0,
          ),
        })),
      });
      toast.success("Scenario inputs saved");
      setDirty(false);
      await detail.reload();
      await scenarios.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSavingInputs(false);
    }
  }

  async function solve() {
    if (!scenario) return;
    setSolving(true);
    try {
      await apiService.solveScenario(scenario.id);
      toast.success("Scenario solved with the transportation model");
      setView("schedule");
      await detail.reload();
      await scenarios.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSolving(false);
    }
  }

  async function duplicate() {
    if (!scenario) return;
    setDetailBusy(true);
    try {
      const copy = await apiService.duplicateScenario(scenario.id, `${scenario.name} (copy)`);
      toast.success("Scenario duplicated");
      await scenarios.reload();
      setSelectedId(copy.id);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setDetailBusy(false);
    }
  }

  async function approve() {
    if (!approveTarget) return;
    setDetailBusy(true);
    try {
      const result = await apiService.approveScenario(approveTarget.id, writeDeliveries);
      toast.success(
        writeDeliveries
          ? `Scenario approved · ${result.deliveriesCreated} deliveries created`
          : "Scenario approved",
      );
      setApproveTarget(null);
      setWriteDeliveries(false);
      await detail.reload();
      await scenarios.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setDetailBusy(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    try {
      await apiService.deleteScenario(pendingDelete.id);
      toast.success("Scenario deleted");
      setPendingDelete(null);
      if (selectedId === pendingDelete.id) setSelectedId(null);
      await scenarios.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  function openScheduleEdit(item: ScheduleItem) {
    setScheduleEdit(item);
    setScheduleForm({
      loads: String(item.loads),
      unitCost: String(item.unitCost),
      status: item.status,
      manual: item.isManualOverride,
    });
  }

  async function saveSchedule() {
    if (!scheduleEdit) return;
    try {
      await apiService.updateScheduleItem(scheduleEdit.id, {
        loads: Math.max(0, Number(scheduleForm.loads) || 0),
        unitCost: Math.max(0, Number(scheduleForm.unitCost) || 0),
        status: scheduleForm.status,
        isManualOverride: scheduleForm.manual,
      });
      toast.success("Schedule item updated");
      setScheduleEdit(null);
      await detail.reload();
      await scenarios.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function runCompare() {
    if (compareIds.length < 2) {
      toast.error("Select at least two scenarios");
      return;
    }
    setComparing(true);
    try {
      setComparison(await apiService.compareScenarios(compareIds));
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setComparing(false);
    }
  }

  function toggleCompare(id: number) {
    setCompareIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 4
          ? current
          : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </Button>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                New scenario
              </Button>
            </div>
          }
        >
          <CardTitle subtitle="Transportation scenarios with editable supply, demand and lane costs">
            Scenario Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Scenario" htmlFor="scenario-select" className="min-w-56 flex-1 sm:max-w-80">
              <SelectInput
                id="scenario-select"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a scenario…</option>
                {list.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.status}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Button variant="outline" onClick={openEditScenario} disabled={!scenario}>
              <Pencil className="h-4 w-4" />
              Edit levers
            </Button>
            <Button variant="primary" onClick={solve} disabled={!scenario || solving}>
              <Play className="h-4 w-4" />
              {solving ? "Solving…" : "Solve"}
            </Button>
            <Button variant="outline" onClick={duplicate} disabled={!scenario || detailBusy}>
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              onClick={() => scenario && setApproveTarget(scenario)}
              disabled={!scenario || !scenario.schedule.length || detailBusy}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="ghost"
              onClick={() => scenario && setPendingDelete(scenario)}
              disabled={!scenario}
              aria-label="Delete scenario"
            >
              <Trash2 className="h-4 w-4 text-coral" />
            </Button>
          </div>

          {scenarios.status === "error" && (
            <div className="mt-4">
              <PanelError message={scenarios.error ?? "Could not load scenarios"} onRetry={scenarios.reload} />
            </div>
          )}

          {detail.status === "loading" && <PanelLoading label="Loading scenario…" />}
          {detail.status === "error" && (
            <div className="mt-4">
              <PanelError message={detail.error ?? "Could not load the scenario"} onRetry={detail.reload} />
            </div>
          )}
          {!scenario && detail.status === "ready" && (
            <div className="mt-4">
              <EmptyPanel
                title="No scenario selected"
                description="Create a scenario to model capacity, demand and fuel changes."
                action={
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" />
                    New scenario
                  </Button>
                }
              />
            </div>
          )}

          {scenario && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Status", value: scenario.status, badge: true },
                  { label: "Optimized cost", value: scenario.totalCost },
                  { label: "Baseline cost", value: scenario.baselineCost },
                  { label: "Savings", value: scenario.savingsAmount },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</p>
                    {item.badge ? (
                      <Badge variant={STATUS_VARIANT[scenario.status]} dot className="mt-1">
                        {scenario.status}
                      </Badge>
                    ) : (
                      <p className="mt-1 font-display text-lg font-semibold text-slate-900 tabular-nums dark:text-white">
                        {typeof item.value === "number" ? peso(item.value) : "—"}
                      </p>
                    )}
                    {item.label === "Savings" && scenario.savingsPct !== null && (
                      <p className="text-[11px] text-success">{scenario.savingsPct.toFixed(1)}% below baseline</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Tabs
                  tabs={[
                    { id: "inputs", label: "Inputs" },
                    { id: "schedule", label: "Schedule", count: scenario.schedule.length },
                    { id: "compare", label: "Summary" },
                  ]}
                  value={view}
                  onChange={setView}
                  ariaLabel="Scenario views"
                />
                {dirty && (
                  <Button variant="primary" size="sm" onClick={saveInputs} disabled={savingInputs}>
                    <Save className="h-3.5 w-3.5" />
                    {savingInputs ? "Saving…" : "Save inputs"}
                  </Button>
                )}
              </div>

              {view === "inputs" && (
                <div className="mt-3 space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                          Plant supply
                        </p>
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          {scenario.supply.map((row) => (
                            <tr key={row.plantId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.plant}</td>
                              <td className="px-3 py-2 text-right">
                                <NumberInput
                                  value={draft.supply[row.plantId] ?? ""}
                                  min={0}
                                  onChange={(e) => setDraftValue("supply", row.plantId, e.target.value)}
                                  className="ml-auto h-8 w-28 text-right"
                                  aria-label={`${row.plant} supply`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                          Branch demand
                        </p>
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          {scenario.demand.map((row) => (
                            <tr key={row.branchId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                {row.branch}
                                {row.isOverride && (
                                  <Badge variant="purple" className="ml-2">
                                    Manual
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <NumberInput
                                  value={draft.demand[row.branchId] ?? ""}
                                  min={0}
                                  onChange={(e) => setDraftValue("demand", row.branchId, e.target.value)}
                                  className="ml-auto h-8 w-28 text-right"
                                  aria-label={`${row.branch} demand`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        Cost per load (₱)
                      </p>
                    </div>
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                            Plant
                          </th>
                          {scenario.demand.map((row) => (
                            <th
                              key={row.branchId}
                              className="px-2 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
                            >
                              {row.branch}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scenario.supply.map((plant) => (
                          <tr key={plant.plantId} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                              {plant.plant}
                            </td>
                            {scenario.demand.map((branch) => {
                              const key = `${plant.plantId}:${branch.branchId}`;
                              return (
                                <td key={key} className="px-2 py-1.5">
                                  <NumberInput
                                    value={draft.costs[key] ?? ""}
                                    min={0}
                                    onChange={(e) => setDraftValue("costs", key, e.target.value)}
                                    className="h-8 w-20 text-center"
                                    aria-label={`${plantNames.get(plant.plantId)} to ${branchNames.get(branch.branchId)} cost`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === "schedule" && (
                <div className="mt-3">
                  {scenario.schedule.length === 0 ? (
                    <EmptyPanel
                      title="No schedule yet"
                      description="Solve the scenario to generate a minimum-cost shipping schedule."
                      action={
                        <Button variant="primary" size="sm" onClick={solve} disabled={solving}>
                          <Play className="h-3.5 w-3.5" />
                          Solve scenario
                        </Button>
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full min-w-[680px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800/50">
                            {["Plant", "Branch", "Loads", "Unit cost", "Total", "Status", ""].map((label) => (
                              <th
                                key={label}
                                className="px-3 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scenario.schedule.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.plant}</td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.branch}</td>
                              <td className="px-3 py-2 text-slate-500 tabular-nums dark:text-slate-400">
                                {item.loads.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-slate-500 tabular-nums dark:text-slate-400">
                                ₱{item.unitCost.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-700 tabular-nums dark:text-slate-300">
                                {peso(item.totalCost)}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant={SCHEDULE_VARIANT[item.status]} dot>
                                  {item.status}
                                </Badge>
                                {item.isManualOverride && (
                                  <Badge variant="purple" className="ml-1.5">
                                    Manual
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => openScheduleEdit(item)}
                                  aria-label={`Edit ${item.plant} to ${item.branch} shipment`}
                                  className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {view === "compare" && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      Levers
                    </p>
                    <dl className="mt-2 space-y-1.5">
                      {[
                        ["Fuel cost change", `${scenario.fuelCostPct}%`],
                        ["Demand change", `${scenario.demandPct}%`],
                        ["Capacity change", `${scenario.capacityPct}%`],
                        ["Demand source", scenario.demandSource],
                        ["Baseline method", scenario.baselineMethod],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3">
                          <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                          <dd className="font-medium text-slate-800 capitalize dark:text-slate-200">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      Totals
                    </p>
                    <dl className="mt-2 space-y-1.5">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 dark:text-slate-400">Total supply</dt>
                        <dd className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                          {scenario.supply.reduce((sum, row) => sum + row.supply, 0).toLocaleString()} loads
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 dark:text-slate-400">Total demand</dt>
                        <dd className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                          {scenario.demand.reduce((sum, row) => sum + row.demand, 0).toLocaleString()} loads
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 dark:text-slate-400">Active lanes</dt>
                        <dd className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                          {scenario.schedule.length}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500 dark:text-slate-400">Description</dt>
                        <dd className="max-w-[60%] text-right text-slate-600 dark:text-slate-300">
                          {scenario.description || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / edit scenario */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingScenario ? "Edit scenario levers" : "New optimization scenario"}
        description="Levers shape the derived inputs; saved inputs can then be tuned by hand."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveScenario} disabled={formSaving}>
              {editingScenario ? "Save changes" : "Create scenario"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="scenario-name">
            <TextInput
              id="scenario-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Holiday peak plan"
            />
          </Field>
          <Field label="Description" htmlFor="scenario-description">
            <TextArea
              id="scenario-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What this scenario represents…"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fuel cost %" hint="Change vs current">
              <NumberInput
                value={form.fuelCostPct}
                onChange={(e) => setForm({ ...form, fuelCostPct: e.target.value })}
              />
            </Field>
            <Field label="Demand %" hint="Change vs current">
              <NumberInput
                value={form.demandPct}
                onChange={(e) => setForm({ ...form, demandPct: e.target.value })}
              />
            </Field>
            <Field label="Capacity %" hint="Change vs current">
              <NumberInput
                value={form.capacityPct}
                onChange={(e) => setForm({ ...form, capacityPct: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Demand source">
              <SelectInput
                value={form.demandSource}
                onChange={(e) =>
                  setForm({ ...form, demandSource: e.target.value as ScenarioInput["demandSource"] })
                }
              >
                <option value="forecast">Forecast (latest recorded demand)</option>
                <option value="manual">Manual overrides</option>
              </SelectInput>
            </Field>
            <Field label="Baseline method">
              <SelectInput
                value={form.baselineMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    baselineMethod: e.target.value as ScenarioInput["baselineMethod"],
                  })
                }
              >
                <option value="proportional">Proportional</option>
                <option value="smoothing">3-month smoothing</option>
              </SelectInput>
            </Field>
          </div>
        </div>
      </Modal>

      {/* Approve */}
      <Modal
        open={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        title="Approve scenario"
        description="Approval marks the schedule as the operating plan."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={detailBusy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={approve} disabled={detailBusy}>
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          </>
        }
      >
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <input
            type="checkbox"
            checked={writeDeliveries}
            onChange={(e) => setWriteDeliveries(e.target.checked)}
            className="focus-ring mt-0.5 h-4 w-4 rounded border-slate-300 text-primary"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <Truck className="h-4 w-4" />
              Write deliveries
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Creates plant delivery records for every scheduled lane. Otherwise the scenario is
              only marked as approved.
            </span>
          </span>
        </label>
      </Modal>

      {/* Schedule item edit */}
      <Modal
        open={scheduleEdit !== null}
        onClose={() => setScheduleEdit(null)}
        title="Edit schedule item"
        description={scheduleEdit ? `${scheduleEdit.plant} → ${scheduleEdit.branch}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setScheduleEdit(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveSchedule}>
              Save item
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loads">
              <NumberInput
                value={scheduleForm.loads}
                min={0}
                onChange={(e) => setScheduleForm({ ...scheduleForm, loads: e.target.value })}
              />
            </Field>
            <Field label="Unit cost (₱)">
              <NumberInput
                value={scheduleForm.unitCost}
                min={0}
                onChange={(e) => setScheduleForm({ ...scheduleForm, unitCost: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Status">
            <SelectInput
              value={scheduleForm.status}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, status: e.target.value as ScheduleStatus })
              }
            >
              {(["Planned", "Dispatched", "Delivered", "Cancelled"] as ScheduleStatus[]).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={scheduleForm.manual}
              onChange={(e) => setScheduleForm({ ...scheduleForm, manual: e.target.checked })}
              className="focus-ring h-4 w-4 rounded border-slate-300 text-primary"
            />
            Mark as a manual override
          </label>
        </div>
      </Modal>

      {/* Compare */}
      <Modal
        open={compareOpen}
        onClose={() => {
          setCompareOpen(false);
          setComparison(null);
          setCompareIds([]);
        }}
        title="Compare scenarios"
        description="Pick two to four scenarios to compare cost outcomes."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setCompareOpen(false);
                setComparison(null);
                setCompareIds([]);
              }}
            >
              Close
            </Button>
            <Button variant="primary" onClick={runCompare} disabled={comparing || compareIds.length < 2}>
              Compare
            </Button>
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-sm ${
                compareIds.includes(item.id)
                  ? "border-primary/40 bg-primary/[0.04]"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={compareIds.includes(item.id)}
                  onChange={() => toggleCompare(item.id)}
                  className="focus-ring h-4 w-4 rounded border-slate-300 text-primary"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
              </span>
              <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
            </label>
          ))}
        </div>

        {comparison && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left dark:bg-slate-800/50">
                  {["Scenario", "Status", "Optimized", "Baseline", "Savings", "Supply", "Demand"].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.scenarios.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{item.totalCost === null ? "—" : peso(item.totalCost)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {item.baselineCost === null ? "—" : peso(item.baselineCost)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-success">
                      {item.savingsAmount === null ? "—" : peso(item.savingsAmount)}
                      {item.savingsPct !== null && (
                        <span className="ml-1 text-xs text-slate-400">({item.savingsPct.toFixed(1)}%)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{item.totalSupply.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums">{item.totalDemand.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete scenario?"
        message="Inputs, schedule and totals for this scenario will be removed. Approved deliveries already written are kept."
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
}
