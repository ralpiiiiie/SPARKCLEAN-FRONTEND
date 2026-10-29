import { useState } from "react";
import { Bookmark, BookmarkPlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../services/api";
import { errorMessage } from "../../services/http";
import type { SavedView } from "../../types/api";
import { useApiResource } from "../../hooks/useApiResource";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { SelectInput } from "../ui/Field";

export function SavedViewsMenu({
  page,
  currentFilters,
  onApply,
}: {
  page: string;
  currentFilters: Record<string, unknown>;
  onApply: (filters: Record<string, unknown>) => void;
}) {
  const { data, reload } = useApiResource(() => apiService.getSavedViews(page), [page]);
  const [selectedId, setSelectedId] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedView | null>(null);

  const views = data ?? [];
  const selected = views.find((view) => String(view.id) === selectedId) ?? null;

  function apply(view: SavedView) {
    onApply(view.filtersJson);
    toast.success(`Applied “${view.name}”`);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Give the view a name");
      return;
    }
    try {
      await apiService.createSavedView({
        name: name.trim(),
        page,
        filtersJson: currentFilters,
        isDefault: makeDefault,
      });
      toast.success("View saved");
      setSaveOpen(false);
      setName("");
      setMakeDefault(false);
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    try {
      await apiService.deleteSavedView(pendingDelete.id);
      toast.success("View deleted");
      setPendingDelete(null);
      setSelectedId("");
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Saved view" htmlFor="saved-view" className="w-full sm:max-w-xs">
            <SelectInput
              id="saved-view"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Choose a saved view…</option>
              {views.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.isDefault ? "★ " : ""}
                  {view.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Button
            variant="outline"
            onClick={() => selected && apply(selected)}
            disabled={!selected}
          >
            <Bookmark className="h-4 w-4" />
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!selected) return;
              const next = !selected.isDefault;
              void apiService
                .updateSavedView(selected.id, { isDefault: next })
                .then(reload)
                .then(() => toast.success(next ? "Marked as default" : "Default cleared"))
                .catch((cause) => toast.error(errorMessage(cause)));
            }}
            disabled={!selected}
            title="Toggle default view"
          >
            <Star className="h-4 w-4" />
            {selected?.isDefault ? "Default" : "Set default"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selected && setPendingDelete(selected)}
            disabled={!selected}
            aria-label="Delete saved view"
          >
            <Trash2 className="h-4 w-4 text-coral" />
          </Button>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSaveOpen(true);
            setName("");
            setMakeDefault(false);
          }}
        >
          <BookmarkPlus className="h-4 w-4" />
          Save current view
        </Button>
      </CardContent>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save this view"
        description="Store the current filters so the team can return to them later."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save view
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="View name" htmlFor="view-name">
            <TextInput
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. December 2024 · Cebu City"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="focus-ring h-4 w-4 rounded border-slate-300 text-primary"
            />
            Make this the default view for this page
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete saved view?"
        message="The stored filters will be removed. Other views are not affected."
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </Card>
  );
}
