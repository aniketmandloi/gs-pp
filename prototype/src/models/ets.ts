import { readFileSync } from "node:fs";
import { AutoETS, initSync } from "@bsull/augurs/ets";
import type { Forecast, Model } from "../forecast.ts";

// The package ships a web-target wasm-bindgen build, so Node must load the binary itself.
initSync({ module: readFileSync(new URL("ets_bg.wasm", import.meta.resolve("@bsull/augurs/ets"))) });

/** Non-seasonal search: augurs does not implement seasonal ETS. */
const SPEC = "ZZN";

function fitAndPredict(series: number[], horizon: number, back: (value: number) => number): Forecast {
  using model = new AutoETS(1, SPEC);
  model.fit(series);
  const at80 = model.predict(horizon, 0.8);
  const at95 = model.predict(horizon, 0.95);
  const point = at80.point.map(back);
  if (!at80.intervals || !at95.intervals) return { point, bands: null };
  return {
    point,
    bands: {
      0.8: { lower: at80.intervals.lower.map(back), upper: at80.intervals.upper.map(back) },
      0.95: { lower: at95.intervals.lower.map(back), upper: at95.intervals.upper.map(back) },
    },
  };
}

export const autoEtsLevel: Model = {
  name: "AutoETS (price)",
  forecast: ({ prices }, horizon) => fitAndPredict([...prices], horizon, (value) => value),
};

export const autoEtsLog: Model = {
  name: "AutoETS (log price)",
  forecast: ({ prices }, horizon) => fitAndPredict(prices.map(Math.log), horizon, Math.exp),
};
