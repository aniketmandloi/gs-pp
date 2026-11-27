const DAY_MS = 86_400_000;
const STALE_AFTER_TRADING_DAYS = 2;

/** Trading days are weekdays; there is no holiday calendar. */
export function isTradingDay(date: string): boolean {
  const weekday = new Date(date).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** Whether the latest spot price is more than 2 trading days older than today. */
export function isSpotStale(latestSpotDate: string, today: string): boolean {
  let tradingDays = 0;
  for (
    let ms = Date.parse(latestSpotDate) + DAY_MS;
    ms <= Date.parse(today);
    ms += DAY_MS
  ) {
    if (isTradingDay(new Date(ms).toISOString())) {
      tradingDays++;
    }
  }
  return tradingDays > STALE_AFTER_TRADING_DAYS;
}
