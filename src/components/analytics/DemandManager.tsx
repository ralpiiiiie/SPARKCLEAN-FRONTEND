import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../services/api";
import { errorMessage } from "../../services/http";
import type { Branch, DemandRecord } from "../../types/api";
import { useApiResource } from "../../hooks/useApiResource";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, NumberInput, SelectInput, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";

const PAGE_SIZE = 10;

interface FormState {
  branchId: string;
  monthNo: string;
  loads: string;
  monthLabel: string;
}

function monthLabelFor(monthNo: number): string {
  const year = 2022 + Math.floor((monthNo - 1) / 12);
  const month = ((monthNo - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function DemandManager({ branches }: { branches: Branch[] }) {
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<"monthNo" | "branch" | "loads">("monthNo");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DemandRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ branchId: "", monthNo: "", loads: "", monthLabel: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DemandRecord | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data, status, error, reload } = useApiResource(
    () =>
      apiService.listDemand({
        branchId: branchId || undefined,
        search: debounced || undefined,
        sort,
        order,
        page,
        pageSize: PAGE_SIZE,
      }),
    [branchId, debounced, sort, order, page],
  );

  const stats = useApiResource(
    () => (branchId ? apiService.getDescriptive(branchId) : Promise.resolve(null)),
    [branchId],
  );

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const branchName = useMemo(
    () => branches.find((branch) => branch.id === branchId)?.name ?? null,
    [branches, branchId],
  );

  function openCreate() {
    setEditing(null);
    setForm({ branchId: branchId || branches[0]?.id || "", monthNo: "", loads: "", monthLabel: "" });
    setFormOpen(true);
  }

  function openEdit(record: DemandRecord) {
    setEditing(record);
    setForm({
      branchId: record.branchId,
      monthNo: String(record.monthNo),
      loads: String(record.loads),
      monthLabel: record.monthLabel,
    });
    setFormOpen(true);
  }

  async function save() {
    const monthNo = Number(form.monthNo);
    const loads = Number(form.loads);
    if (!form.branchId || !Number.isInteger(monthNo) || monthNo < 1 || !Number.isInteger(loads) || loads < 0) {
      toast.error("Pick a branch and enter a valid month and load count");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        branchId: form.branchId,
        monthNo,
        loads,
        monthLabel: form.monthLabel.trim() || monthLabelFor(monthNo),
      };
      if (editing) {
        await apiService.updateDemand(editing.id, payload);
        toast.success("Demand record updated");
      } else {
        await apiService.createDemand(payload);
        toast.success("Demand record added");
      }
      setFormOpen(false);
      await reload();
      void stats.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    try {
      await apiService.deleteDemand(pendingDelete.id);
      toast.success("Demand record deleted");
      setPendingDelete(null);
      await reload();
      void stats.reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  const stat = stats.data?.demand.stats ?? null;

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add record
          </Button>
        }
      >
        <CardTitle subtitle="Recorded monthly branch loads · edits flow into every analysis">
          Demand Manager
        </CardTitle>
      </CardHeader>

      {stat && (
        <div className="mx-6 mb-3 grid grid-cols-2 gap-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3 sm:grid-cols-4">
          {[
            { label: "Mean", value: stat.mean },
            { label: "Median", value: stat.median },
            { label: "Std. dev", value: stat.stdDev },
            { label: "Records", value: stat.count },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="font-display text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                <AnimatedNumber value={item.value} format={(n) => Math.round(n).toLocaleString()} />
              </p>
            </div>
          ))}
          <p className="col-span-2 text-[11px] text-slate-400 sm:col-span-4 dark:text-slate-500">
            Server-side statistics for {branchName ?? "the selected branch"} from the descriptive endpoint.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 px-6 pb-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branch…"
            className="focus-ring h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectInput
            aria-label="Filter demand by branch"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="h-9 w-auto"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            aria-label="Sort demand"
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [nextSort, nextOrder] = e.target.value.split(":") as [
                typeof sort,
                typeof order,
              ];
              setSort(nextSort);
              setOrder(nextOrder);
              setPage(1);
            }}
            className="h-9 w-auto"
          >
            <option value="monthNo:asc">Month · oldest</option>
            <option value="monthNo:desc">Month · newest</option>
            <option value="branch:asc">Branch · A–Z</option>
            <option value="loads:desc">Loads · high to low</option>
            <option value="loads:asc">Loads · low to high</option>
          </SelectInput>
        </div>
      </div>

      <div className="overflow-x-auto px-6">
        {status === "loading" && <PanelLoading label="Loading demand records…" />}
        {status === "error" && (
          <PanelError message={error ?? "Could not load demand records"} onRetry={reload} />
        )}
        {status === "ready" && rows.length === 0 && (
          <EmptyPanel
            title="No demand records match"
            description="Adjust the branch or search filter, or add a monthly record."
          />
        )}
        {rows.length > 0 && (
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-800/50">
                {["Branch", "Month", "Label", "Loads", ""].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2.5 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/30"
                >
                  <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                    {record.branch}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 tabular-nums dark:text-slate-400">
                    #{record.monthNo}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                    {record.monthLabel}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="info">{record.loads.toLocaleString()} loads</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        aria-label={`Edit ${record.branch} month ${record.monthNo}`}
                        className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(record)}
                        aria-label={`Delete ${record.branch} month ${record.monthNo}`}
                        className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-coral dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page {page} of {pageCount} · {total.toLocaleString()} records
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={page >= pageCount}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit demand record" : "Add demand record"}
        description="Monthly loads drive the descriptive statistics and prescriptive model."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {editing ? "Save changes" : "Add record"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Branch" htmlFor="demand-branch">
            <SelectInput
              id="demand-branch"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              disabled={editing !== null}
            >
              <option value="">Select a branch…</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Month number" htmlFor="demand-month">
              <NumberInput
                id="demand-month"
                min={1}
                value={form.monthNo}
                onChange={(e) => {
                  const value = e.target.value;
                  const monthNo = Number(value);
                  setForm({
                    ...form,
                    monthNo: value,
                    monthLabel:
                      form.monthLabel && editing
                        ? form.monthLabel
                        : Number.isInteger(monthNo) && monthNo > 0
                          ? monthLabelFor(monthNo)
                          : form.monthLabel,
                  });
                }}
                disabled={editing !== null}
              />
            </Field>
            <Field label="Loads" htmlFor="demand-loads">
              <NumberInput
                id="demand-loads"
                min={0}
                value={form.loads}
                onChange={(e) => setForm({ ...form, loads: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Month label" htmlFor="demand-label" hint="Displayed on charts, e.g. 2024-03">
            <TextInput
              id="demand-label"
              value={form.monthLabel}
              onChange={(e) => setForm({ ...form, monthLabel: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete demand record?"
        message="Descriptive statistics and the optimization baseline will be recalculated without this month."
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </Card>
  );
}
