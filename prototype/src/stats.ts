export function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Linear-interpolation quantile of an ascending array, q in [0, 1]. */
export function quantileSorted(sorted: readonly number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below]! + (sorted[above]! - sorted[below]!) * (position - below);
}

export function median(values: readonly number[]): number {
  return quantileSorted([...values].sort((a, b) => a - b), 0.5);
}

export function differences(values: readonly number[]): number[] {
  return values.slice(1).map((value, i) => value - values[i]!);
}
