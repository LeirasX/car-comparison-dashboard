# Car Comparison Dashboard

Compare two car decisions by one financial question:

Which option leaves the most final money after investments, resale value, loans, and deficits?

The dashboard is a static, single-page financial model. It has no backend and no framework.

## Open Locally

Open [index.html](/Users/leirasx/Documents/life/car/index.html) in a browser.

You can also run a local static server:

```bash
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

## Files

- `index.html` is the GitHub Pages entry point.
- `dashboard.html` is the same dashboard kept for direct local use.
- `outputs/car_comparison_model.xlsx` is the Excel mirror.
- `src/model.js` contains the financial calculations.
- `src/dashboard.template.html` contains the UI template.
- `scripts/build_dashboard.js` rebuilds `index.html` and `dashboard.html`.
- `scripts/build_workbook.mjs` rebuilds the Excel workbook.
- `test/model.test.js` contains formula and edge-case tests.
- `test/dashboard_smoke.test.js` checks UI wiring, selected-year alignment, charts, and input reactivity.
- `QA_CHECKLIST.md` lists the manual and automated audit coverage.

## Core Formula

Final money left is:

```text
investments left
+ car resale value
- loan still owed
- extra budget deficits
```

Best financially means highest final money left, not lowest ownership cost.

## Budget Logic

Defaults:

```text
initial cash available = EUR 37,975
monthly car budget = EUR 500
stock return = 8% yearly
annual km = 25,000
home electricity = EUR 0/kWh
home charging = 100%
```

For upfront payment:

```text
month 0 investment = initial cash available - upfront price
```

For financing:

```text
month 0 investment = initial cash available - down payment - opening/admin fee
```

Each month:

```text
monthly car cost =
loan payment
+ energy/fuel
+ maintenance
+ insurance
+ repairs
+ taxes

monthly investment = max(0, monthly budget - monthly car cost)
monthly deficit = max(0, monthly car cost - monthly budget)
```

Negative money is never invested. Deficits are tracked separately and subtracted from final money left.

## Investment Formula

Stock return is annual and converted to a monthly rate:

```text
monthly investment rate = (1 + annual return)^(1/12) - 1
```

With EUR 37,975 invested immediately, EUR 500/month invested, and 8% annual return for 10 years, the investment balance is about EUR 172k, not EUR 900k.

## Loan Formula

Manual monthly payment is used if entered. Otherwise:

```text
principal = upfront price - down payment + opening/admin fee
monthly rate = TAEG / 12
payment = P * r / (1 - (1 + r)^(-n))
```

If the rate is zero:

```text
payment = principal / months
```

Finance total is calculated internally:

```text
finance total paid =
down payment + monthly payment * loan months + opening fee + balloon payment

financing cost = finance total paid - upfront price
```

Remaining loan balance is subtracted at each horizon.

## Energy Formula

EV:

```text
annual energy cost =
annual km / 100 * kWh per 100km * weighted electricity price
```

Combustion:

```text
annual fuel cost =
annual km / 100 * L per 100km * fuel price
```

Weighted electricity:

```text
home charging % * home price + public charging % * public price
```

If home charging is 100% and home electricity is EUR 0/kWh, EV energy cost is EUR 0.

## Tests

```bash
node test/model.test.js
node test/dashboard_smoke.test.js
```

Rebuild outputs:

```bash
node scripts/build_dashboard.js
/Users/leirasx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build_workbook.mjs
```

## Deploy To GitHub Pages

This repo is ready to publish from the `main` branch root.

```bash
git init
git add .
git commit -m "Initial car comparison dashboard"
gh repo create leirasx/car-comparison-dashboard --public --source=. --remote=origin --push
gh api --method POST repos/leirasx/car-comparison-dashboard/pages -f "source[branch]=main" -f "source[path]=/"
```

Final URL:

```text
https://leirasx.github.io/car-comparison-dashboard/
```

## Assumptions And Limitations

- The model compares two cars only.
- Analysis horizons are 3, 5, 7, and 10 years.
- Resale values are editable assumptions, not forecasts.
- Sensitivity checks are simple one-factor checks, not Monte Carlo analysis.
- Taxes, insurance, maintenance, and repairs are annual estimates.
- The Excel file mirrors the default model snapshot; the HTML dashboard is the primary interactive tool.
- This is not financial advice.
