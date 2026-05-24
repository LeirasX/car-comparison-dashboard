# Car Comparison Dashboard

Compare two car options by one question:

Which option leaves the most money after the selected number of years?

The dashboard is a static, single-page model. It has no backend and no framework.

## Open Locally

Open [index.html](/Users/leirasx/Developer/car/index.html) in a browser.

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
- `src/model.js` contains the financial calculations.
- `src/dashboard.template.html` contains the UI template.
- `scripts/build_dashboard.js` rebuilds `index.html` and `dashboard.html`.
- `test/model.test.js` contains formula and edge-case tests.
- `test/dashboard_smoke.test.js` checks UI wiring and reactivity.

## Core Formula

Final money is:

```text
investment balance
+ resale value
- loan left
- deficits
```

The winner is the option with the highest final money for the selected `Years owned`.

## Fixed Return

Stock market return is fixed internally:

```text
8% yearly
monthly rate = (1 + 0.08)^(1/12) - 1
```

There is no stock-return input in the UI.

## Payment Logic

For upfront payment:

```text
initial spent = upfront price
```

For finance:

```text
initial spent = down payment
finance total = down payment + monthly payment * loan months
financing cost = finance total - cash price
```

If the finance term is longer than `Years owned`, the remaining loan is subtracted from final money.

## Month-by-Month Model

For every month:

```text
monthly car payment = monthly payment if the loan is still active, otherwise 0
monthly running cost = energy/fuel + maintenance + insurance + repairs + tax
monthly invested = max(0, monthly budget - monthly car payment - monthly running cost)
monthly deficit = max(0, monthly car payment + monthly running cost - monthly budget)
```

When a loan ends before the selected year, the freed-up monthly payment is invested.

## Energy Formula

EV:

```text
annual energy = annual km / 100 * kWh/100km * weighted electricity price
```

Hybrid and combustion:

```text
annual fuel = annual km / 100 * L/100km * fuel price
```

Hidden energy fields do not affect the result for the wrong type.

## Tests

```bash
node test/model.test.js
node test/dashboard_smoke.test.js
```

Rebuild outputs:

```bash
node scripts/build_dashboard.js
```

## Assumptions

- The model compares two cars only.
- Defaults are Portugal-like ownership assumptions around 25,000 km/year.
- Resale is estimated from cash price, type, and years owned unless the user overrides it.
- Type changes update untouched defaults only; manually edited fields stay custom.
- This is not financial advice.
