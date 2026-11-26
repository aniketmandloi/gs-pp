export const LEVELS = [0.8, 0.95] as const;
export type Level = (typeof LEVELS)[number];

/** Two-sided standard normal quantiles for each interval level. */
export const Z: Record<Level, number> = { 0.8: 1.2815515655446004, 0.95: 1.959963984540054 };

export interface Band {
  lower: number[];
  upper: number[];
}

/** Arrays are indexed by horizon - 1 and hold INR per troy ounce. */
export interface Forecast {
  point: number[];
  bands: Record<Level, Band> | null;
}

/** Weekday prices up to and including the forecast origin. */
export interface History {
  dates: readonly string[];
  prices: readonly number[];
}

export interface Model {
  name: string;
  /** Returns null when the model produced no usable forecast at this origin. */
  forecast(history: History, horizon: number): Forecast | null;
}

/** Builds bands as point ± z·sd[h], the shape every analytic-interval model shares. */
export function normalBands(point: number[], sd: number[]): Record<Level, Band> {
  const band = (level: Level): Band => ({
    lower: point.map((p, i) => p - Z[level] * sd[i]!),
    upper: point.map((p, i) => p + Z[level] * sd[i]!),
  });
  return { 0.8: band(0.8), 0.95: band(0.95) };
}
