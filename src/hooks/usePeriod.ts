import { useMemo, useState } from "react";
import type { Order } from "../types";
import {
  buildPeriodView,
  dataBounds,
  defaultSelection,
  type PeriodPreset,
  type PeriodSelection,
  type PeriodView,
} from "../lib/periods";

export interface PeriodController extends PeriodView {
  preset: PeriodPreset;
  selection: PeriodSelection;
  setSelection: (selection: PeriodSelection) => void;
}

/**
 * Dataset-anchored period state. "Latest" always means the most recent
 * recorded order, so the filters stay meaningful for historical data.
 */
export function usePeriod(
  orders: Order[],
  initialPreset: PeriodPreset = "monthly",
): PeriodController {
  const bounds = useMemo(() => dataBounds(orders), [orders]);
  const [selection, setSelection] = useState<PeriodSelection>(() =>
    defaultSelection(bounds, initialPreset),
  );

  const view = useMemo(
    () => buildPeriodView(orders, selection, bounds),
    [orders, selection, bounds],
  );

  return { ...view, preset: selection.preset, selection, setSelection };
}
