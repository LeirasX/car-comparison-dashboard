const assert = require("node:assert/strict");
const model = require("../src/model.js");

function approx(actual, expected, tolerance = 0.02, message = "") {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

function car(overrides = {}) {
  return Object.assign(model.applyPreset("custom"), {
    name: "Formula car",
    type: "combustion",
    paymentMode: "both",
    upfrontPrice: 10000,
    downPayment: 2000,
    monthlyPayment: 0,
    loanMonths: 40,
    taeg: 0,
    openingFee: 0,
    balloonPayment: 0,
    litersPer100Km: 5,
    kwhPer100Km: 20,
    annualMaintenance: 0,
    annualInsurance: 0,
    annualRepairs: 0,
    annualTax: 0,
    resaleValues: { 3: 6000, 5: 4000, 7: 2500, 10: 1000 },
  }, overrides);
}

function assumptions(overrides = {}) {
  return Object.assign({}, model.DEFAULT_ASSUMPTIONS, {
    initialCashBudget: 37975,
    monthlyBudget: 500,
    investmentReturn: 0,
    annualKm: 12000,
    fuelPrice: 2,
    homeElectricityPrice: 0,
    publicElectricityPrice: 0.4,
    homeChargingPct: 100,
    publicChargingPct: 0,
  }, overrides);
}

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

run("no-car baseline: 37975 plus 500 monthly at 8% for 10 years is plausible, not 900k", () => {
  const baseline10 = model.noCarBaseline(assumptions({ investmentReturn: 8 })).find((row) => row.year === 10);
  assert.ok(baseline10.finalBaselineWealth > 160000 && baseline10.finalBaselineWealth < 180000, `got ${baseline10.finalBaselineWealth}`);
  assert.ok(baseline10.finalBaselineWealth < 200000);
});

run("0% return: investment value equals starting invested cash plus monthly contributions", () => {
  const ev = car({ type: "electric", upfrontPrice: 10000, annualMaintenance: 1200, resaleValues: { 3: 7000, 5: 0, 7: 0, 10: 0 } });
  const scenario = model.simulateScenario(ev, assumptions({ investmentReturn: 0 }), "upfront", 3);
  const expectedInvestment = 37975 - 10000 + (500 - 100) * 36;
  approx(scenario.investments, expectedInvestment);
  approx(scenario.finalMoneyLeft, expectedInvestment + 7000);
});

run("finance cash difference: Tesla finance invests 28340 more at month 0 than upfront", () => {
  const tesla = model.applyPreset("tesla_model_3_new");
  const upfront = model.simulateScenario(tesla, assumptions({ investmentReturn: 8 }), "upfront", 10);
  const finance = model.simulateScenario(tesla, assumptions({ investmentReturn: 8 }), "finance", 10);
  approx(finance.month0Invested - upfront.month0Invested, 28340);
  assert.ok(finance.finalMoneyLeft > upfront.finalMoneyLeft);
});

run("Tesla used finance preset uses the requested finance terms", () => {
  const teslaUsed = model.applyPreset("tesla_model_3_used");
  assert.equal(teslaUsed.upfrontPrice, 28800);
  assert.equal(teslaUsed.downPayment, 5000);
  assert.equal(teslaUsed.monthlyPayment, 301);
  assert.equal(teslaUsed.loanMonths, 96);
  const finance = model.financeSummary(teslaUsed);
  approx(finance.financeTotalPaid, 5000 + 301 * 96 + teslaUsed.openingFee);
});

run("manual finance total: down payment + monthly payment * months + fees + balloon", () => {
  const finance = model.financeSummary(car({ upfrontPrice: 36990, downPayment: 8650, monthlyPayment: 349, loanMonths: 84, openingFee: 100, balloonPayment: 500 }));
  approx(finance.financeTotalPaid, 8650 + 349 * 84 + 100 + 500);
  approx(finance.financingCost, finance.financeTotalPaid - 36990);
});

run("preset switching values include realistic EV and combustion assumptions", () => {
  const cheapGas = model.applyPreset("cheap_used_combustion");
  const newEv = model.applyPreset("expensive_new_ev");
  assert.equal(cheapGas.type, "combustion");
  assert.ok(cheapGas.litersPer100Km > 6);
  assert.ok(cheapGas.annualRepairs > newEv.annualRepairs);
  assert.equal(newEv.type, "electric");
  assert.ok(newEv.kwhPer100Km > 0);
});

run("EV and combustion type switching affects which energy formula is used", () => {
  const vehicle = car({ type: "electric", kwhPer100Km: 20, litersPer100Km: 0 });
  approx(model.annualEnergyCost(vehicle, assumptions({ homeChargingPct: 100, homeElectricityPrice: 0 })), 0);
  vehicle.type = "combustion";
  vehicle.kwhPer100Km = 0;
  vehicle.litersPer100Km = 6;
  approx(model.annualEnergyCost(vehicle, assumptions({ annualKm: 10000, fuelPrice: 2 })), 1200);
});

run("payment mode: upfront-only and finance-only hide unwanted scenarios", () => {
  const result = model.analyze({
    assumptions: assumptions(),
    cars: {
      car1: car({ name: "Upfront only", paymentMode: "upfront" }),
      car2: car({ name: "Finance only", paymentMode: "finance" }),
    },
  });
  assert.deepEqual(result.horizonResults[0].rows.map((row) => `${row.carName} ${row.mode}`), ["Upfront only upfront", "Finance only finance"]);
});

run("payment mode: both shows both scenarios", () => {
  const result = model.analyze({
    assumptions: assumptions(),
    cars: {
      car1: car({ name: "A", paymentMode: "both" }),
      car2: car({ name: "B", paymentMode: "both" }),
    },
  });
  assert.equal(result.horizonResults[0].rows.length, 4);
});

run("identical scenarios produce identical final money left", () => {
  const result = model.analyze({
    assumptions: assumptions(),
    cars: {
      car1: car({ name: "Same", paymentMode: "upfront" }),
      car2: car({ name: "Same", paymentMode: "upfront" }),
    },
  });
  approx(result.horizonResults[0].rows[0].finalMoneyLeft, result.horizonResults[0].rows[1].finalMoneyLeft);
});

run("custom name appears in scenario label", () => {
  const custom = model.simulateScenario(car({ name: "My Actual Car" }), assumptions(), "upfront", 3);
  assert.equal(model.scenarioLabel(custom), "My Actual Car upfront");
});

run("empty custom name falls back without showing Car 1 or Car 2", () => {
  const custom = model.simulateScenario(car({ name: "" }), assumptions(), "upfront", 3);
  assert.equal(model.scenarioLabel(custom), "Custom vehicle upfront");
});

run("EV free charging: 100% home at 0 €/kWh is 0 energy cost", () => {
  const ev = car({ type: "electric", kwhPer100Km: 20 });
  approx(model.annualEnergyCost(ev, assumptions({ annualKm: 25000, homeChargingPct: 100, publicChargingPct: 0, homeElectricityPrice: 0 })), 0);
});

run("combustion fuel cost formula", () => {
  const gas = car({ type: "combustion", litersPer100Km: 6.5 });
  approx(model.annualEnergyCost(gas, assumptions({ annualKm: 25000, fuelPrice: 1.75 })), 25000 / 100 * 6.5 * 1.75);
});

run("remaining loan balance is subtracted before loan ends", () => {
  const financed = car({ type: "electric", loanMonths: 40, taeg: 0, resaleValues: { 1: 9000, 3: 6000, 5: 0, 7: 0, 10: 0 } });
  const scenario = model.simulateScenario(financed, assumptions({ initialCashBudget: 10000 }), "finance", 1);
  approx(scenario.loanStillOwed, 5600);
  approx(scenario.finalMoneyLeft, scenario.investments + scenario.carValueLeft - scenario.loanStillOwed - scenario.budgetDeficit);
});

run("winner is highest final money left only", () => {
  const result = model.analyze({
    assumptions: assumptions({ investmentReturn: 8 }),
    cars: {
      car1: model.applyPreset("tesla_model_3_new"),
      car2: model.applyPreset("cheap_used_ev"),
    },
  });
  result.horizonResults.forEach((horizon) => {
    assert.equal(horizon.winner.finalMoneyLeft, Math.max(...horizon.rows.map((row) => row.finalMoneyLeft)));
  });
});

run("selected analysis year aligns with requested horizon", () => {
  assert.equal(model.selectedYear(assumptions({ analysisYears: 3 })), 3);
  assert.equal(model.selectedYear(assumptions({ analysisYears: 7 })), 7);
  const result = model.analyze({
    assumptions: assumptions({ analysisYears: 7 }),
    cars: {
      car1: model.applyPreset("tesla_model_3_new"),
      car2: model.applyPreset("cheap_used_ev"),
    },
  });
  assert.equal(result.selectedYear, 7);
  assert.equal(result.selected.winner.id, result.winners[7].id);
});

run("0 annual km removes energy costs", () => {
  const gas = car({ type: "combustion", litersPer100Km: 7, annualMaintenance: 0, annualInsurance: 0, annualRepairs: 0, annualTax: 0 });
  const scenario = model.simulateScenario(gas, assumptions({ annualKm: 0, fuelPrice: 2 }), "upfront", 3);
  approx(scenario.energyPaid, 0);
  approx(scenario.runningPaid, 0);
});

run("charging split supports 100% public charging", () => {
  const ev = car({ type: "electric", kwhPer100Km: 20 });
  approx(model.annualEnergyCost(ev, assumptions({ annualKm: 10000, homeChargingPct: 0, publicChargingPct: 100, publicElectricityPrice: 0.4 })), 800);
});

run("upfront price or down payment above initial cash becomes deficit, not negative investment", () => {
  const pricey = car({ upfrontPrice: 50000, resaleValues: { 3: 30000, 5: 0, 7: 0, 10: 0 } });
  const upfront = model.simulateScenario(pricey, assumptions({ initialCashBudget: 10000, monthlyBudget: 0 }), "upfront", 3);
  approx(upfront.month0Invested, 0);
  approx(upfront.month0Deficit, 40000);
  const financed = model.simulateScenario(car({ downPayment: 20000, upfrontPrice: 30000, monthlyPayment: 0, taeg: 0, loanMonths: 60 }), assumptions({ initialCashBudget: 10000, monthlyBudget: 0 }), "finance", 3);
  approx(financed.month0Invested, 0);
  approx(financed.month0Deficit, 10000);
});

run("monthly cost above budget creates deficit and no negative investment", () => {
  const expensive = car({ upfrontPrice: 1000, annualMaintenance: 12000, resaleValues: { 3: 0, 5: 0, 7: 0, 10: 0 } });
  const scenario = model.simulateScenario(expensive, assumptions({ monthlyBudget: 100, investmentReturn: 0 }), "upfront", 3);
  approx(scenario.averageMonthlyInvested, 0);
  assert.ok(scenario.budgetDeficit > 0);
});

run("loan shorter and longer than analysis period calculate non-negative balances", () => {
  const shortLoan = model.simulateScenario(car({ loanMonths: 12, monthlyPayment: 700, downPayment: 2000 }), assumptions(), "finance", 3);
  const longLoan = model.simulateScenario(car({ loanMonths: 96, monthlyPayment: 120, downPayment: 2000 }), assumptions(), "finance", 3);
  approx(shortLoan.loanStillOwed, 0);
  assert.ok(longLoan.loanStillOwed > 0);
  assert.ok(longLoan.loanStillOwed >= 0);
});

run("resale value higher than purchase price is allowed and increases final money", () => {
  const normal = model.simulateScenario(car({ upfrontPrice: 10000, resaleValues: { 3: 6000, 5: 0, 7: 0, 10: 0 } }), assumptions(), "upfront", 3);
  const high = model.simulateScenario(car({ upfrontPrice: 10000, resaleValues: { 3: 12000, 5: 0, 7: 0, 10: 0 } }), assumptions(), "upfront", 3);
  approx(high.finalMoneyLeft - normal.finalMoneyLeft, 6000);
});

run("scenario reasons use actual numeric differences", () => {
  const result = model.analyze({
    assumptions: assumptions({ investmentReturn: 8 }),
    cars: {
      car1: model.applyPreset("tesla_model_3_new"),
      car2: model.applyPreset("cheap_used_ev"),
    },
  });
  const horizon = result.horizonResults.find((row) => row.year === 10);
  const reasons = model.scenarioReasons(horizon.winner, horizon.winner, horizon.rows);
  assert.ok(reasons.some((reason) => /€/.test(reason)));
});

run("no NaN, undefined, negative resale, or broken chart values", () => {
  const result = model.analyze({
    assumptions: assumptions({ investmentReturn: 8 }),
    cars: {
      car1: model.applyPreset("tesla_model_3_new"),
      car2: model.applyPreset("cheap_used_combustion"),
    },
  });
  result.horizonResults.forEach((horizon) => {
    horizon.rows.forEach((row) => {
      ["finalMoneyLeft", "investments", "carValueLeft", "loanStillOwed", "totalPaid", "budgetDeficit"].forEach((field) => {
        assert.equal(Number.isFinite(row[field]), true, `${field} should be finite`);
      });
      assert.ok(row.carValueLeft >= 0);
      row.yearly.forEach((point) => {
        assert.equal(Number.isFinite(point.finalMoneyLeft), true);
        assert.equal(Number.isFinite(point.investments), true);
        assert.equal(Number.isFinite(point.totalPaid), true);
        assert.ok(point.carValueLeft >= 0);
      });
    });
  });
});
