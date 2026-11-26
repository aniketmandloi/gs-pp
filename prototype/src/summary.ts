import { isWeekday, loadCalendarDays, METALS } from "./series.ts";

const DAY_MS = 86_400_000;
const SPIKE = 0.1;

for (const metal of METALS) {
  const calendar = await loadCalendarDays(metal);
  const duplicates = calendar.filter((day, i) => i > 0 && calendar[i - 1]?.date === day.date);
  const missingDays: string[] = [];
  for (let i = 1; i < calendar.length; i++) {
    const previous = Date.parse(calendar[i - 1]!.date);
    for (let ms = previous + DAY_MS; ms < Date.parse(calendar[i]!.date); ms += DAY_MS) {
      missingDays.push(new Date(ms).toISOString().slice(0, 10));
    }
  }
  const weekdays = calendar.filter((day) => isWeekday(day.date));
  const nonPositive = weekdays.filter((day) => !(day.inrPerOz > 0));
  const spikes: string[] = [];
  let unchanged = 0;
  for (let i = 1; i < weekdays.length; i++) {
    const before = weekdays[i - 1]!;
    const after = weekdays[i]!;
    const change = after.inrPerOz / before.inrPerOz - 1;
    if (Math.abs(change) > SPIKE) {
      spikes.push(`${before.date} ${before.inrPerOz} -> ${after.date} ${after.inrPerOz} (${(change * 100).toFixed(1)}%)`);
    }
    if (after.inrPerOz === before.inrPerOz) unchanged += 1;
  }
  console.log(`## ${metal}`);
  console.log(`calendar rows: ${calendar.length}, ${calendar[0]?.date} to ${calendar.at(-1)?.date}`);
  console.log(`duplicate dates: ${duplicates.length}`);
  console.log(`missing calendar days: ${missingDays.length}${missingDays.length ? ` (${missingDays.join(", ")})` : ""}`);
  console.log(`weekday rows: ${weekdays.length}`);
  console.log(`weekday prices <= 0 or not finite: ${nonPositive.length}`);
  console.log(`weekdays with price equal to the previous weekday: ${unchanged}`);
  console.log(`weekday-to-weekday moves over ${SPIKE * 100}%: ${spikes.length}`);
  for (const spike of spikes) console.log(`  ${spike}`);
}
