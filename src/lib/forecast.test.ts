/**
 * Forecast math tests.
 *
 * Two jobs:
 *  1. Pin the arithmetic against hand-checkable series.
 *  2. Prove the frontend mirror (`src/lib/forecast.ts`) and the backend original
 *     (`backend/src/analytics/forecast.ts`) return identical results for the same
 *     fixtures, so mock mode and the API can never drift apart.
 *
 * Run with `npm test` (Node strips the types itself).
 */
import assert from "node:assert/strict";
import test from "node:test";

import * as backend from "../../../backend/src/analytics/forecast.ts";
import * as frontend from "./forecast.ts";
import { dataset } from "../data/dataset.ts";

const MONTHS = [...dataset.meta.period.months];
const NEXT_MONTH = "Nov 2026";
const WEEK_LABELS = Array.from({ length: 48 }, (_, index) => `W${index + 1}`);

function monthlyTotals(serviceId: string): number[] {
  const totals = new Array(12).fill(0) as number[];
  const index = new Map(MONTHS.map((month, position) => [month, position]));
  for (const order of dataset.orders) {
    if (order.serviceId !== serviceId) continue;
    const position = index.get(order.month);
    if (position !== undefined) totals[position] += order.units;
  }
  return totals;
}

function weeklyTotals(serviceId: string): number[] {
  const totals = new Array(48).fill(0) as number[];
  for (const order of dataset.orders) {
    if (order.serviceId !== serviceId) continue;
    if (order.week >= 1 && order.week <= 48) totals[order.week - 1] += order.units;
  }
  return totals;
}

const fixtures = dataset.services.map((service) => ({
  id: service.id,
  name: service.name,
  unitLabel: service.unitLabel,
  points: monthlyTotals(service.id),
}));

const weeklyFixtures = dataset.services.map((service) => ({
  id: service.id,
  name: service.name,
  unitLabel: service.unitLabel,
  points: weeklyTotals(service.id),
}));

const models = ["moving_average", "exp_smoothing", "linear"] as const;

/* ── 1. Known arithmetic ── */

test("moving average of [10, 20, 30] with window 3 forecasts 20", () => {
  const params = { model: "moving_average", window: 3, alpha: 0.3 } as const;
  assert.equal(frontend.wholeForecast([10, 20, 30], params), 20);
  assert.deepEqual(frontend.fittedValues([10, 20, 30, 40], params), [
    null,
    null,
    null,
    20,
  ]);
});

test("exponential smoothing with alpha 0.5 reaches 22.5 and forecasts 23", () => {
  const params = { model: "exp_smoothing", window: 3, alpha: 0.5 } as const;
  assert.deepEqual(frontend.smoothingLevels([10, 20, 30], 0.5), [10, 15, 22.5]);
  assert.equal(frontend.nextValue([10, 20, 30], params), 22.5);
  assert.equal(frontend.wholeForecast([10, 20, 30], params), 23);
  // Fitted(t) is the previous level, so the first month has no fit.
  assert.deepEqual(frontend.fittedValues([10, 20, 30], params), [null, 10, 15]);
});

test("linear trend on [1, 2, 3] has slope 1 and forecasts 4", () => {
  const params = { model: "linear", window: 3, alpha: 0.3 } as const;
  const fit = frontend.linearFit([1, 2, 3]);
  assert.equal(fit.slope, 1);
  assert.equal(fit.intercept, 1);
  assert.equal(fit.r2, 1);
  assert.equal(frontend.nextValue([1, 2, 3], params), 4);
  assert.deepEqual(frontend.fittedValues([1, 2, 3], params), [1, 2, 3]);
});

test("moving average and smoothing lag a rising trend below linear", () => {
  const linear = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
    model: "linear",
    window: 3,
    alpha: 0.3,
  });
  const smoothing = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
    model: "exp_smoothing",
    window: 3,
    alpha: 0.3,
  });

  linear.services.forEach((service, index) => {
    assert.ok(
      smoothing.services[index].forecast < service.forecast,
      `${service.name}: smoothing should trail`,
    );
    // The trend is upward, so the fitted line sits above the twelve-month mean
    // (it does not have to beat the last month — that month is a zigzag peak).
    assert.ok(
      service.forecast > service.average,
      `${service.name}: forecast should exceed the twelve-month mean`,
    );
  });
});

test("forecasts are whole numbers and never below zero", () => {
  for (const model of models) {
    const payload = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
      model,
      window: 2,
      alpha: 0.1,
    });
    for (const service of payload.services) {
      assert.ok(Number.isInteger(service.forecast));
      assert.ok(service.forecast >= 0);
      for (const point of service.band) {
        assert.ok(point.low >= 0);
        assert.ok(point.high >= point.low);
      }
    }
  }
});

