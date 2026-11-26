# Backtest results for issue #11

Question: does any TypeScript model beat the naive "tomorrow = today" forecast on MAPE at 1, 7, and 30 trading days for gold (XAU) and silver (XAG) in INR per troy ounce?

Short answer (measured): no model beats naive at h=1 or h=7 for either metal, and none beats it at any horizon for silver. On gold at h=30, the log-return bootstrap, drift, and AutoETS on prices cut MAPE by 5 to 6% and beat naive at 66 to 70% of origins. That is the only gain, and it is small. No model's intervals are well calibrated. With one exception, every interval covers less than its nominal level, and the shortfall mostly grows with the horizon.

Labels: **measured** means a script in this folder produced the number on this machine. **Inferred** means it follows from reading code, docs, or the numbers. **Guess** means neither.

## How to rerun

```sh
cd prototype
pnpm install
pnpm run fetch-prices   # reads GOLD_API_KEY from ../.env; skips windows already cached
pnpm run summary        # data checks below
pnpm run backtest       # tables below, about 7 minutes
pnpm run calibration    # bootstrap variants in the last section, about 20 seconds
```

The cache lives at `~/.cache/gs-pp/goldapi/{XAU,XAG}/{from}_{to}.json`, outside the repo.

## Data

- Source (measured): goldapi.io `/api/history/{XAU|XAG}/INR`, requested 2016-01-01 to 2026-11-26 in 45 windows of up to 90 days per metal, 90 requests in total. `/api/stat` showed `requests_month` 7 before the fetch and 97 after, so the stat calls themselves are not counted.
- Rows (measured): 3,982 calendar days per metal, 2016-01-01 to 2026-11-25. The API returned no row for 2026-11-26 although the last window asked for it. No duplicate dates and no missing calendar days.
- After dropping Saturdays and Sundays (measured): 2,844 weekday rows per metal.
- Zero, negative, or non-finite prices (measured): none.
- Weekdays priced the same as the previous weekday (measured): 36 per metal, on the same dates for both metals. Every one falls on Easter Monday, 25 or 26 December, 1 January, or an early-May Monday (measured from the date list), so the feed carries the last price over London market holidays (inferred). Weekend rows also repeat Friday's price (measured on the first window). These rows were kept.
- Weekday-to-weekday moves over 10% (measured): none for gold, eight for silver. They were kept, not fixed:
  - 2020-03-13 → 2020-03-16: −17.4%
  - 2020-08-04 → 2020-08-05: +10.5%
  - 2026-01-23 → 2026-01-26: +10.3%
  - 2026-01-29 → 2026-01-30: −12.9%
  - 2026-01-30 → 2026-02-02: −21.0%
  - 2026-02-04 → 2026-02-05: −13.2%
  - 2026-03-02 → 2026-03-03: −13.5%
  - 2026-03-18 → 2026-03-19: −10.8%

  These fall in the March 2020 sell-off and around silver's January 2026 peak, so they look like real market moves rather than feed errors (guess).
- Price path over the test window (measured): gold went from ₹167,820 (2023-11-27) to a peak of ₹505,904 (2026-01-29), then to ₹325,949 (2026-11-25). Silver went from ₹2,065 to a peak of ₹10,892 (2026-01-29), then to ₹3,635.

## Method

- Origins (measured): 151 per metal, every 5 weekdays from 2023-11-27 to 2026-10-12, which covers the last three years and leaves 30 weekdays of outcomes after the last origin. Every model uses the same origins.
- Fitting (inferred from the code): each model sees only weekday prices from 2016-01-01 up to and including the origin (expanding window), so σ̂, bootstrap returns, and model fits never use later prices. Each model forecasts h = 1 to 30 weekdays ahead, and h = 1, 7, and 30 are scored.
- Metrics: MAPE in %; the ratio to naive's MAPE on the same origins (below 1 is better); win share, the fraction of origins where the model's absolute error is below naive's; the fraction of outcomes inside the 80% and 95% intervals; and the median wall time per origin for fit plus forecast, including both interval levels.
- Models:
  - **Naive**: last price, with intervals ŷ ± z·σ̂·√h, where σ̂ is the RMS of one-step price changes.
  - **Drift**: a straight line from the first to the last price, with fpp3 intervals σ̂·√(h(1 + h/(T − 1))).
  - **Log-return bootstrap**: 2,000 paths that resample past daily log returns with a fixed seed. The point forecast is the median path value and the intervals are the 10/90 and 2.5/97.5 percentiles.
  - **AutoETS**: `@bsull/augurs` 0.10.3 `./ets`, spec `ZZN` (non-seasonal), run on prices and on log prices. Intervals come from `predict(h, level)` and are exponentiated for the log variant.
  - **Prophet**: `@bsull/augurs` 0.10.3 Prophet with `@bsull/augurs-prophet-wasmstan` 0.2.0, defaults on prices except weekly seasonality, which is off because the series has no weekends. Prophet takes one interval width per model, so each origin runs two fits.
  - **AutoARIMA**: `arima` 0.2.8 with `auto: true` on log prices. The second array that `predict` returns is the forecast MSE (variance). On silver its h=1 value matches the sample variance of daily log returns to within 1%, for example 2.68e-4 against 2.68e-4 (measured at 20 origins), and the README calls it "mean square errors". Intervals are exp(ŷ ± z·√MSE).

