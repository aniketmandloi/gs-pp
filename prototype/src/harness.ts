import type { Forecast, Level, Model } from "./forecast.ts";
import { isWeekday, loadCalendarDays, type Metal } from "./series.ts";

export const HORIZON = 30;
export const SCORED_HORIZONS = [1, 7, 30] as const;
export const ORIGIN_STEP = 5;
const TEST_YEARS = 3;

export interface Outcome {
  origin: number;
  forecast: Forecast | null;
  ms: number;
}

export interface WeekdaySeries {
  dates: string[];
  prices: number[];
}

export async function loadWeekdays(metal: Metal): Promise<WeekdaySeries> {
  const weekdays = (await loadCalendarDays(metal)).filter((day) => isWeekday(day.date));
  return { dates: weekdays.map((day) => day.date), prices: weekdays.map((day) => day.inrPerOz) };
}

/** Every ORIGIN_STEP weekdays over the last TEST_YEARS, leaving HORIZON outcomes after the last. */
export function testOrigins(dates: string[]): number[] {
  const last = new Date(`${dates.at(-1)}T00:00:00Z`);
  last.setUTCFullYear(last.getUTCFullYear() - TEST_YEARS);
  const testStart = last.toISOString().slice(0, 10);
  const origins: number[] = [];
  for (let origin = dates.findIndex((date) => date >= testStart); origin + HORIZON < dates.length; origin += ORIGIN_STEP) {
    origins.push(origin);
  }
  return origins;
}

export function runModel(model: Model, { dates, prices }: WeekdaySeries, origins: number[]): Outcome[] {
  return origins.map((origin) => {
    const history = { dates: dates.slice(0, origin + 1), prices: prices.slice(0, origin + 1) };
    const started = performance.now();
    const forecast = model.forecast(history, HORIZON);
    return { origin, forecast, ms: performance.now() - started };
  });
}

export function absoluteError(outcome: Outcome, prices: number[], h: number): number {
  return Math.abs(prices[outcome.origin + h]! - outcome.forecast!.point[h - 1]!);
}

export function absolutePercentErrors(outcomes: Outcome[], prices: number[], h: number): number[] {
  return outcomes.map((o) => absoluteError(o, prices, h) / prices[o.origin + h]!);
}

export function coverage(outcomes: Outcome[], prices: number[], h: number, level: Level): string {
  const banded = outcomes.filter((outcome) => outcome.forecast?.bands);
  if (banded.length === 0) return "n/a";
  const inside = banded.filter((outcome) => {
    const band = outcome.forecast!.bands![level];
    const actual = prices[outcome.origin + h]!;
    return band.lower[h - 1]! <= actual && actual <= band.upper[h - 1]!;
  }).length;
  const share = (inside / banded.length).toFixed(2);
  return banded.length === outcomes.length ? share : `${share} (n=${banded.length})`;
}