test("window and alpha are clamped to the selectable range", () => {
  const payload = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
    model: "moving_average",
    window: 99,
    alpha: 4,
  });
  assert.equal(payload.window, 6);
  assert.equal(payload.alpha, 0.9);
});

test("backtest only uses months 7-12", () => {
  const series = [700, 650, 760, 700, 790, 730, 820, 780, 870, 810, 910, 850];
  const params = { model: "linear", window: 3, alpha: 0.3 } as const;
  const errors: number[] = [];
  for (let index = 6; index < series.length; index += 1) {
    errors.push(Math.abs(series[index] - frontend.nextValue(series.slice(0, index), params)));
  }
  const expected = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  assert.equal(frontend.backtestMad(series, params), Math.round(expected * 100) / 100);
});

/* ── 2. Horizons: month, week, 15 days ── */

const LINEAR_PARAMS = { model: "linear", window: 3, alpha: 0.3 } as const;

test("the monthly payload is unchanged when no horizon is given", () => {
  const implied = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, LINEAR_PARAMS);
  const explicit = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, LINEAR_PARAMS, {
    horizon: "month",
  });
  assert.deepStrictEqual(implied, explicit);
  assert.equal(implied.horizon, "month");
  assert.equal(implied.backtestFrom, 7);
  for (const service of implied.services) assert.equal(service.monthForecast, service.forecast);
});

test("the weekly horizon fits 48 weeks, backtests the last half and forecasts W49", () => {
  const payload = frontend.buildForecastPayload(
    weeklyFixtures,
    WEEK_LABELS,
    "W49",
    LINEAR_PARAMS,
    { horizon: "week" },
  );
  assert.equal(payload.horizon, "week");
  assert.equal(payload.periods.length, 48);
  assert.equal(payload.nextPeriod, "W49");
  assert.equal(payload.backtestFrom, 25);
  for (const service of payload.services) {
    assert.equal(service.points.length, 48);
    assert.equal(service.band.length, 49);
    assert.ok(service.forecast >= 0);
  }
});

test("a 15-day forecast is the weekly one rescaled by 15/7", () => {
  const week = frontend.buildForecastPayload(weeklyFixtures, WEEK_LABELS, "W49", LINEAR_PARAMS, {
    horizon: "week",
  });
  const scaled = weeklyFixtures.map((service) => ({
    ...service,
    points: service.points.map((units) => units * frontend.DAYS15_SCALE),
  }));
  const days15 = frontend.buildForecastPayload(scaled, WEEK_LABELS, "15 days", LINEAR_PARAMS, {
    horizon: "days15",
  });

  assert.ok(Math.abs(frontend.DAYS15_SCALE - 15 / 7) < 1e-12);
  days15.services.forEach((service, index) => {
    const weekly = week.services[index];
    // Scaling the series scales every model output, so the only gap left is the
    // rounding that turns units into whole numbers.
    assert.ok(
      Math.abs(service.forecast - weekly.forecast * frontend.DAYS15_SCALE) <= 1,
      `${service.name}: 15-day forecast should be the week times 15/7`,
    );
    assert.ok(Math.abs(service.mad - weekly.mad * frontend.DAYS15_SCALE) <= 0.02);
    assert.ok(Math.abs(service.average - weekly.average * frontend.DAYS15_SCALE) <= 0.02);
    assert.ok(Math.abs(service.slope - weekly.slope * frontend.DAYS15_SCALE) <= 0.02);
    // Both are ratios, so scaling only moves them through the rounding — a
    // service measured in dozens of pieces shifts further than one in kg.
    assert.ok(
      Math.abs(service.changePct - weekly.changePct) <= 3,
      `${service.name}: change is scale-invariant`,
    );
    assert.ok(Math.abs(service.r2 - weekly.r2) <= 0.02, `${service.name}: R² is scale-invariant`);
  });
});

test("short horizons still carry the monthly forecast for Prescriptive", () => {
  const monthly = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, LINEAR_PARAMS);
  const monthForecasts = Object.fromEntries(
    monthly.services.map((service) => [service.id, service.forecast]),
  );
  const week = frontend.buildForecastPayload(
    weeklyFixtures,
    WEEK_LABELS,
    "W49",
    LINEAR_PARAMS,
    { horizon: "week", monthForecasts },
  );
  week.services.forEach((service, index) => {
    assert.equal(service.monthForecast, monthly.services[index].forecast);
    assert.notEqual(service.monthForecast, service.forecast);
  });
});

