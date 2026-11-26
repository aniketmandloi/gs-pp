import { LEVELS, type Forecast, type Level, type Model } from "./forecast.ts";
import { naive } from "./models/naive.ts";
import { isWeekday, loadCalendarDays, METALS } from "./series.ts";
import { mean, median } from "./stats.ts";

const HORIZON = 30;
const SCORED_HORIZONS = [1, 7, 30] as const;
const ORIGIN_STEP = 5;
const TEST_YEARS = 3;

const MODELS: Model[] = [naive];

interface Outcome {
  origin: number;
  forecast: Forecast | null;
  ms: number;
}

function runModel(model: Model, dates: string[], prices: number[], origins: number[]): Outcome[] {
  return origins.map((origin) => {
    const history = { dates: dates.slice(0, origin + 1), prices: prices.slice(0, origin + 1) };
    const started = performance.now();
    const forecast = model.forecast(history, HORIZON);
    return { origin, forecast, ms: performance.now() - started };
  });
}

function absoluteError(outcome: Outcome, prices: number[], h: number): number {
  return Math.abs(prices[outcome.origin + h]! - outcome.forecast!.point[h - 1]!);
}

function coverage(outcomes: Outcome[], prices: number[], h: number, level: Level): string {
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

function tableRow(model: Model, outcomes: Outcome[], baseline: Outcome[], prices: number[]): string {
  const scored = outcomes.filter((outcome) => outcome.forecast);
  const scoredBaseline = baseline.filter((_, i) => outcomes[i]!.forecast);
  const cells = [model.name, `${scored.length}/${outcomes.length}`];
  const ape = (list: Outcome[], h: number) => list.map((o) => absoluteError(o, prices, h) / prices[o.origin + h]!);
  for (const h of SCORED_HORIZONS) {
    const mape = mean(ape(scored, h)) * 100;
    const ratio = mape / (mean(ape(scoredBaseline, h)) * 100);
    cells.push(`${mape.toFixed(2)} (${ratio.toFixed(2)})`);
  }
  cells.push(
    model === naive
      ? "-"
      : SCORED_HORIZONS.map((h) => {
          const wins = scored.filter(
            (o, i) => absoluteError(o, prices, h) < absoluteError(scoredBaseline[i]!, prices, h),
          ).length;
          return (wins / scored.length).toFixed(2);
        }).join(" / "),
  );
  for (const level of LEVELS) {
    cells.push(SCORED_HORIZONS.map((h) => coverage(scored, prices, h, level)).join(" / "));
  }
  cells.push(median(outcomes.map((o) => o.ms)).toFixed(1));
  return `| ${cells.join(" | ")} |`;
}

for (const metal of METALS) {
  const weekdays = (await loadCalendarDays(metal)).filter((day) => isWeekday(day.date));
  const dates = weekdays.map((day) => day.date);
  const prices = weekdays.map((day) => day.inrPerOz);
  const last = new Date(`${dates.at(-1)}T00:00:00Z`);
  last.setUTCFullYear(last.getUTCFullYear() - TEST_YEARS);
  const testStart = last.toISOString().slice(0, 10);
  const origins: number[] = [];
  for (let origin = dates.findIndex((date) => date >= testStart); origin + HORIZON < dates.length; origin += ORIGIN_STEP) {
    origins.push(origin);
  }
  const outcomes = MODELS.map((model) => runModel(model, dates, prices, origins));
  const baseline = outcomes[MODELS.indexOf(naive)]!;

  console.log(`## ${metal}`);
  console.log("");
  console.log(
    `${origins.length} origins, ${dates[origins[0]!]} to ${dates[origins.at(-1)!]}, every ${ORIGIN_STEP} weekdays; training starts ${dates[0]}.`,
  );
  console.log("");
  console.log(
    "| Model | Origins scored | MAPE % h=1 (ratio) | MAPE % h=7 (ratio) | MAPE % h=30 (ratio) | Win share h=1/7/30 | 80% coverage h=1/7/30 | 95% coverage h=1/7/30 | Median ms |",
  );
  console.log("|---|---|---|---|---|---|---|---|---|");
  MODELS.forEach((model, i) => console.log(tableRow(model, outcomes[i]!, baseline, prices)));
  console.log("");
}
