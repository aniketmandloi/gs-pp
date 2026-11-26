import ARIMA from "arima";
import { Z, type Band, type Level, type Model } from "../forecast.ts";

// arima 0.2.8 returns garbage when the search picks an order with p = q = 0, e.g. (0,1,0)
// on gold: the first log forecast is ~1e-309 and later steps sit near 2016 log prices.
// No real forecast moves log price by 1 (a 63% to 172% swing) within 30 weekdays.
const MAX_LOG_MOVE = 1;

/** AutoARIMA on log prices; predict's second array is the forecast MSE (variance) per step. */
export const autoArima: Model = {
  name: "AutoARIMA (log price)",
  forecast({ prices }, horizon) {
    const logPrices = prices.map(Math.log);
    const model = new ARIMA({ auto: true }).fit(logPrices);
    const [logPoint, mse] = model.predict(horizon);
    model.destroy();
    const logLast = logPrices.at(-1)!;
    if (!logPoint.every((value) => Math.abs(value - logLast) < MAX_LOG_MOVE)) return null;
    const band = (level: Level): Band => ({
      lower: logPoint.map((value, i) => Math.exp(value - Z[level] * Math.sqrt(mse[i]!))),
      upper: logPoint.map((value, i) => Math.exp(value + Z[level] * Math.sqrt(mse[i]!))),
    });
    return { point: logPoint.map(Math.exp), bands: { 0.8: band(0.8), 0.95: band(0.95) } };
  },
};
