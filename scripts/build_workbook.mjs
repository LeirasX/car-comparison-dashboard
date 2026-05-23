import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import model from "../src/model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "outputs", "car_comparison_model.xlsx");

const workbook = Workbook.create();
const assumptionsSheet = workbook.worksheets.add("Assumptions");
const inputsSheet = workbook.worksheets.add("Car Inputs");
const calculationsSheet = workbook.worksheets.add("Calculations");
const resultsSheet = workbook.worksheets.add("Results");
const chartsSheet = workbook.worksheets.add("Charts");

function values(sheet, range, rows) {
  sheet.getRange(range).values = rows;
}

const assumptions = Object.assign({}, model.DEFAULT_ASSUMPTIONS);
const cars = {
  car1: model.applyPreset("tesla_model_3_new"),
  car2: model.applyPreset("cheap_used_ev"),
};
const analysis = model.analyze({ assumptions, cars });

values(assumptionsSheet, "A1:C1", [["Assumption", "Value", "Meaning"]]);
values(assumptionsSheet, "A2:C10", [
  ["Initial cash available", assumptions.initialCashBudget, "Cash available at month 0 for the car decision."],
  ["Monthly car budget", assumptions.monthlyBudget, "Unused monthly budget is invested."],
  ["Stock return", assumptions.investmentReturn / 100, "Annual return. Monthly rate is (1 + annual return)^(1/12) - 1."],
  ["Annual km", assumptions.annualKm, "Distance driven per year."],
  ["Fuel price", assumptions.fuelPrice, "EUR per litre."],
  ["Home electricity price", assumptions.homeElectricityPrice, "EUR per kWh."],
  ["Public electricity price", assumptions.publicElectricityPrice, "EUR per kWh."],
  ["Home charging %", assumptions.homeChargingPct / 100, "Home charging share."],
  ["Public charging %", assumptions.publicChargingPct / 100, "Public charging share."],
]);
values(assumptionsSheet, "A13:C17", [
  ["Formula", "Final money position", "investments left + car value left - loan still owed - budget deficits"],
  ["Formula", "Month 0 upfront", "invest initial cash available - upfront price"],
  ["Formula", "Month 0 finance", "invest initial cash available - down payment - fees"],
  ["Formula", "Monthly investment", "max(0, monthly budget - loan payment - running cost)"],
  ["Formula", "Monthly deficit", "max(0, loan payment + running cost - monthly budget)"],
]);

values(inputsSheet, "A1:C1", [["Input", cars.car1.name, cars.car2.name]]);
values(inputsSheet, "A2:C22", [
  ["Payment mode", cars.car1.paymentMode, cars.car2.paymentMode],
  ["Type", cars.car1.type, cars.car2.type],
  ["Upfront price", cars.car1.upfrontPrice, cars.car2.upfrontPrice],
  ["Down payment", cars.car1.downPayment, cars.car2.downPayment],
  ["Monthly payment", cars.car1.monthlyPayment, cars.car2.monthlyPayment],
  ["Loan months", cars.car1.loanMonths, cars.car2.loanMonths],
  ["TAEG", cars.car1.taeg / 100, cars.car2.taeg / 100],
  ["Opening fee", cars.car1.openingFee, cars.car2.openingFee],
  ["Balloon payment", cars.car1.balloonPayment, cars.car2.balloonPayment],
  ["kWh/100km", cars.car1.kwhPer100Km, cars.car2.kwhPer100Km],
  ["L/100km", cars.car1.litersPer100Km, cars.car2.litersPer100Km],
  ["Maintenance", cars.car1.annualMaintenance, cars.car2.annualMaintenance],
  ["Insurance", cars.car1.annualInsurance, cars.car2.annualInsurance],
  ["Repairs", cars.car1.annualRepairs, cars.car2.annualRepairs],
  ["Tax", cars.car1.annualTax, cars.car2.annualTax],
  ["3y resale", cars.car1.resaleValues[3], cars.car2.resaleValues[3]],
  ["5y resale", cars.car1.resaleValues[5], cars.car2.resaleValues[5]],
  ["7y resale", cars.car1.resaleValues[7], cars.car2.resaleValues[7]],
  ["10y resale", cars.car1.resaleValues[10], cars.car2.resaleValues[10]],
  ["Annual energy/fuel cost", model.annualEnergyCost(cars.car1, assumptions), model.annualEnergyCost(cars.car2, assumptions)],
  ["Annual running cost", model.annualRunningBreakdown(cars.car1, assumptions).total, model.annualRunningBreakdown(cars.car2, assumptions).total],
]);

const baselineRows = [["No car baseline", "Year", "Initial cash invested", "Monthly budget invested", "Final baseline wealth"]];
analysis.baseline.forEach((row) => {
  baselineRows.push(["No car", row.year, row.initialCashInvested, row.monthlyBudgetInvested, row.finalBaselineWealth]);
});
values(calculationsSheet, `L1:P${baselineRows.length}`, baselineRows);

const calcRows = [["Scenario", "Year", "Final money position", "Investments left", "Car value left", "Loan still owed", "Total paid", "Budget deficit", "Energy/fuel", "Financing cost"]];
analysis.horizonResults.forEach((horizon) => {
  horizon.rows.forEach((row) => {
    calcRows.push([
      model.scenarioLabel(row),
      horizon.year,
      row.finalMoneyLeft,
      row.investments,
      row.carValueLeft,
      row.loanStillOwed,
      row.totalPaid,
      row.budgetDeficit,
      row.energyPaid,
      row.financingCost,
    ]);
  });
});
values(calculationsSheet, `A1:J${calcRows.length}`, calcRows);

const scenarios = analysis.scenarios;
const resultRows = [["Scenario", "3y final money position", "5y final money position", "7y final money position", "10y final money position", "10y investments left", "10y car value left", "10y loan still owed", "10y total paid", "Takeaway"]];
scenarios.forEach((scenario) => {
  const h = scenario.horizons;
  resultRows.push([
    model.scenarioLabel(scenario),
    h[3].finalMoneyLeft,
    h[5].finalMoneyLeft,
    h[7].finalMoneyLeft,
    h[10].finalMoneyLeft,
    h[10].investments,
    h[10].carValueLeft,
    h[10].loanStillOwed,
    h[10].totalPaid,
    h[10].takeaway,
  ]);
});
values(resultsSheet, `A1:J${resultRows.length}`, resultRows);

values(chartsSheet, "A1:E5", [
  ["Year", ...scenarios.map((scenario) => model.scenarioLabel(scenario))],
  ...model.HORIZONS.map((year) => [year, ...scenarios.map((scenario) => scenario.horizons[year].finalMoneyLeft)]),
]);
try {
  const chart = chartsSheet.charts.add("line", chartsSheet.getRange("A1:E5"), "Auto");
  chart.setPosition(chartsSheet.getRange("G1:N16"));
} catch {
  values(chartsSheet, "G1:G1", [["Chart data is in A1:E5."]]);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);
console.log(outputPath);