## Gold (XAU)

Measured. Each MAPE cell shows the MAPE with its ratio to naive in brackets. Win share and coverage cells give h=1 / h=7 / h=30.

| Model | Origins scored | MAPE % h=1 (ratio) | MAPE % h=7 (ratio) | MAPE % h=30 (ratio) | Win share h=1/7/30 | 80% coverage h=1/7/30 | 95% coverage h=1/7/30 | Median ms |
|---|---|---|---|---|---|---|---|---|
| Naive | 151/151 | 0.82 (1.00) | 2.45 (1.00) | 6.02 (1.00) | - | 0.58 / 0.44 / 0.32 | 0.72 / 0.61 / 0.50 | 0.1 |
| Drift | 151/151 | 0.81 (0.99) | 2.40 (0.98) | 5.72 (0.95) | 0.58 / 0.61 / 0.70 | 0.58 / 0.44 / 0.38 | 0.72 / 0.65 / 0.56 | 0.1 |
| Log-return bootstrap | 151/151 | 0.81 (1.00) | 2.38 (0.97) | 5.63 (0.94) | 0.58 / 0.60 / 0.66 | 0.71 / 0.72 / 0.64 | 0.87 / 0.87 / 0.82 | 11.1 |
| AutoETS (price) | 151/151 | 0.81 (1.00) | 2.42 (0.99) | 5.71 (0.95) | 0.58 / 0.63 / 0.67 | 0.74 / 0.72 / 0.60 | 0.88 / 0.86 / 0.81 | 55.1 |
| AutoETS (log price) | 151/151 | 0.81 (1.00) | 2.41 (0.99) | 5.82 (0.97) | 0.58 / 0.62 / 0.67 | 0.77 / 0.74 / 0.64 | 0.89 / 0.88 / 0.87 | 46.6 |
| Prophet | 149/151 | 7.29 (8.82) | 8.26 (3.35) | 10.15 (1.70) | 0.04 / 0.08 / 0.17 | 0.16 / 0.11 / 0.09 | 0.30 / 0.22 / 0.17 | 1138.0 |
| AutoARIMA (log price) | 18/151 | 1.36 (1.30) | 5.50 (1.53) | 22.44 (2.60) | 0.39 / 0.44 / 0.39 | 0.50 / 0.78 / 0.78 | 0.78 / 0.83 / 0.89 | 170.0 |

- Prophet did not score two origins, 2024-12-23 and 2024-12-30 (measured). There its fit threw `Optimization failed: Error in optimization: JsValue(RuntimeError: unreachable ...)` from the wasm Stan optimizer. With weekly seasonality on, the error also hit 2024-08-21 and 2024-08-28 under the `lbfgs`, `bfgs`, and `newton` algorithms (measured).
- AutoARIMA did not score 133 of 151 origins (measured). At those origins `arima` returned a first log forecast near 1e-309, with later steps near 2016 log prices. Its verbose log at one such origin showed that the search had chosen ARIMA(0,1,0), and fixed orders (0,1,0) gave the same garbage while (1,1,0) and (0,1,1) did not (measured). The package appears to break whenever the chosen order has p = q = 0 (inferred). The 18 origins it did score are compared with naive on those same 18 origins. At three of the four scored origins I checked, its h=30 MSE was about 0.1, against about 0.003 for a random walk, which fits a d = 2 order (inferred).

## Silver (XAG)

Measured. Each MAPE cell shows the MAPE with its ratio to naive in brackets. Win share and coverage cells give h=1 / h=7 / h=30.

