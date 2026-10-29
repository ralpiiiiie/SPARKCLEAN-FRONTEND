import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Copy, Loader2, PlayCircle, RefreshCw, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../services/api";
import { errorMessage } from "../../services/http";
import type { Branch, ForecastModelOption, ForecastRun } from "../../types/api";
import { useApiResource } from "../../hooks/useApiResource";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, NumberInput, SelectInput, TextArea, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";
import { Tabs } from "../ui/Tabs";

const MODELS: { id: ForecastModelOption; label: string }[] = [
  { id: "auto", label: "Auto (best validation MAD)" },
  { id: "linear", label: "Linear" },
  { id: "quadratic", label: "Quadratic" },
  { id: "cubic", label: "Cubic" },
  { id: "exponential", label: "Exponential" },
  { id: "smoothing", label: "3-month smoothing" },
];

const STATUS_VARIANT: Record<ForecastRun["status"], "secondary" | "success" | "warning"> = {
  Draft: "secondary",
  Approved: "success",
  Archived: "warning",
};

const DEFAULT_STEPS = [
  { id: "all", label: "All models" },
  { id: "accuracy", label: "Validation" },
] as const;

export function ForecastWorkbench({ branches }: { branches: Branch[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [model, setModel] = useState<ForecastModelOption>("auto");
  const [horizon, setHorizon] = useState(3);
  const [view, setView] = useState<"all" | "accuracy">("all");
  const [saveOpen, setSaveOpen] = useState(false);
  const [runName, setRunName] = useState("");
  const [validationMonths, setValidationMonths] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ForecastRun | null>(null);

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const forecast = useApiResource(
    () => (branchId ? apiService.getForecast({ branchId, model, horizon, validationMonths }) : Promise.resolve(null)),
    [branchId, model, horizon, validationMonths],
  );
  const runs = useApiResource(() => apiService.getForecastRuns({ pageSize: 100 }), []);

  const branch = branches.find((item) => item.id === branchId) ?? null;
  const payload = forecast.data;
  const runsList = runs.data?.data ?? [];

  const bestModel = useMemo(() => {
    if (!payload) return null;
    return payload.models.reduce<(typeof payload.models)[number] | null>(
      (best, item) => (!best || item.validationMad < best.validationMad ? item : best),
      null,
    );
  }, [payload]);

  function openSave() {
    setRunName(`${branch?.name ?? "Branch"} · ${model === "auto" ? "auto" : model} forecast`);
    setNotes("");
    setSaveOpen(true);
  }

  async function saveRun() {
    if (!branchId || !runName.trim()) {
      toast.error("Name the forecast run first");
      return;
    }
    setSaving(true);
    try {
      await apiService.createForecastRun({
        name: runName.trim(),
        branchId,
        model,
        horizon,
        validationMonths,
        notes: notes.trim() || undefined,
      });
      toast.success("Forecast run saved");
      setSaveOpen(false);
      await runs.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(id: number, action: "rerun" | "duplicate" | "approve" | "archive") {
    setBusyId(id);
    try {
      if (action === "rerun") {
        await apiService.rerunForecastRun(id);
        toast.success("Forecast recomputed");
      } else if (action === "duplicate") {
        await apiService.duplicateForecastRun(id);
        toast.success("Forecast run duplicated");
      } else if (action === "approve") {
        await apiService.updateForecastRun(id, { status: "Approved" });
        toast.success("Forecast approved");
      } else {
        await apiService.updateForecastRun(id, { status: "Archived" });
        toast.success("Forecast archived");
      }
      await runs.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function removeRun() {
    if (!pendingDelete) return;
    try {
      await apiService.deleteForecastRun(pendingDelete.id);
      toast.success("Forecast run deleted");
      setPendingDelete(null);
      await runs.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  const models = payload
    ? view === "all"
      ? payload.models
      : [...payload.models].sort((a, b) => a.validationMad - b.validationMad).slice(0, 3)
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            <Button variant="primary" size="sm" onClick={openSave} disabled={!payload}>
              <Save className="h-3.5 w-3.5" />
              Save as forecast run
            </Button>
          }
        >
          <CardTitle subtitle="Fit every model, compare validation error, and persist the chosen run">
            Curve Fitting & Forecast Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Branch" htmlFor="forecast-branch" className="min-w-40 flex-1 sm:max-w-52">
              <SelectInput
                id="forecast-branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Model" htmlFor="forecast-model" className="min-w-44 flex-1 sm:max-w-60">
              <SelectInput
                id="forecast-model"
                value={model}
                onChange={(e) => setModel(e.target.value as ForecastModelOption)}
              >
                {MODELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Horizon" htmlFor="forecast-horizon" className="w-24">
              <NumberInput
                id="forecast-horizon"
                min={1}
                max={6}
                value={horizon}
                onChange={(e) => setHorizon(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
              />
            </Field>
            <Field label="Validation months" htmlFor="forecast-validation" className="w-28">
              <NumberInput
                id="forecast-validation"
                min={1}
                max={12}
                value={validationMonths}
                onChange={(e) =>
                  setValidationMonths(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                }
              />
            </Field>
            <Button variant="outline" onClick={() => void forecast.reload()} disabled={forecast.status === "loading"}>
              <RefreshCw className="h-4 w-4" />
              Recompute
            </Button>
          </div>

          <div className="mt-4">
            {forecast.status === "loading" && <PanelLoading label="Fitting models…" />}
            {forecast.status === "error" && (
              <PanelError message={forecast.error ?? "Forecast unavailable"} onRetry={forecast.reload} />
            )}
            {payload && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="success" dot>
                      Selected: {payload.model}
                    </Badge>
                    <span className="text-slate-500 dark:text-slate-400">
                      R² {payload.r2.toFixed(3)} · MAD {payload.mad.toFixed(1)}
                    </span>
                    {payload.overridden && <Badge variant="purple">Model override active</Badge>}
                    {payload.override && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {payload.override.reason}
                      </span>
                    )}
                  </div>
                  <Tabs
                    tabs={DEFAULT_STEPS.map((step) => ({ id: step.id, label: step.label }))}
                    value={view}
                    onChange={setView}
                    ariaLabel="Model table view"
                  />
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead>
                      <tr className="border-y border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800/50">
                        {["Model", "R²", "MAD", "Validation MAD", "Forecast loads"].map((label) => (
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
                      {models.map((fit) => {
                        const chosen = fit.model === payload.model;
                        const firstForecast = payload.forecast[0]?.forecastLoads ?? 0;
                        return (
                          <tr
                            key={fit.model}
                            className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                              chosen ? "bg-primary/[0.04]" : ""
                            }`}
                          >
                            <td className="px-3 py-2 font-medium text-slate-800 capitalize dark:text-slate-200">
                              {fit.model}
                              {bestModel?.model === fit.model && (
                                <Badge variant="success" className="ml-2">
                                  Best
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-500 tabular-nums dark:text-slate-400">
                              {fit.rSquared.toFixed(3)}
                            </td>
                            <td className="px-3 py-2 text-slate-500 tabular-nums dark:text-slate-400">
                              {fit.mad.toFixed(1)}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-700 tabular-nums dark:text-slate-300">
                              {fit.validationMad.toFixed(1)}
                            </td>
                            <td className="px-3 py-2 text-slate-500 tabular-nums dark:text-slate-400">
                              {chosen ? Math.round(firstForecast).toLocaleString() : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {payload.forecast.map((point) => (
                    <div
                      key={point.monthNo}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <p className="text-slate-400 dark:text-slate-500">Month #{point.monthNo}</p>
                      <p className="font-display text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                        {Math.round(point.forecastLoads).toLocaleString()} loads
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {Math.round(point.lower)}–{Math.round(point.upper)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle subtitle="Persisted forecasts with recompute, duplication, approval and archive">
            Saved Forecast Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs.status === "loading" && <PanelLoading label="Loading saved runs…" />}
          {runs.status === "error" && (
            <PanelError message={runs.error ?? "Could not load runs"} onRetry={runs.reload} />
          )}
          {runs.status === "ready" && runsList.length === 0 && (
            <EmptyPanel title="No saved runs yet" description="Save the current lab result to keep it." />
          )}
          {runsList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800/50">
                    {["Run", "Branch", "Model", "Horizon", "Fit", "Status", ""].map((label) => (
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
                  {runsList.map((run) => (
                    <tr key={run.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{run.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Trained through {run.trainingEnd.slice(0, 7)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{run.branch}</td>
                      <td className="px-3 py-2.5 text-slate-500 capitalize dark:text-slate-400">
                        {run.model}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 tabular-nums dark:text-slate-400">
                        {run.horizon} mo
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <span className="text-slate-600 dark:text-slate-300">R² {run.r2.toFixed(3)}</span>
                        <span className="ml-2 text-slate-400">MAD {run.mad.toFixed(1)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={STATUS_VARIANT[run.status]} dot>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {busyId === run.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => runAction(run.id, "rerun")}
                                title="Recompute"
                                aria-label={`Recompute ${run.name}`}
                                className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(run.id, "duplicate")}
                                title="Duplicate"
                                aria-label={`Duplicate ${run.name}`}
                                className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(run.id, "approve")}
                                title="Approve"
                                aria-label={`Approve ${run.name}`}
                                disabled={run.status === "Approved"}
                                className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-success disabled:opacity-40 dark:hover:bg-slate-800"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(run.id, "archive")}
                                title="Archive"
                                aria-label={`Archive ${run.name}`}
                                disabled={run.status === "Archived"}
                                className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-warning-hover disabled:opacity-40 dark:hover:bg-slate-800"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(run)}
                                title="Delete"
                                aria-label={`Delete ${run.name}`}
                                className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-coral dark:hover:bg-slate-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save forecast run"
        description="Stores the selected model and its monthly projections."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveRun} disabled={saving}>
              <Save className="h-4 w-4" />
              Save run
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Run name" htmlFor="run-name">
            <TextInput
              id="run-name"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Model">
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm capitalize dark:border-slate-800 dark:bg-slate-800/50">
                {model}
              </div>
            </Field>
            <Field label="Horizon">
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums dark:border-slate-800 dark:bg-slate-800/50">
                {horizon} mo
              </div>
            </Field>
            <Field label="Validation">
              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums dark:border-slate-800 dark:bg-slate-800/50">
                {validationMonths} mo
              </div>
            </Field>
          </div>
          <Field label="Notes (optional)" htmlFor="run-notes">
            <TextArea
              id="run-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this model was chosen…"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete forecast run?"
        message="The saved run and its monthly projections will be removed."
        onCancel={() => setPendingDelete(null)}
        onConfirm={removeRun}
      />
    </div>
  );
}

export function ModelOverridesPanel({ branches }: { branches: Branch[] }) {
  const { data, status, error, reload } = useApiResource(
    () => apiService.getModelOverrides(),
    [],
  );
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [chosenModel, setChosenModel] = useState("linear");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const overrides = data ?? [];

  async function save() {
    if (!branchId || !reason.trim()) {
      toast.error("Choose a branch and explain the override");
      return;
    }
    setSaving(true);
    try {
      await apiService.saveModelOverride({
        branchId,
        chosenModel,
        reason: reason.trim(),
        active: true,
      });
      toast.success("Model override saved");
      setOpen(false);
      setReason("");
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (pendingDelete === null) return;
    try {
      await apiService.deleteModelOverride(pendingDelete);
      toast.success("Override removed");
      setPendingDelete(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            New override
          </Button>
        }
      >
        <CardTitle subtitle="Force a model for a branch when the automated choice is not appropriate">
          Model Overrides
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && <PanelLoading label="Loading overrides…" />}
        {status === "error" && (
          <PanelError message={error ?? "Could not load overrides"} onRetry={reload} />
        )}
        {status === "ready" && overrides.length === 0 && (
          <EmptyPanel
            title="No overrides"
            description="Every branch is using the model with the lowest validation MAD."
          />
        )}
        {overrides.length > 0 && (
          <ul className="space-y-2">
            {overrides.map((override) => (
              <li
                key={override.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {override.branch} → <span className="capitalize">{override.chosenModel}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{override.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(override.id)}
                  aria-label={`Remove override for ${override.branch}`}
                  className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-coral dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Set model override"
        description="The override applies to forecasts run with the auto model."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              Save override
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Branch" htmlFor="override-branch">
            <SelectInput
              id="override-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Model" htmlFor="override-model">
            <SelectInput
              id="override-model"
              value={chosenModel}
              onChange={(e) => setChosenModel(e.target.value)}
            >
              {MODELS.filter((item) => item.id !== "auto").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Reason" htmlFor="override-reason">
            <TextArea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why the automatic model choice should be overridden…"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove model override?"
        message="The branch will return to the model with the lowest validation MAD."
        confirmLabel="Remove"
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </Card>
  );
}

export function CostAssumptionsPanel() {
  const { data, status, error, reload } = useApiResource(
    () => apiService.getCostAssumptions(),
    [],
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rush, setRush] = useState("150");
  const [storage, setStorage] = useState("75");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const assumptions = data ?? [];

  async function save() {
    if (!name.trim()) {
      toast.error("Name the assumption set");
      return;
    }
    setSaving(true);
    try {
      await apiService.createCostAssumption({
        name: name.trim(),
        rushCostPerLoad: Number(rush) || 0,
        storageCostPerLoad: Number(storage) || 0,
        isActive: false,
      });
      toast.success("Cost assumption added");
      setOpen(false);
      setName("");
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function activate(id: number) {
    try {
      await apiService.activateCostAssumption(id);
      toast.success("Assumption set activated");
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function remove() {
    if (pendingDelete === null) return;
    try {
      await apiService.deleteCostAssumption(pendingDelete);
      toast.success("Cost assumption deleted");
      setPendingDelete(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <PlayCircle className="h-3.5 w-3.5" />
            Add set
          </Button>
        }
      >
        <CardTitle subtitle="Penalty rates used by the performance-improvement analysis">
          Cost Assumptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && <PanelLoading label="Loading assumptions…" />}
        {status === "error" && (
          <PanelError message={error ?? "Could not load assumptions"} onRetry={reload} />
        )}
        {status === "ready" && assumptions.length === 0 && (
          <EmptyPanel title="No cost assumptions" description="Add a set to price rush and storage penalties." />
        )}
        {assumptions.length > 0 && (
          <ul className="space-y-2">
            {assumptions.map((item) => (
              <li
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                  item.isActive
                    ? "border-success/30 bg-success/[0.04]"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {item.name}
                    {item.isActive && <Badge variant="success" dot>Active</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Rush ₱{item.rushCostPerLoad.toLocaleString()} · Storage ₱
                    {item.storageCostPerLoad.toLocaleString()} per load
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!item.isActive && (
                    <Button variant="outline" size="sm" onClick={() => activate(item.id)}>
                      Activate
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item.id)}
                    aria-label={`Delete ${item.name}`}
                    className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-coral dark:hover:bg-slate-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add cost assumption set"
        description="Sets are stored inactive; activate the one that should drive the analysis."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              Add set
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="assumption-name">
            <TextInput
              id="assumption-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Peak season"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rush cost / load">
              <NumberInput value={rush} onChange={(e) => setRush(e.target.value)} min={0} />
            </Field>
            <Field label="Storage cost / load">
              <NumberInput value={storage} onChange={(e) => setStorage(e.target.value)} min={0} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete cost assumption?"
        message="The performance panel will fall back to the app settings if this was the active set."
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </Card>
  );
}
