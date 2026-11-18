/**
 * Forecast model math (pure, no I/O, no dependencies).
 *
 * Mirror of `backend/src/analytics/forecast.ts`. The two files are kept byte
 * identical apart from this header, and `src/lib/forecast.test.ts` asserts that
 * both implementations return the same results on the same fixtures, so mock
 * mode and the API can never drift apart.
 *
 * Models
 *  - moving_average:    fitted(t) = mean of the previous k recorded periods
 *  - exp_smoothing:     S(1) = y(1); S(t) = a·y(t) + (1-a)·S(t-1); fitted(t) = S(t-1)
 *  - linear:            ordinary least squares on the recorded period totals
 *
 * Accuracy is a rolling one-step-ahead backtest over the second half of the
 * recorded history — months 7–12 on the monthly series. The math is
 * horizon-agnostic: a month, a week or a 15-day forecast is the same code over
 * a different series.
 */

export type ForecastModelId = "moving_average" | "exp_smoothing" | "linear";

/** What one forecast number covers. */
export type ForecastHorizonId = "month" | "week" | "days15";

export interface ForecastParams {
  model: ForecastModelId;
  /** Moving-average window, 2–6, counted in the active horizon's periods. */
  window: number;
  /** Exponential smoothing alpha, 0.1–0.9. */
  alpha: number;
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
}

export interface ServiceForecast {
  id: string;
  name: string;
  unitLabel: string;
  /** Recorded units per period, at the active horizon. */
  points: number[];
  fitted: Array<number | null>;
  forecast: number;
  /** Next-month forecast, so the Prescriptive handoff stays monthly. */
  monthForecast: number;
  mad: number;
  average: number;
  lastPoint: number;
  changePct: number;
  slope: number;
  intercept: number;
  r2: number;
  band: Array<{ period: string; fitted: number | null; low: number; high: number }>;
}

export interface ForecastPayload {
  model: ForecastModelId;
  window: number;
  alpha: number;
  horizon: ForecastHorizonId;
  /** Labels of the recorded periods the model was fitted on. */
  periods: string[];
  nextPeriod: string;
  /** One-based index of the first backtested period. */
  backtestFrom: number;
  services: ServiceForecast[];
  modelComparison: Array<{ model: ForecastModelId; totalMad: number }>;
  bestFit: ForecastModelId;
}

/** Context a caller adds when it hands over something other than months. */
export interface ForecastBuildOptions {
  horizon?: ForecastHorizonId;
  /** Service id → next-month forecast, needed by the shorter horizons. */
  monthForecasts?: Record<string, number>;
}

export const FORECAST_MODELS: ForecastModelId[] = [
  "moving_average",
  "exp_smoothing",
  "linear",
];

export const MODEL_LABELS: Record<ForecastModelId, string> = {
  moving_average: "Moving Average",
  exp_smoothing: "Exponential Smoothing",
  linear: "Linear Trend",
};

/** Control labels for the three forecast horizons. */
export const HORIZON_LABELS: Record<ForecastHorizonId, string> = {
  month: "Month",
  week: "Next week",
  days15: "Next 15 days",
};

/** What one recorded point stands for, for axis and table copy. */
export const HORIZON_UNITS: Record<ForecastHorizonId, string> = {
  month: "month",
  week: "week",
  days15: "15 days",
};

/** Short form of the above, for slope read-outs such as "+18.0 / mo". */
export const HORIZON_ABBREV: Record<ForecastHorizonId, string> = {
  month: "mo",
  week: "wk",
  days15: "15d",
};

export const FORECAST_HORIZONS: ForecastHorizonId[] = ["month", "week", "days15"];

/**
 * Orders are recorded weekly, so a 15-day series is the weekly one rescaled.
 * Every model here is linear in its input, so scaling the series scales the
 * fit, the forecast, the average and the MAD by exactly 15/7.
 */
export const DAYS15_SCALE = 15 / 7;

/** First backtest month, zero-based (month 7 of the 12-month history). */
export const BACKTEST_FROM = 6;

