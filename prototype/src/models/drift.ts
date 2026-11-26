import { normalBands, type Model } from "../forecast.ts";
import { differences } from "../stats.ts";

/** Straight line from the first to the last observation, with fpp3 drift intervals. */
export const drift: Model = {
  name: "Drift",
  forecast({ prices }, horizon) {
    const T = prices.length;
    const slope = (prices.at(-1)! - prices[0]!) / (T - 1);
    const residuals = differences(prices).map((change) => change - slope);
    const sigma = Math.sqrt(residuals.reduce((sum, e) => sum + e * e, 0) / (residuals.length - 1));
    const steps = Array.from({ length: horizon }, (_, i) => i + 1);
    const point = steps.map((h) => prices.at(-1)! + h * slope);
    return {
      point,
      bands: normalBands(
        point,
        steps.map((h) => sigma * Math.sqrt(h * (1 + h / (T - 1)))),
      ),
    };
  },
};
