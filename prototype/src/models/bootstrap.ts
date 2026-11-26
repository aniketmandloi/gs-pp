import type { Band, Level, Model } from "../forecast.ts";
import { differences, mean, quantileSorted } from "../stats.ts";

const PATHS = 2000;
const SEED = 20160101;
const EWMA_LAMBDA = 0.94;
// Returns used to seed the EWMA variance before standardizing starts.
const EWMA_WARMUP = 20;

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

/** Turns the daily log returns up to the origin into the pool that paths resample from. */
type ReturnPool = (returns: number[]) => number[];

const fullHistory: ReturnPool = (returns) => returns;

const trailing =
  (days: number): ReturnPool =>
  (returns) =>
    returns.slice(-days);

/**
 * Filtered historical simulation: each return is divided by the EWMA volatility known the day
 * before it, and the standardized returns are rescaled by the EWMA volatility at the origin.
 */
const ewmaScaled: ReturnPool = (returns) => {
  let variance = mean(returns.slice(0, EWMA_WARMUP).map((r) => r * r));
  const standardized: number[] = [];
  for (const r of returns.slice(EWMA_WARMUP)) {
    standardized.push(r / Math.sqrt(variance));
    variance = EWMA_LAMBDA * variance + (1 - EWMA_LAMBDA) * r * r;
  }
  const originSigma = Math.sqrt(variance);
  return standardized.map((z) => z * originSigma);
};

/**
 * Random walk on log prices whose steps are resampled from the pool. The point forecast is the
 * median path value, so it carries the pool's drift; with zeroDrift the pool is demeaned and the
 * point forecast is the last price, which separates interval calibration from point accuracy.
 */
function bootstrapModel(name: string, pool: ReturnPool, zeroDrift: boolean): Model {
  return {
    name,
    forecast({ prices }, horizon) {
      const drawn = pool(differences(prices.map(Math.log)));
      const center = zeroDrift ? mean(drawn) : 0;
      const steps = drawn.map((r) => r - center);
      const random = seededRandom(SEED + prices.length);
      const last = prices.at(-1)!;
      const logLast = Math.log(last);
      const byHorizon = Array.from({ length: horizon }, () => new Array<number>(PATHS));
      for (let path = 0; path < PATHS; path++) {
        let logPrice = logLast;
        for (let step = 0; step < horizon; step++) {
          logPrice += steps[Math.floor(random() * steps.length)]!;
          byHorizon[step]![path] = Math.exp(logPrice);
        }
      }
      for (const values of byHorizon) values.sort((a, b) => a - b);
      const band = (level: Level): Band => ({
        lower: byHorizon.map((values) => quantileSorted(values, (1 - level) / 2)),
        upper: byHorizon.map((values) => quantileSorted(values, (1 + level) / 2)),
      });
      return {
        point: zeroDrift ? byHorizon.map(() => last) : byHorizon.map((values) => quantileSorted(values, 0.5)),
        bands: { 0.8: band(0.8), 0.95: band(0.95) },
      };
    },
  };
}

export const bootstrapWalk = bootstrapModel("Log-return bootstrap", fullHistory, false);
export const bootstrap250 = bootstrapModel("Bootstrap, last 250 days", trailing(250), false);
// 250 days is the trailing window whose coverage came closest to nominal for both metals.
export const bootstrap250ZeroDrift = bootstrapModel("Bootstrap, last 250 days, zero drift", trailing(250), true);
export const bootstrap500 = bootstrapModel("Bootstrap, last 500 days", trailing(500), false);
export const bootstrap750 = bootstrapModel("Bootstrap, last 750 days", trailing(750), false);
export const bootstrapEwma = bootstrapModel("Bootstrap, EWMA-scaled (λ 0.94)", ewmaScaled, false);