| Model | Origins scored | MAPE % h=1 (ratio) | MAPE % h=7 (ratio) | MAPE % h=30 (ratio) | Win share h=1/7/30 | 80% coverage h=1/7/30 | 95% coverage h=1/7/30 | Median ms |
|---|---|---|---|---|---|---|---|---|
| Naive | 151/151 | 1.52 (1.00) | 4.75 (1.00) | 10.56 (1.00) | - | 0.59 / 0.52 / 0.44 | 0.73 / 0.70 / 0.69 | 0.1 |
| Drift | 151/151 | 1.52 (1.00) | 4.73 (1.00) | 10.49 (0.99) | 0.56 / 0.56 / 0.60 | 0.61 / 0.52 / 0.50 | 0.73 / 0.70 / 0.70 | 0.1 |
| Log-return bootstrap | 151/151 | 1.52 (1.00) | 4.72 (0.99) | 10.57 (1.00) | 0.53 / 0.56 / 0.60 | 0.71 / 0.68 / 0.70 | 0.89 / 0.87 / 0.85 | 10.8 |
| AutoETS (price) | 151/151 | 1.52 (1.00) | 4.76 (1.00) | 10.61 (1.00) | 0.54 / 0.54 / 0.58 | 0.77 / 0.73 / 0.70 | 0.89 / 0.85 / 0.83 | 47.8 |
| AutoETS (log price) | 151/151 | 1.52 (1.00) | 4.75 (1.00) | 10.73 (1.02) | 0.51 / 0.48 / 0.50 | 0.82 / 0.77 / 0.72 | 0.93 / 0.88 / 0.85 | 57.4 |
| Prophet | 151/151 | 11.35 (7.45) | 12.83 (2.70) | 15.97 (1.51) | 0.09 / 0.20 / 0.36 | 0.32 / 0.30 / 0.24 | 0.54 / 0.50 / 0.42 | 897.0 |
| AutoARIMA (log price) | 151/151 | 1.54 (1.01) | 4.78 (1.01) | 10.82 (1.02) | 0.51 / 0.52 / 0.45 | 0.77 / 0.75 / 0.71 | 0.91 / 0.87 / 0.85 | 274.0 |

Prophet's coverage figures moved by up to 0.03 between two full runs, because its interval sampling is not seeded (measured). Every other model's error and coverage figures were identical across runs; only timings varied.

## Conclusion

- **h=1** (measured): every working model lands within 1% of naive's MAPE on both metals (ratios 0.99 to 1.01). Nothing beats naive.
- **h=7** (measured): the best ratio is 0.97 (bootstrap, gold) and silver's best is 0.99. No model beats naive by a meaningful margin.
- **h=30, gold** (measured): the log-return bootstrap (0.94), drift (0.95), and AutoETS on prices (0.95) cut MAPE by 5 to 6%. They beat naive at 66 to 70% of origins. All three carry a trend, and gold roughly tripled from late 2023 to January 2026 (measured), so the gain is most likely the trend paying off in a rising market (inferred). Because the 30-day errors overlap at 5-day spacing, the 151 origins hold only about 25 independent 30-day outcomes (inferred). I expect the gain to shrink or reverse in a flat or falling market (guess).
- **h=30, silver** (measured): ratios run from 0.99 to 1.02. Nothing beats naive.
- **AutoETS, price or log price** (measured): on prices, MAPE is lower at h=30 for both metals (ratio to naive, gold: 0.95 against 0.97; silver: 1.00 against 1.02), and at h=1 and h=7 the two variants differ by at most 0.01 points. On log prices, coverage is closer to nominal. Neither beats naive on silver.
- **Prophet** (measured): its forecasts are worse than naive by 1.5 to 8.8 times. It is also the slowest model at about 1 second per origin, and it failed at two gold origins.
- **AutoARIMA** (measured): it is unusable on gold, where 133 of 151 origins produced garbage. On silver it is no better than naive.
- **Intervals** (measured): no model is well calibrated. Every interval covers less than its nominal level except AutoETS on log prices for silver at h=1, whose 80% interval covers 0.82.
  - Naive and drift are the worst: 95% intervals cover only 0.50 to 0.73. Their σ̂ comes from INR price changes since 2016, when prices were several times lower (gold ₹70,282 and silver ₹914 on 2016-01-01), so it understates current volatility (inferred).
  - AutoETS on log prices comes closest. For silver at h=1 it covers 0.82 and 0.93 against 0.80 and 0.95. Even so, its 30-day coverage falls to 0.64 to 0.72 for 80% intervals and 0.85 to 0.87 for 95% intervals.
  - The bootstrap behaves much like AutoETS on log prices. Its 95% intervals cover 0.82 to 0.89 and its 80% intervals cover 0.64 to 0.72.
