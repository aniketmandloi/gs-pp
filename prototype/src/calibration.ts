import { LEVELS, type Level, type Model } from "./forecast.ts";
import {
  absolutePercentErrors,
  coverage,
  loadWeekdays,
  runModel,
  SCORED_HORIZONS,
  testOrigins,
  type Outcome,
} from "./harness.ts";
import {
  bootstrap250,
  bootstrap250ZeroDrift,
  bootstrap500,
  bootstrap750,
  bootstrapEwma,
  bootstrapWalk,
} from "./models/bootstrap.ts";
import { naive } from "./models/naive.ts";
import { METALS } from "./series.ts";
import { mean } from "./stats.ts";

const MODELS: Model[] = [naive, bootstrapWalk, bootstrap250, bootstrap250ZeroDrift, bootstrap500, bootstrap750, bootstrapEwma];

/** Mean band width as a percentage of the price at the origin, which the app knows when it draws the band. */
function width(outcomes: Outcome[], prices: number[], h: number, level: Level): string {
  const widths = outcomes.map((o) => {
    const band = o.forecast!.bands![level];
    return (band.upper[h - 1]! - band.lower[h - 1]!) / prices[o.origin]!;
  });
  return (mean(widths) * 100).toFixed(1);
}

function tableRow(model: Model, outcomes: Outcome[], baseline: Outcome[], prices: number[]): string {
  const cells = [model.name];
  for (const h of SCORED_HORIZONS) {
    const mape = mean(absolutePercentErrors(outcomes, prices, h)) * 100;
    const ratio = mape / (mean(absolutePercentErrors(baseline, prices, h)) * 100);
    cells.push(`${mape.toFixed(2)} (${ratio.toFixed(2)})`);
  }
  for (const level of LEVELS) {
    cells.push(SCORED_HORIZONS.map((h) => coverage(outcomes, prices, h, level)).join(" / "));
  }
  for (const level of LEVELS) {
    cells.push(SCORED_HORIZONS.map((h) => width(outcomes, prices, h, level)).join(" / "));
  }
  return `| ${cells.join(" | ")} |`;
}

for (const metal of METALS) {
  const series = await loadWeekdays(metal);
  const origins = testOrigins(series.dates);
  const outcomes = MODELS.map((model) => runModel(model, series, origins));
  const baseline = outcomes[MODELS.indexOf(naive)]!;

  console.log(`## ${metal}`);
  console.log("");
  console.log(
    "| Model | MAPE % h=1 (ratio) | MAPE % h=7 (ratio) | MAPE % h=30 (ratio) | 80% coverage h=1/7/30 | 95% coverage h=1/7/30 | 80% width % h=1/7/30 | 95% width % h=1/7/30 |",
  );
  console.log("|---|---|---|---|---|---|---|---|");
  MODELS.forEach((model, i) => console.log(tableRow(model, outcomes[i]!, baseline, series.prices)));
  console.log("");
}
