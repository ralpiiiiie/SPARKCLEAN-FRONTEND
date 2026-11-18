import { useEffect, useState } from "react";
import { Database, Moon, RefreshCw, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Field, NumberInput, TextInput } from "../components/ui/Field";
import { PanelError, PanelLoading } from "../components/ui/PanelState";
import { useApiResource } from "../hooks/useApiResource";
import { getSettings, updateSettings } from "../services/api";
import { errorMessage } from "../services/http";
import { useAppStore } from "../store";
import type { Settings as SettingsPayload } from "../types";

function draftFrom(settings: SettingsPayload): Pick<SettingsPayload, "currency" | "machineHoursDefault"> {
  return {
    currency: settings.currency,
    machineHoursDefault: settings.machineHoursDefault,
  };
}

export function Settings() {
  const { theme, toggleTheme } = useAppStore();
  const { data, status, error, reload, setData } = useApiResource(getSettings, []);
  const [draft, setDraft] = useState<ReturnType<typeof draftFrom> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDraft(draftFrom(data));
  }, [data]);

  async function save() {
    if (!draft) return;
    const hours = Number(draft.machineHoursDefault);
    if (!Number.isFinite(hours) || hours < 200 || hours > 600) {
      toast.error("Machine hours must be between 200 and 600.");
      return;
    }
    if (!draft.currency.trim()) {
      toast.error("Enter a currency symbol.");
      return;
    }

    setSaving(true);
    try {
      const saved = await updateSettings({
        currency: draft.currency.trim().slice(0, 3),
        machineHoursDefault: Math.round(hours),
      });
      setData(saved);
      setDraft(draftFrom(saved));
      toast.success("Settings saved", {
        description: "The prescriptive planner now opens with this machine-hour limit.",
      });
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    draft !== null && data !== null && JSON.stringify(draftFrom(data)) !== JSON.stringify(draft);

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Appearance and the default capacity used by the prescriptive planner."
        actions={
          <Badge variant={status === "ready" ? "success" : status === "error" ? "danger" : "secondary"} dot>
            {status === "ready" ? "Server settings" : status === "loading" ? "Loading…" : "Unavailable"}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle subtitle="Stored on this device only.">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-muted/60 p-4 ring-1 ring-slate-200/50 dark:bg-elevated-dark/50 dark:ring-border-dark/50">
            <div className="flex items-center gap-3">
              {theme === "light" ? (
                <Sun className="h-5 w-5 text-warning" aria-hidden />
              ) : (
                <Moon className="h-5 w-5 text-purple" aria-hidden />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Theme</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {theme === "light" ? "Light mode" : "Dark mode"}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              Toggle
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          action={
            status === "error" ? (
              <Button variant="ghost" size="sm" onClick={() => void reload()}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            ) : undefined
          }
        >
          <CardTitle subtitle="Shared by every analytics request and the Data Explorer.">
            Analytics defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && !draft && <PanelLoading label="Loading settings…" />}
          {status === "error" && (
            <PanelError message={error ?? "Could not load settings."} onRetry={reload} />
          )}
          {draft && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency symbol" htmlFor="currency" hint="Used for display only.">
                  <TextInput
                    id="currency"
                    maxLength={3}
                    value={draft.currency}
                    onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
                  />
                </Field>

                <Field
                  label="Default machine hours"
                  htmlFor="machine-hours"
                  hint="Between 200 and 600 hours. The prescriptive planner starts here."
                >
                  <NumberInput
                    id="machine-hours"
                    min={200}
                    max={600}
                    step={1}
                    value={draft.machineHoursDefault}
                    onChange={(event) =>
                      setDraft({ ...draft, machineHoursDefault: Number(event.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dirty
                    ? "Unsaved changes."
                    : data?.datasetLabel
                      ? `Saved values apply to the ${data.datasetLabel}.`
                      : "Saved values are shared across the workspace."}
                </p>
                <Button variant="primary" onClick={() => void save()} disabled={saving || !dirty}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-400" aria-hidden />
              <span className="font-medium">API:</span>{" "}
              {import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1"}
            </p>
            <p>
              <span className="font-medium">Data source:</span> PostgreSQL via Drizzle ORM
            </p>
            <p>
              <span className="font-medium">Analytics:</span> Server-computed descriptive,
              predictive and prescriptive models
            </p>
            <p>
              <span className="font-medium">Seeded dataset:</span> 60 customers · 192 orders · 192
              payments · 60 machine days · 50 campaigns
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
