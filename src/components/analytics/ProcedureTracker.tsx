import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, Save, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProcedureRun, ProcedureStatus } from "../../types/api";
import { apiService } from "../../services/api";
import { useApiResource } from "../../hooks/useApiResource";
import { errorMessage } from "../../services/http";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, NumberInput, SelectInput, TextArea, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";

const statusVariant: Record<ProcedureStatus, "secondary" | "info" | "success"> = {
  "Not started": "secondary",
  "In progress": "info",
  Completed: "success",
};

export function ProcedureTracker() {
  const { data: runs, status, error, reload, setData } = useApiResource(
    () => apiService.getProcedureRuns(),
    [],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [noteStep, setNoteStep] = useState<{ id: number; note: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcedureRun | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => runs?.find((run) => run.id === selectedId) ?? runs?.[0] ?? null,
    [runs, selectedId],
  );

  function replaceRun(updated: ProcedureRun) {
    setData((current) =>
      current ? current.map((run) => (run.id === updated.id ? updated : run)) : current,
    );
  }

  async function toggleStep(stepId: number, done: boolean) {
    if (!selected) return;
    try {
      const updated = await apiService.updateProcedureStep(selected.id, stepId, { done });
      replaceRun(updated);
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function saveStepNote() {
    if (!selected || !noteStep) return;
    setBusy(true);
    try {
      const updated = await apiService.updateProcedureStep(selected.id, noteStep.id, {
        note: noteStep.note.trim() || null,
      });
      replaceRun(updated);
      setNoteStep(null);
      toast.success("Step note saved");
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeRun() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiService.deleteProcedureRun(deleteTarget.id);
      toast.success("Procedure run deleted");
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const doneCount = selected?.steps.filter((step) => step.done).length ?? 0;
  const totalSteps = selected?.steps.length ?? 0;
  const progress = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New run
          </Button>
        }
      >
        <CardTitle subtitle="Run the seven-step BA procedure each period and track completion">
          Procedure Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && !runs && <PanelLoading label="Loading procedure runs…" />}
        {status === "error" && (
          <PanelError message={error ?? "Could not load the procedure tracker"} onRetry={reload} />
        )}
        {runs && runs.length === 0 && (
          <EmptyPanel
            title="No procedure runs yet"
            description="Create a run to track this month's analysis steps."
            action={
              <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New run
              </Button>
            }
          />
        )}
        {selected && (
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3">
              <Field label="Period" htmlFor="procedure-run-select">
                <SelectInput
                  id="procedure-run-select"
                  value={selected.id}
                  onChange={(event) => setSelectedId(Number(event.target.value))}
                >
                  {runs?.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.periodLabel}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</p>
                  <Badge variant={statusVariant[selected.status]} dot>
                    {selected.status}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Month</dt>
                    <dd className="font-medium tabular-nums">{selected.monthNo}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Owner</dt>
                    <dd className="truncate font-medium">{selected.owner}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Steps</dt>
                    <dd className="font-medium tabular-nums">
                      {doneCount}/{totalSteps}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-teal transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full justify-start text-coral hover:bg-coral/5"
                  onClick={() => setDeleteTarget(selected)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete run
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <ol className="space-y-2">
                {selected.steps.map((step) => (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                      step.done
                        ? "border-success/30 bg-success/5"
                        : "border-slate-200 dark:border-slate-800",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void toggleStep(step.id, !step.done)}
                      aria-label={step.done ? `Mark "${step.title}" not done` : `Mark "${step.title}" done`}
                      className="focus-ring mt-0.5 rounded-full text-success"
                    >
                      {step.done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          step.done
                            ? "text-slate-500 line-through dark:text-slate-400"
                            : "text-slate-800 dark:text-slate-200",
                        )}
                      >
                        <span className="mr-1.5 text-xs text-slate-400">{step.stepNo}.</span>
                        {step.title}
                      </p>
                      {step.note && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{step.note}</p>
                      )}
                      {step.doneAt && (
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          Done {new Date(step.doneAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNoteStep({ id: step.id, note: step.note ?? "" })}
                      aria-label={`Edit note for ${step.title}`}
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ol>

              <RunNotes key={selected.id} run={selected} onSaved={replaceRun} />
            </div>
          </div>
        )}
      </CardContent>

      <CreateRunModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (run) => {
          setCreateOpen(false);
          setSelectedId(run.id);
          await reload();
        }}
      />

      <Modal
        open={noteStep !== null}
        onClose={() => setNoteStep(null)}
        title="Step note"
        description="Capture blockers, context, or handoff details."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteStep(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveStepNote()} disabled={busy}>
              Save note
            </Button>
          </>
        }
      >
        <TextArea
          value={noteStep?.note ?? ""}
          onChange={(event) =>
            setNoteStep((current) => (current ? { ...current, note: event.target.value } : current))
          }
          placeholder="What should the next analyst know?"
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete procedure run?"
        message={
          deleteTarget
            ? `This removes the ${deleteTarget.periodLabel} run and its ${deleteTarget.steps.length} steps.`
            : ""
        }
        confirmLabel="Delete run"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void removeRun()}
      />
    </Card>
  );
}

function RunNotes({
  run,
  onSaved,
}: {
  run: ProcedureRun;
  onSaved: (run: ProcedureRun) => void;
}) {
  const [draft, setDraft] = useState(run.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const updated = await apiService.updateProcedureRun(run.id, {
        notes: draft.trim() || null,
      });
      onSaved(updated);
      toast.success("Run notes saved");
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <Field label="Run notes" htmlFor="run-notes">
        <TextArea
          id="run-notes"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Context for this period's run…"
        />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void save()}
          disabled={busy || draft === (run.notes ?? "")}
        >
          <Save className="h-3.5 w-3.5" /> Save notes
        </Button>
      </div>
    </div>
  );
}

function CreateRunModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (run: ProcedureRun) => void | Promise<void>;
}) {
  const [monthNo, setMonthNo] = useState(28);
  const [periodLabel, setPeriodLabel] = useState(() =>
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  );
  const [owner, setOwner] = useState("Admin User");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!periodLabel.trim()) {
      toast.error("Period label is required");
      return;
    }
    setBusy(true);
    try {
      const run = await apiService.createProcedureRun({
        monthNo,
        periodLabel: periodLabel.trim(),
        owner: owner.trim() || "Admin User",
      });
      toast.success("Procedure run created");
      onCreated(run);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New procedure run"
      description="Creates the standard seven-step BA checklist for the period."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            Create run
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Month number" htmlFor="run-month">
          <NumberInput
            id="run-month"
            min={1}
            max={999}
            value={monthNo}
            onChange={(event) => setMonthNo(Number(event.target.value))}
          />
        </Field>
        <Field label="Period label" htmlFor="run-label">
          <TextInput
            id="run-label"
            value={periodLabel}
            onChange={(event) => setPeriodLabel(event.target.value)}
            placeholder="e.g. April 2024"
          />
        </Field>
        <Field label="Owner" htmlFor="run-owner">
          <TextInput
            id="run-owner"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
