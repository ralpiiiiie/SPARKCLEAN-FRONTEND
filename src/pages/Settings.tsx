import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, NumberInput, TextInput } from '../components/ui/Field';
import { PanelError, PanelLoading } from '../components/ui/PanelState';
import { useAppStore } from '../store';
import { useApiResource } from '../hooks/useApiResource';
import { apiService } from '../services/api';
import { errorMessage } from '../services/http';
import type { SettingsInput } from '../types/api';
import { Moon, Sun, DollarSign, Package, RefreshCw, Save, Database } from 'lucide-react';
import { toast } from 'sonner';

function draftFrom(settings: SettingsInput): SettingsInput {
  return {
    rushCostPerLoad: settings.rushCostPerLoad,
    storageCostPerLoad: settings.storageCostPerLoad,
    currency: settings.currency,
    units: settings.units,
    validationMonths: settings.validationMonths,
  };
}

export function Settings() {
  const { theme, setTheme, updateSettings } = useAppStore();
  const { data, status, error, reload } = useApiResource(() => apiService.getSettings(), []);
  const [draft, setDraft] = useState<SettingsInput | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDraft(draftFrom(data));
    updateSettings({
      rushCostPerLoad: data.rushCostPerLoad,
      storageCostPerLoad: data.storageCostPerLoad,
      currency: data.currency,
      units: data.units,
    });
  }, [data, updateSettings]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await apiService.updateSettings(draft);
      setDraft(draftFrom(saved));
      updateSettings({
        rushCostPerLoad: saved.rushCostPerLoad,
        storageCostPerLoad: saved.storageCostPerLoad,
        currency: saved.currency,
        units: saved.units,
      });
      toast.success('Settings saved', { description: 'Analytics engines now use these values.' });
      await reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    draft !== null &&
    data !== null &&
    JSON.stringify(draftFrom(data)) !== JSON.stringify(draft);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Configure appearance and the cost parameters used by the analytics engine."
        actions={
          <Badge variant={status === 'ready' ? 'success' : 'secondary'} dot>
            {status === 'ready' ? 'Server settings' : status === 'loading' ? 'Loading…' : 'Offline'}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-purple" />}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Theme</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {theme === 'light' ? 'Light mode' : 'Dark mode'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              Toggle
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          action={
            status === 'error' ? (
              <Button variant="ghost" size="sm" onClick={() => void reload()}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            ) : undefined
          }
        >
          <CardTitle subtitle="Rush and storage penalties feed the performance-improvement engine.">
            Cost Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && !draft && <PanelLoading label="Loading settings…" />}
          {status === 'error' && (
            <PanelError message={error ?? 'Could not load settings'} onRetry={reload} />
          )}
          {draft && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Rush cost per load" htmlFor="rush-cost" hint="Penalty for loads received after cut-off.">
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <NumberInput
                      id="rush-cost"
                      min={0}
                      step="0.01"
                      className="pl-9"
                      value={draft.rushCostPerLoad}
                      onChange={(e) =>
                        setDraft({ ...draft, rushCostPerLoad: Number(e.target.value) })
                      }
                    />
                  </div>
                </Field>

                <Field label="Storage cost per load" htmlFor="storage-cost" hint="Penalty for finished loads awaiting delivery.">
                  <div className="relative">
                    <Package className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <NumberInput
                      id="storage-cost"
                      min={0}
                      step="0.01"
                      className="pl-9"
                      value={draft.storageCostPerLoad}
                      onChange={(e) =>
                        setDraft({ ...draft, storageCostPerLoad: Number(e.target.value) })
                      }
                    />
                  </div>
                </Field>

                <Field label="Currency symbol" htmlFor="currency">
                  <TextInput
                    id="currency"
                    maxLength={3}
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                  />
                </Field>

                <Field label="Volume unit" htmlFor="units">
                  <TextInput
                    id="units"
                    value={draft.units}
                    onChange={(e) => setDraft({ ...draft, units: e.target.value })}
                  />
                </Field>

                <Field label="Validation months" htmlFor="validation-months" hint="Held-out months used when scoring forecast models.">
                  <NumberInput
                    id="validation-months"
                    min={1}
                    max={12}
                    value={draft.validationMonths}
                    onChange={(e) =>
                      setDraft({ ...draft, validationMonths: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dirty ? 'Unsaved changes.' : 'Saved values are shared across the workspace.'}
                </p>
                <Button
                  variant="primary"
                  onClick={() => void save()}
                  disabled={saving || !dirty}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save settings'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-400" />
              <span className="font-medium">API:</span> {import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}
            </p>
            <p><span className="font-medium">Data source:</span> PostgreSQL via Drizzle ORM</p>
            <p><span className="font-medium">Analytics engine:</span> Server-computed descriptive, predictive and prescriptive models</p>
            <p><span className="font-medium">Version:</span> Phase 2 — Full-stack</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