/** The backtest always covers the second half of what was recorded. */
export function backtestStart(periodCount: number): number {
  return Math.max(1, Math.floor(periodCount / 2));
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function linearFit(values: number[]): LinearFit {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < n; index += 1) {
    numerator += (index - xMean) * (values[index] - yMean);
    denominator += (index - xMean) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (let index = 0; index < n; index += 1) {
    const predicted = intercept + slope * index;
    ssRes += (values[index] - predicted) ** 2;
    ssTot += (values[index] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  return { slope, intercept, r2 };
}

/** Smoothed series S(1)…S(n); index 0 is the first recorded period. */
export function smoothingLevels(values: number[], alpha: number): number[] {
  const levels: number[] = [];
  values.forEach((value, index) => {
    levels.push(index === 0 ? value : alpha * value + (1 - alpha) * levels[index - 1]);
  });
  return levels;
}

/** Fitted value for every recorded period; null where the model has no basis. */
export function fittedValues(values: number[], params: ForecastParams): Array<number | null> {
  if (params.model === "linear") {
    const { slope, intercept } = linearFit(values);
    return values.map((_, index) => intercept + slope * index);
  }

  if (params.model === "moving_average") {
    const window = Math.max(1, Math.min(values.length, params.window));
    return values.map((_, index) =>
      index < window ? null : mean(values.slice(index - window, index)),
    );
  }

  const levels = smoothingLevels(values, params.alpha);
  return values.map((_, index) => (index === 0 ? null : levels[index - 1]));
}

/** One-step-ahead prediction for period `values.length` using only `values`. */
export function nextValue(values: number[], params: ForecastParams): number {
  if (values.length === 0) return 0;

  if (params.model === "linear") {
    const { slope, intercept } = linearFit(values);
    return intercept + slope * values.length;
  }

  if (params.model === "moving_average") {
    const window = Math.max(1, Math.min(values.length, params.window));
    return mean(values.slice(values.length - window));
  }

  return smoothingLevels(values, params.alpha)[values.length - 1];
}

export function wholeForecast(values: number[], params: ForecastParams): number {
  return Math.max(0, Math.round(nextValue(values, params)));
}

/** Mean absolute deviation of the rolling one-step backtest. */
export function backtestMad(values: number[], params: ForecastParams): number {
  const errors: number[] = [];
  for (let index = backtestStart(values.length); index < values.length; index += 1) {
    const predicted = nextValue(values.slice(0, index), params);
    errors.push(Math.abs(values[index] - predicted));
  }
  return round2(mean(errors));
}

export function forecastService(input: {
  id: string;
  name: string;
  unitLabel: string;
  points: number[];
  periods: string[];
  nextPeriod: string;
  params: ForecastParams;
  monthForecast?: number;
}): ServiceForecast {
  const { id, name, unitLabel, points, periods, nextPeriod, params } = input;
  const fit = linearFit(points);
  const fitted = fittedValues(points, params);
  const mad = backtestMad(points, params);
  const forecast = wholeForecast(points, params);
  const lastPoint = points[points.length - 1] ?? 0;
  const changePct = lastPoint > 0 ? round2(((forecast - lastPoint) / lastPoint) * 100) : 0;

  const band = periods.map((period, index) => ({
    period,
    fitted: fitted[index] === null ? null : round2(fitted[index] as number),
    low: fitted[index] === null ? 0 : Math.max(0, round2((fitted[index] as number) - mad)),
    high: fitted[index] === null ? 0 : round2((fitted[index] as number) + mad),
  }));
  const forecastRaw = nextValue(points, params);
  band.push({
    period: nextPeriod,
    fitted: round2(forecastRaw),
    low: Math.max(0, round2(forecastRaw - mad)),
    high: round2(forecastRaw + mad),
  });

  return {
    id,
    name,
    unitLabel,
    points,
    fitted: fitted.map((value) => (value === null ? null : round2(value))),
    forecast,
    monthForecast: input.monthForecast ?? forecast,
    mad,
    average: round2(mean(points)),
    lastPoint,
    changePct,
    slope: round2(fit.slope),
    intercept: round2(fit.intercept),
    r2: round2(fit.r2),
    band,
  };
}

/** Total backtest MAD per model across every service — the "Best fit" ranking. */
export function compareModels(
  series: Array<{ points: number[] }>,
  params: ForecastParams,
): Array<{ model: ForecastModelId; totalMad: number }> {
  return FORECAST_MODELS.map((model) => {
    const totalMad = series.reduce(
      (sum, service) => sum + backtestMad(service.points, { ...params, model }),
      0,
    );
    return { model, totalMad: round2(totalMad) };
  });
}

export function bestFitModel(
  comparison: Array<{ model: ForecastModelId; totalMad: number }>,
): ForecastModelId {
  return comparison.reduce(
    (best, candidate) => (candidate.totalMad < best.totalMad ? candidate : best),
    comparison[0],
  ).model;
}

export function buildForecastPayload(
  services: Array<{ id: string; name: string; unitLabel: string; points: number[] }>,
  periods: string[],
  nextPeriod: string,
  params: ForecastParams,
  options: ForecastBuildOptions = {},
): ForecastPayload {
  const resolved: ForecastParams = {
    model: params.model,
    window: Math.max(2, Math.min(6, Math.round(params.window))),
    alpha: Math.max(0.1, Math.min(0.9, Math.round(params.alpha * 10) / 10)),
  };

  const payloadServices = services.map((service) =>
    forecastService({
      id: service.id,
      name: service.name,
      unitLabel: service.unitLabel,
      points: service.points,
      periods,
      nextPeriod,
      params: resolved,
      monthForecast: options.monthForecasts?.[service.id],
    }),
  );

  const comparison = compareModels(services, resolved);

  return {
    model: resolved.model,
    window: resolved.window,
    alpha: resolved.alpha,
    horizon: options.horizon ?? "month",
    periods,
    nextPeriod,
    backtestFrom: backtestStart(periods.length) + 1,
    services: payloadServices,
    modelComparison: comparison,
    bestFit: bestFitModel(comparison),
  };
}
