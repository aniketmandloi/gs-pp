import { normalBands, type Model } from "../forecast.ts";
import { differences } from "../stats.ts";

/** Tomorrow = today. σ̂ is the RMS of the one-step residuals y_t − y_{t−1}. */
export const naive: Model = {
  name: "Naive",
  forecast({ prices }, horizon) {
    const residuals = differences(prices);
    const sigma = Math.sqrt(residuals.reduce((sum, e) => sum + e * e, 0) / residuals.length);
    const last = prices.at(-1)!;
    const steps = Array.from({ length: horizon }, (_, i) => i + 1);
    return {
      point: steps.map(() => last),
      bands: normalBands(
        steps.map(() => last),
        steps.map((h) => sigma * Math.sqrt(h)),
      ),
    };
  },
};
