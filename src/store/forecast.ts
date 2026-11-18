import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ForecastHorizon, ForecastModel } from "../types";

interface ForecastStore {
  /** Demand model shared by the Predictive and Prescriptive pages. */
  model: ForecastModel;
  window: number;
  alpha: number;
  /**
   * What the Predictive page forecasts. Prescriptive always plans the next
   * month, so the horizon is never sent with the plan request and never
   * reaches `forecastKey` either.
   */
  horizon: ForecastHorizon;
  setModel: (model: ForecastModel) => void;
  setWindow: (window: number) => void;
  setAlpha: (alpha: number) => void;
  setHorizon: (horizon: ForecastHorizon) => void;
}

const clampWindow = (value: number) => Math.max(2, Math.min(6, Math.round(value)));
const clampAlpha = (value: number) => Math.max(0.1, Math.min(0.9, Math.round(value * 10) / 10));

export const useForecastStore = create<ForecastStore>()(
  persist(
    (set) => ({
      model: "linear",
      window: 3,
      alpha: 0.3,
      horizon: "month",
      setModel: (model) => set({ model }),
      setWindow: (value) => set({ window: clampWindow(value) }),
      setAlpha: (value) => set({ alpha: clampAlpha(value) }),
      setHorizon: (horizon) => set({ horizon }),
    }),
    {
      name: "spark-clean-forecast",
      partialize: (state) => ({
        model: state.model,
        window: state.window,
        alpha: state.alpha,
        horizon: state.horizon,
      }),
    },
  ),
);

/** One string that changes whenever the demand ceiling changes. */
export function forecastKey(model: ForecastModel, window: number, alpha: number): string {
  return `${model}:${window}:${alpha}`;
}
