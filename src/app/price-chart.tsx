"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { PricePoint } from "@/forecast/indian-price";
import { calendarDay, rupees } from "./formats";

const chartConfig = {
  price: { color: "var(--color-amber-600)" },
} satisfies ChartConfig;

const month = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const compactRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumSignificantDigits: 3,
});

export default function PriceChart({ history }: { history: PricePoint[] }) {
  return (
    <figure className="mt-6">
      <figcaption className="text-sm text-neutral-600">
        Last 12 months, including 3% GST
      </figcaption>
      <ChartContainer
        config={chartConfig}
        className="mt-2 aspect-auto h-56 w-full"
      >
        <LineChart data={history} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickFormatter={(date: string) => month.format(new Date(date))}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(price: number) => compactRupees.format(price)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(date) => calendarDay.format(new Date(date))}
                formatter={(price) => rupees.format(Number(price))}
              />
            }
          />
          <Line
            dataKey="price"
            stroke="var(--color-price)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}
