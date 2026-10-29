import { useMemo, useState } from "react";
import { Camera, Download, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BaReport, Branch } from "../../types/api";
import { apiService } from "../../services/api";
import { useApiResource } from "../../hooks/useApiResource";
import { errorMessage } from "../../services/http";
import { peso } from "../../lib/metrics";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, SelectInput, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";

const EXPORTS = [
  { entity: "orders", label: "Orders" },
  { entity: "customers", label: "Customers" },
  { entity: "demand", label: "Monthly demand" },
  { entity: "campaigns", label: "Campaigns" },
  { entity: "deliveries", label: "Plant deliveries" },
  { entity: "delivery-costs", label: "Delivery costs" },
] as const;

interface SnapshotSummary {
  orders?: number;
  revenue?: number;
  customers?: number;
  branches?: number;
  plants?: number;
  savings?: number;
  scenario?: string;
}

function summaryOf(report: BaReport): SnapshotSummary {
  const snapshot = report.snapshotJson as {
    descriptive?: SnapshotSummary;
    optimization?: SnapshotSummary;
  };
  return { ...snapshot.descriptive, ...snapshot.optimization };
}

export function ReportsPanel() {
  const { data, status, error, reload } = useApiResource(
    async () => {
      const [reports, branches] = await Promise.all([
        apiService.getReports(),
        apiService.getBranches(),
      ]);
      return { reports, branches };
    },
    [],
  );
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [preview, setPreview] = useState<BaReport | null>(null);
  const [renameTarget, setRenameTarget] = useState<BaReport | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BaReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const reports = data?.reports ?? [];

  async function rename() {
    if (!renameTarget || !renameValue.trim()) return;
    setBusy(true);
    try {
      await apiService.renameReport(renameTarget.id, renameValue.trim());
      toast.success("Report renamed");
      setRenameTarget(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiService.deleteReport(deleteTarget.id);
      toast.success("Report deleted");
      setDeleteTarget(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function doExport(entity: string, label: string) {
    setExporting(entity);
    try {
      const count = await apiService.exportEntity(entity, `${entity}.csv`);
      toast.success(`Exported ${label.toLowerCase()}`, { description: `${count} rows downloaded` });
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          action={
            <Button variant="primary" size="sm" onClick={() => setSnapshotOpen(true)}>
              <Camera className="h-3.5 w-3.5" /> Capture snapshot
            </Button>
          }
        >
          <CardTitle subtitle="Freeze the current numbers for reporting and export them to CSV">
            Reports &amp; Exports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {status === "loading" && !data && <PanelLoading label="Loading reports…" />}
          {status === "error" && (
            <PanelError message={error ?? "Could not load reports"} onRetry={reload} />
          )}

          {data && (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                  Data exports
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPORTS.map((item) => (
                    <Button
                      key={item.entity}
                      variant="secondary"
                      size="sm"
                      onClick={() => void doExport(item.entity, item.label)}
                      disabled={exporting !== null}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {exporting === item.entity ? "Exporting…" : item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                  Saved snapshots
                </p>
                {reports.length === 0 ? (
                  <EmptyPanel
                    title="No snapshots yet"
                    description="Capture a snapshot to preserve the current descriptive, predictive, and prescriptive results."
                  />
                ) : (
                  <ul className="space-y-2">
                    {reports.map((report) => {
                      const summary = summaryOf(report);
                      return (
                        <li
                          key={report.id}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {report.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {new Date(report.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              {summary.orders !== undefined && (
                                <span>{summary.orders.toLocaleString()} orders</span>
                              )}
                              {summary.revenue !== undefined && (
                                <span>{peso(summary.revenue)} revenue</span>
                              )}
                              {summary.customers !== undefined && (
                                <span>{summary.customers.toLocaleString()} customers</span>
                              )}
                              {summary.savings !== undefined && (
                                <span>{peso(summary.savings)} modeled savings</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setPreview(report)}>
                              <FileText className="h-3.5 w-3.5" /> View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRenameTarget(report);
                                setRenameValue(report.title);
                              }}
                              aria-label={`Rename ${report.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-coral hover:bg-coral/5"
                              onClick={() => setDeleteTarget(report)}
                              aria-label={`Delete ${report.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SnapshotModal
        open={snapshotOpen}
        branches={data?.branches ?? []}
        onClose={() => setSnapshotOpen(false)}
        onCreated={async () => {
          setSnapshotOpen(false);
          await reload();
        }}
      />

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title ?? "Snapshot"}
        description={preview ? new Date(preview.createdAt).toLocaleString() : undefined}
        size="lg"
      >
        {preview && (
          <SnapshotBody report={preview} />
        )}
      </Modal>

      <Modal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename report"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void rename()}
              disabled={busy || !renameValue.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Report title" htmlFor="report-title">
          <TextInput
            id="report-title"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete report?"
        message={deleteTarget ? `"${deleteTarget.title}" will be removed permanently.` : ""}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}

function SnapshotBody({ report }: { report: BaReport }) {
  const summary = summaryOf(report);
  const models = (report.snapshotJson as { models?: unknown[] }).models ?? [];
  const pretty = useMemo(() => JSON.stringify(report.snapshotJson, null, 2), [report.snapshotJson]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Orders", value: summary.orders?.toLocaleString() ?? "—" },
          { label: "Revenue", value: summary.revenue !== undefined ? peso(summary.revenue) : "—" },
          {
            label: "Customers",
            value: summary.customers?.toLocaleString() ?? "—",
          },
          { label: "Modeled savings", value: summary.savings !== undefined ? peso(summary.savings) : "—" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <p className="text-[11px] font-medium text-slate-500 uppercase dark:text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-slate-900 tabular-nums dark:text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {models.length} model{fits(models.length)} captured
        {summary.scenario ? ` · optimization scenario “${summary.scenario}”` : ""}
      </p>
      <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
        {pretty}
      </pre>
    </div>
  );
}

function fits(count: number): string {
  return count === 1 ? "" : "s";
}

function SnapshotModal({
  open,
  branches,
  onClose,
  onCreated,
}: {
  open: boolean;
  branches: Branch[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await apiService.createReportSnapshot({
        title: title.trim() || undefined,
        branchId: branchId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      toast.success("Snapshot captured");
      setTitle("");
      setBranchId("");
      setDateFrom("");
      setDateTo("");
      await onCreated();
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
      title="Capture snapshot"
      description="Stores the current descriptive, predictive, and prescriptive results with a timestamp."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            Capture
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title (optional)" htmlFor="snap-title" className="sm:col-span-2">
          <TextInput
            id="snap-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Auto-generated if left blank"
          />
        </Field>
        <Field label="Branch scope" htmlFor="snap-branch" className="sm:col-span-2">
          <SelectInput
            id="snap-branch"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Orders from" htmlFor="snap-from">
          <TextInput
            id="snap-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </Field>
        <Field label="Orders to" htmlFor="snap-to">
          <TextInput
            id="snap-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
