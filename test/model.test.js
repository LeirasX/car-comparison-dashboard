const assert = require("node:assert/strict");
const model = require("../src/model.js");

function approx(actual, expected, tolerance = 0.05, message = "") {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

function assumptions(overrides = {}) {
  return Object.assign({}, model.DEFAULT_ASSUMPTIONS, {
    initialCashBudget: 30000,
    monthlyBudget: 500,
    yearsOwned: 5,
    annualKm: 25000,
  }, overrides);
}

function car(overrides = {}) {
  return Object.assign(model.defaultCar("car1"), {
    name: "Test option",
    type: "combustion",
    paymentMode: "upfront",
    upfrontPrice: 10000,
    downPayment: 2000,
    monthlyPayment: 200,
    loanMonths: 48,
    litersPer100Km: 6,
    kwhPer100Km: 16,
    fuelPrice: 2,
    homeElectricityPrice: 0.2,
    publicElectricityPrice: 0.4,
    homeChargingPct: 100,
    publicChargingPct: 0,
    annualMaintenance: 0,
    annualInsurance: 0,
    annualRepairs: 0,
    annualTax: 0,
    resaleCustom: true,
    resaleValue: 5000,
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

run("stock return is fixed at 8% yearly and compounded monthly", () => {
  approx(model.STOCK_RETURN, 8);
  approx(model.monthlyInvestmentRate(), Math.pow(1.08, 1 / 12) - 1, 1e-12);
});

run("changing years updates winner, final money, resale estimate, loan left, summary, and warnings", () => {
  const short = model.analyze({
    assumptions: assumptions({ initialCashBudget: 40000, yearsOwned: 1 }),
    cars: {
      car1: car({ name: "Cash car", type: "ev", paymentMode: "upfront", upfrontPrice: 10000, resaleCustom: false }),
      car2: car({ name: "Long loan", type: "ev", paymentMode: "finance", upfrontPrice: 10000, downPayment: 2000, monthlyPayment: 100, loanMonths: 96, resaleCustom: false }),
    },
  });
  const long = model.analyze({
    assumptions: assumptions({ initialCashBudget: 40000, yearsOwned: 10 }),
    cars: {
      car1: car({ name: "Cash car", type: "ev", paymentMode: "upfront", upfrontPrice: 10000, resaleCustom: false }),
      car2: car({ name: "Long loan", type: "ev", paymentMode: "finance", upfrontPrice: 10000, downPayment: 2000, monthlyPayment: 100, loanMonths: 96, resaleCustom: false }),
    },
  });
  assert.notEqual(short.winner.id, long.winner.id);
  assert.notEqual(short.winner.finalMoney, long.winner.finalMoney);
  assert.notEqual(short.cars.car1.resaleValue, long.cars.car1.resaleValue);
  assert.ok(short.rows.find((row) => row.carName === "Long loan").loanLeft > 0);
  assert.equal(long.rows.find((row) => row.carName === "Long loan").loanLeft, 0);
  assert.match(short.rows.find((row) => row.carName === "Long loan").summary, /loan not paid/i);
  assert.ok(short.warnings.some((warning) => /Loan is not fully paid/.test(warning.message)));
  assert.equal(short.rows.length, 2);
});

run("finance total is down payment + monthly payment * months", () => {
  const finance = model.financeSummary(car({ downPayment: 4500, monthlyPayment: 321, loanMonths: 72 }));
  approx(finance.financeTotal, 4500 + 321 * 72);
  approx(finance.financingCost, finance.financeTotal - 10000);
});

run("loan shorter than years increases monthly investments after loan ends", () => {
  const base = car({ paymentMode: "finance", type: "ev", downPayment: 0, monthlyPayment: 400, loanMonths: 12, annualMaintenance: 0, resaleValue: 0 });
  const shortLoan = model.simulateScenario(base, assumptions({ yearsOwned: 2, monthlyBudget: 500, annualKm: 0 }), "finance", 2);
  const longLoan = model.simulateScenario(Object.assign({}, base, { loanMonths: 24 }), assumptions({ yearsOwned: 2, monthlyBudget: 500, annualKm: 0 }), "finance", 2);
  assert.ok(shortLoan.investedResult > longLoan.investedResult);
  assert.ok(shortLoan.averageMonthlyInvested > longLoan.averageMonthlyInvested);
});

run("loan longer than years leaves loan owed and subtracts it from final money", () => {
  const scenario = model.simulateScenario(car({ paymentMode: "finance", downPayment: 2000, monthlyPayment: 200, loanMonths: 60, resaleValue: 7000 }), assumptions({ yearsOwned: 1 }), "finance", 1);
  approx(scenario.loanLeft, 9600);
  approx(scenario.finalMoney, scenario.investedResult + scenario.resaleValue - scenario.loanLeft - scenario.totalDeficits);
  assert.ok(scenario.warnings.some((warning) => /not fully paid/.test(warning.message)));
});

run("monthly budget exceeded creates warning and subtracts deficits", () => {
  const scenario = model.simulateScenario(car({ annualMaintenance: 12000, resaleValue: 0 }), assumptions({ monthlyBudget: 100, yearsOwned: 1 }), "upfront", 1);
  assert.ok(scenario.totalDeficits > 0);
  assert.ok(scenario.warnings.some((warning) => /Monthly cost exceeds/.test(warning.message)));
  approx(scenario.finalMoney, scenario.investedResult + scenario.resaleValue - scenario.loanLeft - scenario.totalDeficits);
});

run("initial cash exceeded marks impossible for upfront and finance down payment", () => {
  const upfront = model.simulateScenario(car({ upfrontPrice: 50000 }), assumptions({ initialCashBudget: 10000 }), "upfront", 3);
  const finance = model.simulateScenario(car({ paymentMode: "finance", downPayment: 20000 }), assumptions({ initialCashBudget: 10000 }), "finance", 3);
  assert.equal(upfront.possible, "No");
  assert.equal(finance.possible, "No");
  assert.ok(upfront.warnings.some((warning) => /Upfront price exceeds/.test(warning.message)));
  assert.ok(finance.warnings.some((warning) => /Down payment exceeds/.test(warning.message)));
});

run("type switching updates visible-relevant defaults while preserving custom edits", () => {
  const edited = model.markCustom(model.defaultCar("car1"), "annualInsurance");
  edited.annualInsurance = 999;
  edited.type = "combustion";
  const switched = model.applyTypeDefaults(edited, { respectCustom: true });
  assert.equal(switched.type, "combustion");
  assert.equal(switched.kwhPer100Km, 0);
  assert.ok(switched.litersPer100Km > 0);
  assert.equal(switched.annualInsurance, 999);
});

run("hidden EV/fuel fields do not influence the wrong type", () => {
  const ev = car({ type: "ev", kwhPer100Km: 20, litersPer100Km: 99, fuelPrice: 99, homeElectricityPrice: 0, publicElectricityPrice: 0, homeChargingPct: 100, publicChargingPct: 0 });
  const gas = car({ type: "combustion", kwhPer100Km: 99, litersPer100Km: 6, fuelPrice: 2, homeElectricityPrice: 99, publicElectricityPrice: 99 });
  approx(model.annualEnergyCost(ev, assumptions({ annualKm: 10000 })), 0);
  approx(model.annualEnergyCost(gas, assumptions({ annualKm: 10000 })), 1200);
});

run("custom names are used and never fall back to Custom, Car 1, or Car 2", () => {
  const result = model.analyze({
    assumptions: assumptions(),
    cars: {
      car1: car({ name: "Used EV upfront", paymentMode: "upfront" }),
      car2: car({ name: "Tesla finance", paymentMode: "finance" }),
    },
  });
  const labels = result.rows.map((row) => row.option).join(" | ");
  assert.match(labels, /Used EV upfront upfront/);
  assert.match(labels, /Tesla finance finance/);
  assert.doesNotMatch(labels, /Custom|Car 1|Car 2/);
});

run("auto resale updates with years unless custom override is active", () => {
  const autoCar = car({ type: "ev", upfrontPrice: 30000, resaleCustom: false });
  const one = model.effectiveResaleValue(autoCar, 1);
  const ten = model.effectiveResaleValue(autoCar, 10);
  assert.ok(one > ten);
  const custom = Object.assign({}, autoCar, { resaleCustom: true, resaleValue: 12345 });
  assert.equal(model.effectiveResaleValue(custom, 1), 12345);
  assert.equal(model.effectiveResaleValue(custom, 10), 12345);
});

run("0 km/year removes energy cost", () => {
  approx(model.annualEnergyCost(car({ type: "combustion", litersPer100Km: 8, fuelPrice: 2 }), assumptions({ annualKm: 0 })), 0);
});

run("EV with 100% free home charging has zero energy cost", () => {
  const ev = car({ type: "ev", kwhPer100Km: 18, homeElectricityPrice: 0, publicElectricityPrice: 0.5, homeChargingPct: 100, publicChargingPct: 0 });
  approx(model.annualEnergyCost(ev, assumptions({ annualKm: 25000 })), 0);
});

run("combustion fuel formula is annual_km / 100 * L_per_100km * fuel_price", () => {
  const gas = car({ type: "combustion", litersPer100Km: 6.5, fuelPrice: 1.75 });
  approx(model.annualEnergyCost(gas, assumptions({ annualKm: 25000 })), 25000 / 100 * 6.5 * 1.75);
});

run("results contain no NaN, undefined, Infinity, or negative loan values", () => {
  const result = model.analyze({
    assumptions: assumptions({ yearsOwned: 20, annualKm: 0 }),
    cars: {
      car1: car({ name: "Free EV", type: "ev", paymentMode: "upfront", homeElectricityPrice: 0, homeChargingPct: 100, publicChargingPct: 0 }),
      car2: car({ name: "Gas", type: "combustion", paymentMode: "finance", monthlyPayment: 0, loanMonths: 0 }),
    },
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /NaN|undefined|Infinity/);
  result.rows.forEach((row) => assert.ok(row.loanLeft >= 0));
});