- **What this means for the decision**: by the issue's rule, no TypeScript model beats the baseline, except a small and probably trend-dependent gain on gold at 30 days, so the model-language decision reopens. Python's ETS, ARIMA, and Prophet fit the same model families, and the TypeScript models that worked tie with naive on these random-walk-like series, so I do not expect Python models to beat naive by much either (guess). A Python backtest on the same cached data and origins would settle that question without spending more API quota (inferred).

## Follow-up: intervals fitted on recent volatility

Question: do bootstrap intervals built from recent returns reach their nominal 80% and 95% coverage? Coverage is what the app's band promises.

The data, origins, and scoring are the same as above. The run reads only the cache and made no goldapi requests. The loader now reads the fixed list of 45 windows per metal and stops with ENOENT if any file is missing (measured with an empty cache directory). The full-history bootstrap is unchanged and reproduces its earlier numbers exactly (measured).

Variants. Each one resamples 2,000 paths of daily log returns from a pool built only from returns before the origin:

- **Last 250, 500, or 750 days**: the pool is the trailing 250, 500, or 750 daily log returns. The point forecast is the median path, so it carries the window's mean return as drift.
- **Last 250 days, zero drift**: the pool is the same 250 returns with their mean subtracted, and the point forecast is the last price. Its MAPE therefore equals naive's, and its coverage shows the bands alone. I picked 250 days because it had the best coverage of the three windows on both metals.
- **EWMA-scaled (λ 0.94)**: filtered historical simulation. Each return since 2016 is divided by the EWMA volatility known the day before it, with the variance seeded from the first 20 returns. The standardized returns are then rescaled by the EWMA volatility at the origin, which is held constant across the horizon.

Width is the mean of (upper − lower) divided by the price at the origin, in %. At equal coverage, narrower is better.

### Gold (XAU)

Measured.

| Model | MAPE % h=1 (ratio) | MAPE % h=7 (ratio) | MAPE % h=30 (ratio) | 80% coverage h=1/7/30 | 95% coverage h=1/7/30 | 80% width % h=1/7/30 | 95% width % h=1/7/30 |
|---|---|---|---|---|---|---|---|
| Naive | 0.82 (1.00) | 2.45 (1.00) | 6.02 (1.00) | 0.58 / 0.44 / 0.32 | 0.72 / 0.61 / 0.50 | 1.3 / 3.5 / 7.3 | 2.0 / 5.4 / 11.2 |
| Log-return bootstrap | 0.81 (1.00) | 2.38 (0.97) | 5.63 (0.94) | 0.71 / 0.72 / 0.64 | 0.87 / 0.87 / 0.82 | 1.9 / 5.8 / 12.5 | 3.6 / 9.4 / 19.5 |
| Bootstrap, last 250 days | 0.81 (0.99) | 2.39 (0.98) | 5.63 (0.94) | 0.75 / 0.81 / 0.77 | 0.92 / 0.91 / 0.93 | 2.5 / 7.3 / 16.0 | 4.6 / 11.6 / 24.5 |
| Bootstrap, last 250 days, zero drift | 0.82 (1.00) | 2.45 (1.00) | 6.02 (1.00) | 0.77 / 0.75 / 0.66 | 0.91 / 0.89 / 0.87 | 2.5 / 7.3 / 15.3 | 4.6 / 11.5 / 23.5 |
| Bootstrap, last 500 days | 0.81 (0.99) | 2.39 (0.98) | 5.74 (0.95) | 0.73 / 0.77 / 0.72 | 0.92 / 0.90 / 0.90 | 2.2 / 6.6 / 14.3 | 4.1 / 10.5 / 22.1 |
| Bootstrap, last 750 days | 0.81 (1.00) | 2.40 (0.98) | 5.72 (0.95) | 0.72 / 0.75 / 0.65 | 0.90 / 0.87 / 0.89 | 2.1 / 6.3 / 13.6 | 3.9 / 10.1 / 21.0 |
| Bootstrap, EWMA-scaled (λ 0.94) | 0.81 (1.00) | 2.39 (0.98) | 5.94 (0.99) | 0.84 / 0.80 / 0.75 | 0.94 / 0.93 / 0.93 | 2.9 / 8.5 / 18.4 | 5.4 / 13.4 / 28.4 |

### Silver (XAG)

Measured.

