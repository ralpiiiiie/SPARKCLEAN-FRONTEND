import { useState } from "react";
import { Lightbulb, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  Recommendation,
  RecommendationInput,
  RecommendationSuggestion,
} from "../../types/api";
import { apiService } from "../../services/api";
import { useApiResource } from "../../hooks/useApiResource";
import { errorMessage } from "../../services/http";
import { peso } from "../../lib/metrics";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, NumberInput, SelectInput, TextArea, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";
import { Tabs } from "../ui/Tabs";

const priorityVariant: Record<Recommendation["priority"], "danger" | "warning" | "secondary"> = {
  High: "danger",
  Medium: "warning",
  Low: "secondary",
};

const statusVariant: Record<Recommendation["status"], "secondary" | "info" | "success"> = {
  Open: "secondary",
  "In progress": "info",
  Done: "success",
};

const NEXT_STATUS: Record<Recommendation["status"], Recommendation["status"]> = {
  Open: "In progress",
  "In progress": "Done",
  Done: "Open",
};

const emptyForm: RecommendationInput = {
  title: "",
  description: "",
  priority: "Medium",
  relatedStep: "Descriptive",
  owner: "Admin User",
  dueDate: "",
  status: "Open",
  estimatedSavings: null,
};

type StatusFilter = "All" | Recommendation["status"];

export function RecommendationBoard() {
  const { data, status, error, reload } = useApiResource(
    async () => {
      const [page, suggestions] = await Promise.all([
        apiService.getRecommendations(),
        apiService.getRecommendationSuggestions(),
      ]);
      return { items: page.data, suggestions };
    },
    [],
  );
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [editing, setEditing] = useState<Recommendation | null>(null);
  const [form, setForm] = useState<RecommendationInput | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recommendation | null>(null);
  const [busy, setBusy] = useState(false);

  const items = data?.items ?? [];
  const counts = {
    All: items.length,
    Open: items.filter((item) => item.status === "Open").length,
    "In progress": items.filter((item) => item.status === "In progress").length,
    Done: items.filter((item) => item.status === "Done").length,
  };
  const visible = filter === "All" ? items : items.filter((item) => item.status === filter);

  function openCreate(seed?: RecommendationSuggestion) {
    setEditing(null);
    setForm(
      seed
        ? {
            ...emptyForm,
            title: seed.title,
            description: seed.description,
            priority: seed.priority,
            relatedStep: seed.relatedStep,
          }
        : emptyForm,
    );
  }

  function openEdit(item: Recommendation) {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      priority: item.priority,
      relatedStep: item.relatedStep,
      owner: item.owner,
      dueDate: item.dueDate ?? "",
      status: item.status,
      estimatedSavings: item.estimatedSavings,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setBusy(true);
    try {
      const payload: RecommendationInput = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate?.trim() ? form.dueDate : null,
      };
      if (editing) {
        await apiService.updateRecommendation(editing.id, payload);
        toast.success("Recommendation updated");
      } else {
        await apiService.createRecommendation(payload);
        toast.success("Recommendation added");
      }
      setForm(null);
      setEditing(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function advance(item: Recommendation) {
    try {
      await apiService.updateRecommendation(item.id, { status: NEXT_STATUS[item.status] });
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiService.deleteRecommendation(deleteTarget.id);
      toast.success("Recommendation deleted");
      setDeleteTarget(null);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="primary" size="sm" onClick={() => openCreate()}>
            <Plus className="h-3.5 w-3.5" /> Add recommendation
          </Button>
        }
      >
        <CardTitle subtitle="Turn each analysis stage into an owned, trackable action">
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {status === "loading" && !data && <PanelLoading label="Loading recommendations…" />}
        {status === "error" && (
          <PanelError message={error ?? "Could not load recommendations"} onRetry={reload} />
        )}

        {data && (
          <>
            <Tabs
              ariaLabel="Filter recommendations by status"
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: "All", label: "All", count: counts.All },
                { id: "Open", label: "Open", count: counts.Open },
                { id: "In progress", label: "In progress", count: counts["In progress"] },
                { id: "Done", label: "Done", count: counts.Done },
              ]}
            />

            {visible.length === 0 ? (
              <EmptyPanel
                title="Nothing here yet"
                description="Add a recommendation or start from a server suggestion below."
              />
            ) : (
              <ul className="space-y-2">
                {visible.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={priorityVariant[item.priority]} dot>
                            {item.priority}
                          </Badge>
                          <Badge variant="info">{item.relatedStep}</Badge>
                          <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {item.description}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>Owner: {item.owner}</span>
                          {item.dueDate && <span>Due {item.dueDate}</span>}
                          {item.estimatedSavings !== null && (
                            <span>Est. savings: {peso(item.estimatedSavings)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void advance(item)}
                          title={`Move to ${NEXT_STATUS[item.status]}`}
                        >
                          {NEXT_STATUS[item.status]}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-coral hover:bg-coral/5"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {data.suggestions.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal" />
                  <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                    Server suggestions
                  </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {data.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityVariant[suggestion.priority]}>
                          {suggestion.priority}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {suggestion.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {suggestion.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {suggestion.description}
                      </p>
                      <p className="text-xs text-teal">{suggestion.benefit}</p>
                      <div>
                        <Button variant="secondary" size="sm" onClick={() => openCreate(suggestion)}>
                          <Lightbulb className="h-3.5 w-3.5" /> Add to board
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Modal
        open={form !== null}
        onClose={() => {
          setForm(null);
          setEditing(null);
        }}
        title={editing ? "Edit recommendation" : "Add recommendation"}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setForm(null);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={busy}>
              {editing ? "Save changes" : "Add recommendation"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="rec-title" className="sm:col-span-2">
              <TextInput
                id="rec-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, title: event.target.value } : current))
                }
              />
            </Field>
            <Field label="Description" htmlFor="rec-desc" className="sm:col-span-2">
              <TextArea
                id="rec-desc"
                value={form.description}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, description: event.target.value } : current,
                  )
                }
              />
            </Field>
            <Field label="Priority" htmlFor="rec-priority">
              <SelectInput
                id="rec-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, priority: event.target.value as Recommendation["priority"] }
                      : current,
                  )
                }
              >
                {(["High", "Medium", "Low"] as const).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Stage" htmlFor="rec-stage">
              <SelectInput
                id="rec-stage"
                value={form.relatedStep}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, relatedStep: event.target.value as Recommendation["relatedStep"] }
                      : current,
                  )
                }
              >
                {(["Descriptive", "Predictive", "Prescriptive"] as const).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Owner" htmlFor="rec-owner">
              <TextInput
                id="rec-owner"
                value={form.owner}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, owner: event.target.value } : current))
                }
              />
            </Field>
            <Field label="Due date" htmlFor="rec-due">
              <TextInput
                id="rec-due"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, dueDate: event.target.value } : current,
                  )
                }
              />
            </Field>
            <Field label="Status" htmlFor="rec-status">
              <SelectInput
                id="rec-status"
                value={form.status}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, status: event.target.value as Recommendation["status"] }
                      : current,
                  )
                }
              >
                {(["Open", "In progress", "Done"] as const).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Estimated savings (₱)" htmlFor="rec-savings">
              <NumberInput
                id="rec-savings"
                min={0}
                step="0.01"
                value={form.estimatedSavings ?? ""}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          estimatedSavings: event.target.value ? Number(event.target.value) : null,
                        }
                      : current,
                  )
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete recommendation?"
        message={deleteTarget ? `"${deleteTarget.title}" will be removed permanently.` : ""}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </Card>
  );
}
