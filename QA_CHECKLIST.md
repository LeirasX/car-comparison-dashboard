# QA Checklist

## Calculation Tests
- Baseline compounding uses `(1 + annual return)^(1/12) - 1`.
- 0% return equals starting invested cash plus monthly contributions.
- Finance total equals down payment + monthly payment * months + fees + balloon.
- Loan balance is subtracted before the loan ends and is never negative.
- EV free home charging produces zero energy cost.
- Combustion fuel cost equals annual km / 100 * L/100km * fuel price.
- Deficits are subtracted and never invested.

## Input Reactivity Tests
- Initial cash, monthly budget, stock return, analysis year, annual km.
- Preset, name, type, and payment mode.
- Upfront price, down payment, monthly payment, loan months, opening fee, balloon payment.
- kWh/100km, L/100km, fuel, electricity prices, charging split.
- Maintenance, insurance, repairs, tax.
- Resale values at 3, 5, 7, and 10 years.

## UI Alignment Tests
- Winner cards use the selected analysis year as the headline.
- Primary detail columns use the selected year.
- Secondary table uses the selected year.
- Charts mark the selected year.
- Final summary uses the selected year.
- Takeaways are based on the selected year.
- Hidden payment modes never display disabled scenarios.

## Responsive Tests
- Desktop, laptop, tablet, and mobile layouts keep controls usable.
- Tables scroll horizontally instead of breaking the page.
- Charts resize inside their cards.
- Collapsible sections remain tappable.

## Edge Cases
- 0% stock return.
- 0 annual km.
- 0 fuel/electricity cost.
- 100% home charging and 100% public charging.
- Upfront price higher than initial cash.
- Down payment higher than initial cash.
- Monthly car cost higher than monthly budget.
- Loan longer and shorter than analysis period.
- Resale value higher than purchase price.
- Empty custom name.
- Switching EV to combustion and combustion to EV.
- Switching presets after manual edits.