| Model | MAPE % h=1 (ratio) | MAPE % h=7 (ratio) | MAPE % h=30 (ratio) | 80% coverage h=1/7/30 | 95% coverage h=1/7/30 | 80% width % h=1/7/30 | 95% width % h=1/7/30 |
|---|---|---|---|---|---|---|---|
| Naive | 1.52 (1.00) | 4.75 (1.00) | 10.56 (1.00) | 0.59 / 0.52 / 0.44 | 0.73 / 0.70 / 0.69 | 2.8 / 7.3 / 15.2 | 4.2 / 11.2 / 23.2 |
| Log-return bootstrap | 1.52 (1.00) | 4.72 (0.99) | 10.57 (1.00) | 0.71 / 0.68 / 0.70 | 0.89 / 0.87 / 0.85 | 3.7 / 10.9 / 23.9 | 6.6 / 17.8 / 37.7 |
| Bootstrap, last 250 days | 1.51 (0.99) | 4.81 (1.01) | 12.01 (1.14) | 0.79 / 0.77 / 0.76 | 0.94 / 0.89 / 0.89 | 4.9 / 14.1 / 31.4 | 8.5 / 22.4 / 48.4 |
| Bootstrap, last 250 days, zero drift | 1.52 (1.00) | 4.75 (1.00) | 10.56 (1.00) | 0.79 / 0.76 / 0.77 | 0.94 / 0.89 / 0.89 | 4.9 / 13.9 / 29.7 | 8.4 / 22.1 / 45.8 |
| Bootstrap, last 500 days | 1.51 (0.99) | 4.75 (1.00) | 11.20 (1.06) | 0.77 / 0.75 / 0.75 | 0.94 / 0.89 / 0.87 | 4.5 / 12.8 / 28.2 | 7.8 / 20.6 / 43.5 |
| Bootstrap, last 750 days | 1.51 (0.99) | 4.73 (1.00) | 10.95 (1.04) | 0.77 / 0.74 / 0.74 | 0.92 / 0.88 / 0.86 | 4.3 / 12.3 / 26.7 | 7.4 / 19.7 / 41.4 |
| Bootstrap, EWMA-scaled (λ 0.94) | 1.51 (0.99) | 4.74 (1.00) | 10.91 (1.03) | 0.85 / 0.79 / 0.81 | 0.96 / 0.93 / 0.89 | 5.6 / 16.3 / 35.4 | 10.0 / 25.7 / 55.3 |

### Conclusion

- **Closest to nominal at h=30 without much wider bands: the 250-day bootstrap** (measured).
  - Gold: 0.77 and 0.93 against 0.80 and 0.95.
  - Silver: 0.76 and 0.89. Its zero-drift twin gives 0.77 and 0.89.
  - Its bands are 26 to 31% wider than the full-history bootstrap's at h=30.
- **Point accuracy and drift** (measured): on silver, the 250-day drift ruins the point forecast (h=30 ratio 1.14), while the zero-drift version keeps naive's MAPE, matches the coverage, and has about 5% narrower bands. On gold, zero drift drops 30-day coverage from 0.77 to 0.66 and from 0.93 to 0.87. Gold's upward trend in the test window was pulling the drifted bands toward the outcomes (inferred).
- **The EWMA-scaled variant** (measured):
  - It has the best short-horizon calibration: at h=1 it covers 0.84 and 0.94 on gold and 0.85 and 0.96 on silver.
  - At h=30 it covers 0.75 and 0.93 on gold, no better than the 250-day window. On silver it covers 0.81 and 0.89, which is better only at 80%.
  - Its bands are 13 to 16% wider than the 250-day bands and about 47% wider than full-history bands.
  - Holding the origin volatility fixed for 30 days is probably why it gains nothing at long horizons (guess).
- **No variant reaches 95% on silver at h=30** (measured): the best is 0.89, even with 95% bands 46 to 55% of the price wide. That fits silver's 2026 moves of 10 to 21% in a day (inferred).
- **Noise**: the 151 origins overlap at h=30, so they hold only about 25 independent 30-day outcomes. That gives a standard error of about 0.08 on an 80% coverage figure and about 0.04 on a 95% one (inferred). Coverage gaps of a few points between the 250-, 500-, and 750-day windows are within that noise. The gap from full history to 250 days (0.64 to 0.77 on gold at 80%) is larger than the noise (inferred).
- **For the app** (inferred): the best measured option is a 250-day bootstrap for the band. For the point, use the last price, or the drifted median only where a backtest shows the drift helps. The app should expect 30-day bands to cover about 76 to 77% at 80% and 89 to 93% at 95%, not the nominal levels.
