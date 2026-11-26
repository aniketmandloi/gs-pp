import { readFileSync } from "node:fs";
import { initSync, Prophet } from "@bsull/augurs/prophet";
import { optimizer } from "@bsull/augurs-prophet-wasmstan";
import type { Band, History, Level, Model } from "../forecast.ts";
import { isWeekday } from "../series.ts";

// The package ships a web-target wasm-bindgen build, so Node must load the binary itself.
initSync({ module: readFileSync(new URL("prophet_bg.wasm", import.meta.resolve("@bsull/augurs/prophet"))) });

const DAY_SECONDS = 86_400;

function toSeconds(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 1000;
}

function nextWeekdays(lastDate: string, count: number): number[] {
  const result: number[] = [];
  for (let seconds = toSeconds(lastDate) + DAY_SECONDS; result.length < count; seconds += DAY_SECONDS) {
    if (isWeekday(new Date(seconds * 1000).toISOString().slice(0, 10))) result.push(seconds);
  }
  return result;
}

/** Prophet takes one interval width per model, so each level needs its own fit. */
function fitAtLevel({ dates, prices }: History, future: number[], level: Level): { point: number[]; band: Band } {
  // Weekly seasonality is off because weekends were dropped.
  using model = new Prophet({ optimizer, intervalWidth: level, weeklySeasonality: { type: "manual", enabled: false } });
  model.fit({ ds: dates.map(toSeconds), y: [...prices] });
  const { yhat } = model.predict({ ds: future });
  // Intervals are present whenever uncertaintySamples is above 0, which the default (1000) is.
  return { point: yhat.point, band: { lower: yhat.intervals!.lower, upper: yhat.intervals!.upper } };
}

/** Prophet defaults on the price series apart from weekly seasonality; timings include both fits. */
export const prophet: Model = {
  name: "Prophet",
  forecast(history, horizon) {
    const future = nextWeekdays(history.dates.at(-1)!, horizon);
    try {
      const at80 = fitAtLevel(history, future, 0.8);
      const at95 = fitAtLevel(history, future, 0.95);
      return { point: at80.point, bands: { 0.8: at80.band, 0.95: at95.band } };
    } catch (error) {
      // The wasm Stan optimizer traps ("RuntimeError: unreachable") on some origins whatever
      // the algorithm; the backtest reports those origins as unscored.
      if (error instanceof Error && error.message.startsWith("Optimization failed")) return null;
      throw error;
    }
  },
};
