import { useState } from "react";
import { Pin, PinOff, Plus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../services/api";
import { errorMessage } from "../../services/http";
import type { AnalystNote, Branch, NotePage, NoteTag } from "../../types/api";
import { useApiResource } from "../../hooks/useApiResource";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, SelectInput, TextArea, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { EmptyPanel, PanelError, PanelLoading } from "../ui/PanelState";

const TAGS: NoteTag[] = ["Insight", "Warning", "Action", "Question"];

const TAG_VARIANT: Record<NoteTag, "info" | "warning" | "success" | "purple"> = {
  Insight: "info",
  Warning: "warning",
  Action: "success",
  Question: "purple",
};

const PAGE_LABEL: Record<NotePage, string> = {
  descriptive: "Descriptive",
  predictive: "Predictive",
  prescriptive: "Prescriptive",
  summary: "BA summary",
};

interface FormState {
  title: string;
  body: string;
  tag: NoteTag;
  branchId: string;
  pinned: boolean;
}

const emptyForm: FormState = { title: "", body: "", tag: "Insight", branchId: "", pinned: false };

export function NotesPanel({
  pageName,
  branches,
}: {
  pageName: NotePage;
  branches: Branch[];
}) {
  const { data, status, error, reload } = useApiResource(
    () => apiService.getNotes({ pageName }),
    [pageName],
  );
  const [editing, setEditing] = useState<AnalystNote | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AnalystNote | null>(null);

  const notes = data ?? [];

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(note: AnalystNote) {
    setEditing(note);
    setForm({
      title: note.title,
      body: note.body,
      tag: note.tag,
      branchId: note.branchId ?? "",
      pinned: note.pinned,
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("A title and body are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        tag: form.tag,
        branchId: form.branchId || null,
        pinned: form.pinned,
        author: "Admin User",
      };
      if (editing) {
        await apiService.updateNote(editing.id, payload);
        toast.success("Note updated");
      } else {
        await apiService.createNote({ page: pageName, ...payload });
        toast.success("Note added");
      }
      setFormOpen(false);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(note: AnalystNote) {
    try {
      await apiService.updateNote(note.id, { pinned: !note.pinned });
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    try {
      await apiService.deleteNote(pendingDelete.id);
      toast.success("Note deleted");
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
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add note
          </Button>
        }
      >
        <CardTitle subtitle={`Analyst notes for the ${PAGE_LABEL[pageName]} stage`}>
          Analyst Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && <PanelLoading label="Loading notes…" />}
        {status === "error" && <PanelError message={error ?? "Could not load notes"} onRetry={reload} />}
        {status === "ready" && notes.length === 0 && (
          <EmptyPanel
            title="No analyst notes yet"
            description="Capture an observation, a warning, or a follow-up action for this stage."
            action={
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Write the first note
              </Button>
            }
          />
        )}
        {notes.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-primary/30 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={TAG_VARIANT[note.tag]} dot>
                      {note.tag}
                    </Badge>
                    {note.branch && <Badge variant="secondary">{note.branch}</Badge>}
                    {note.pinned && <Badge variant="warning">Pinned</Badge>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => togglePin(note)}
                      aria-label={note.pinned ? "Unpin note" : "Pin note"}
                      className="focus-ring rounded-md p-1 text-slate-400 hover:bg-white hover:text-primary dark:hover:bg-slate-800"
                    >
                      {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(note)}
                      aria-label="Delete note"
                      className="focus-ring rounded-md p-1 text-slate-400 hover:bg-white hover:text-coral dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(note)}
                  className="mt-2 text-left"
                >
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {note.title}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                    {note.body}
                  </p>
                </button>
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>{note.author}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit note" : "Add analyst note"}
        description={`${PAGE_LABEL[pageName]} analytics · visible to the whole workspace`}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              <StickyNote className="h-4 w-4" />
              {editing ? "Save changes" : "Add note"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" htmlFor="note-title">
            <TextInput
              id="note-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What did you observe?"
            />
          </Field>
          <Field label="Note" htmlFor="note-body">
            <TextArea
              id="note-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Add the detail, context, or next action…"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tag" htmlFor="note-tag">
              <SelectInput
                id="note-tag"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value as NoteTag })}
              >
                {TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Branch (optional)" htmlFor="note-branch">
              <SelectInput
                id="note-branch"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              className="focus-ring h-4 w-4 rounded border-slate-300 text-primary"
            />
            Pin this note to the top
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this note?"
        message="The note will be permanently removed from the workspace."
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </Card>
  );
}
