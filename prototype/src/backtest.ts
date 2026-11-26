import { LEVELS, type Model } from "./forecast.ts";
import {
  absoluteError,
  absolutePercentErrors,
  coverage,
  loadWeekdays,
  ORIGIN_STEP,
  runModel,
  SCORED_HORIZONS,
  testOrigins,
  type Outcome,
} from "./harness.ts";
import { autoArima } from "./models/arima.ts";
import { bootstrapWalk } from "./models/bootstrap.ts";
import { drift } from "./models/drift.ts";
import { autoEtsLevel, autoEtsLog } from "./models/ets.ts";
import { naive } from "./models/naive.ts";
import { prophet } from "./models/prophet.ts";
import { METALS } from "./series.ts";
import { mean, median } from "./stats.ts";

const MODELS: Model[] = [naive, drift, bootstrapWalk, autoEtsLevel, autoEtsLog, prophet, autoArima];

function tableRow(model: Model, outcomes: Outcome[], baseline: Outcome[], prices: number[]): string {
  const scored = outcomes.filter((outcome) => outcome.forecast);
  const scoredBaseline = baseline.filter((_, i) => outcomes[i]!.forecast);
  const cells = [model.name, `${scored.length}/${outcomes.length}`];
  for (const h of SCORED_HORIZONS) {
    const mape = mean(absolutePercentErrors(scored, prices, h)) * 100;
    const ratio = mape / (mean(absolutePercentErrors(scoredBaseline, prices, h)) * 100);
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
  const series = await loadWeekdays(metal);
  const { dates, prices } = series;
  const origins = testOrigins(dates);
  const outcomes = MODELS.map((model) => runModel(model, series, origins));
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
  MODELS.forEach((model, i) => {
    const unscored = outcomes[i]!.filter((outcome) => !outcome.forecast).map((outcome) => dates[outcome.origin]);
    if (unscored.length > 0) console.log(`${model.name} unscored origins: ${unscored.join(", ")}.\n`);
  });
}
