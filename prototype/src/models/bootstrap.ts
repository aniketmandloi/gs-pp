import type { Band, Level, Model } from "../forecast.ts";
import { differences, quantileSorted } from "../stats.ts";

const PATHS = 2000;
const SEED = 20160101;

/** mulberry32: Math.random cannot be seeded, and a fixed seed keeps reruns identical. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random walk on log prices whose steps are resampled from the daily log returns seen up to
 * the origin. The point forecast is the median path value, so it carries the historical drift.
 */
export const bootstrapWalk: Model = {
  name: "Log-return bootstrap",
  forecast({ prices }, horizon) {
    const returns = differences(prices.map(Math.log));
    const random = seededRandom(SEED + prices.length);
    const logLast = Math.log(prices.at(-1)!);
    const byHorizon = Array.from({ length: horizon }, () => new Array<number>(PATHS));
    for (let path = 0; path < PATHS; path++) {
      let logPrice = logLast;
      for (let step = 0; step < horizon; step++) {
        logPrice += returns[Math.floor(random() * returns.length)]!;
        byHorizon[step]![path] = Math.exp(logPrice);
      }
    }
    for (const values of byHorizon) values.sort((a, b) => a - b);
    const band = (level: Level): Band => ({
      lower: byHorizon.map((values) => quantileSorted(values, (1 - level) / 2)),
      upper: byHorizon.map((values) => quantileSorted(values, (1 + level) / 2)),
    });
    return {
      point: byHorizon.map((values) => quantileSorted(values, 0.5)),
      bands: { 0.8: band(0.8), 0.95: band(0.95) },
    };
  },
};
