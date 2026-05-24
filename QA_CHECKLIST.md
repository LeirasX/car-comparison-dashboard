# QA Checklist

## Calculation Tests

- Stock return is fixed at 8% yearly and converted to a monthly compound rate.
- Changing `Years owned` updates the winner, final money, resale estimate, loan left, summary, table, and warnings.
- Finance total equals down payment + monthly payment * months.
- Loan terms shorter than ownership years stop payments and increase later monthly investing.
- Loan terms longer than ownership years leave a remaining loan balance that is subtracted.
- Monthly budget deficits are warned and subtracted from final money.
- Upfront price or down payment above initial cash marks the option impossible.
- Auto resale updates with years unless custom resale is active.
- EV free home charging produces zero energy cost.
- 0 km/year produces zero fuel/energy cost.
- Combustion fuel cost equals annual km / 100 * L/100km * fuel price.
- Results avoid NaN, undefined, Infinity, and negative loan balances.

## UI Tests

- Upfront mode shows upfront price and hides finance fields.
- Finance mode shows cash price, down payment, monthly payment, and months.
- EV shows electricity fields and hides fuel fields.
- Hybrid and combustion show fuel fields and hide electricity fields.
- Custom names appear in results; `Custom`, `Car 1`, and `Car 2` do not.
- Help text is attached to section titles and important labels, and matches the formulas.
- Results have one table with the requested columns only.
- Removed sections stay removed: presets, charts, baseline, quality scores, assumptions, explanation, and duplicate tables.

## Responsive Checks

- iPhone width has no page-level horizontal overflow; table scrolls inside its card.
- Android width has no page-level horizontal overflow; table scrolls inside its card.
- iPad/tablet width keeps fields readable and controls touch-sized.
- Desktop width keeps the quiet card layout and premium spacing.
- All five sections collapse and reopen.
- Mobile/touch help works by tapping labels or reopening section titles.
- Hero, warnings, and results update immediately when inputs change.