test("horizon labels cover month, week and 15 days", () => {
  assert.deepEqual(frontend.FORECAST_HORIZONS, ["month", "week", "days15"]);
  assert.deepEqual(frontend.HORIZON_LABELS, backend.HORIZON_LABELS);
  assert.deepEqual(frontend.HORIZON_UNITS, backend.HORIZON_UNITS);
  assert.deepEqual(frontend.HORIZON_ABBREV, backend.HORIZON_ABBREV);
});

/* ── 3. Frontend mirror === backend original ── */

test("mirror and backend agree on every model and parameter set", () => {
  for (const model of models) {
    for (const window of [2, 3, 6]) {
      for (const alpha of [0.1, 0.3, 0.9]) {
        const params = { model, window, alpha };
        assert.deepStrictEqual(
          frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, params),
          backend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, params),
          `payload mismatch for ${model} / ${window} / ${alpha}`,
        );
      }
    }
  }
});

test("mirror and backend agree on the weekly and 15-day horizons", () => {
  for (const params of [
    { model: "linear", window: 3, alpha: 0.3 },
    { model: "moving_average", window: 4, alpha: 0.3 },
    { model: "exp_smoothing", window: 3, alpha: 0.7 },
  ] as const) {
    for (const horizon of ["week", "days15"] as const) {
      const scale = horizon === "days15" ? frontend.DAYS15_SCALE : 1;
      const series = weeklyFixtures.map((service) => ({
        ...service,
        points: service.points.map((units) => units * scale),
      }));
      assert.deepStrictEqual(
        frontend.buildForecastPayload(series, WEEK_LABELS, "15 days", params, { horizon }),
        backend.buildForecastPayload(series, WEEK_LABELS, "15 days", params, { horizon }),
        `horizon mismatch for ${params.model} / ${horizon}`,
      );
    }
  }
});

test("mirror exports the same labels and constants as the backend", () => {
  assert.deepEqual(frontend.MODEL_LABELS, backend.MODEL_LABELS);
  assert.deepEqual(frontend.FORECAST_MODELS, backend.FORECAST_MODELS);
  assert.equal(frontend.BACKTEST_FROM, backend.BACKTEST_FROM);
});

test("the seeded history keeps Linear Trend on its month-13 targets", () => {
  const payload = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
    model: "linear",
    window: 3,
    alpha: 0.3,
  });
  const targets: Record<string, number> = {
    "Wash & Fold": 900,
    "Dry Cleaning": 180,
    Comforters: 90,
    "Self-Service": 220,
  };
  for (const service of payload.services) {
    assert.equal(service.forecast, targets[service.name], `${service.name} month-13 forecast`);
  }
});

test("the reference-shaped history gives Moving Average the lowest total MAD", () => {
  const payload = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
    model: "linear",
    window: 3,
    alpha: 0.3,
  });
  // The shape has one dominant early peak and a plateau in the back half, so a
  // trailing three-month average backtests tighter than the fitted line even
  // though the line is what carries the upward trend into month 13.
  assert.equal(payload.bestFit, "moving_average");
  const totals = new Map(payload.modelComparison.map((row) => [row.model, row.totalMad]));
  assert.ok((totals.get("moving_average") ?? 0) < (totals.get("linear") ?? 0));
  assert.ok((totals.get("moving_average") ?? 0) < (totals.get("exp_smoothing") ?? 0));
});

/* ── Report the Part C verification table ── */

test("print the model verification table", () => {
  const rows: string[] = [];
  for (const model of models) {
    const payload = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
      model,
      window: 3,
      alpha: 0.3,
    });
    for (const service of payload.services) {
      rows.push(
        `  ${service.name.padEnd(14)} ${payload.model.padEnd(15)} ${String(
          service.forecast,
        ).padStart(5)}  MAD ${service.mad.toFixed(2).padStart(6)}`,
      );
    }
  }
  const report = frontend.buildForecastPayload(fixtures, MONTHS, NEXT_MONTH, {
    model: "linear",
    window: 3,
    alpha: 0.3,
  });
  const summary = report.modelComparison
    .map((row) => `${row.model} ${row.totalMad.toFixed(2)}`)
    .join("  |  ");
  console.log("\nPart C model verification (window 3, alpha 0.3)\n");
  console.log(rows.join("\n"));
  console.log(`\nTotal backtest MAD: ${summary}`);
  console.log(`Best fit: ${report.bestFit}\n`);
});
