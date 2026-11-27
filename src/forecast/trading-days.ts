/** Trading days are weekdays; there is no holiday calendar. */
export function isTradingDay(date: string): boolean {
  const weekday = new Date(date).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}
