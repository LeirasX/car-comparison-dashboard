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
    modelId: null,
    modelDisplayName: "",
    customName: "",
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

run("default comparison uses real database-backed car models", () => {
  assert.equal(model.DEFAULT_ASSUMPTIONS.initialCashBudget, 20000);
  assert.equal(model.DEFAULT_ASSUMPTIONS.monthlyBudget, 300);
  assert.equal(model.DEFAULT_ASSUMPTIONS.yearsOwned, 7);
  assert.equal(model.DEFAULT_ASSUMPTIONS.annualKm, 15000);
  const tesla = model.defaultCar("car1");
  const golf = model.defaultCar("car2");
  assert.equal(tesla.modelId, "tesla-model-3");
  assert.equal(tesla.name, "Tesla Model 3");
  assert.equal(tesla.type, "ev");
  assert.equal(tesla.paymentMode, "upfront");
  assert.equal(tesla.upfrontPrice, 28000);
  assert.equal(golf.modelId, "volkswagen-golf");
  assert.equal(golf.name, "Volkswagen Golf");
  assert.equal(golf.type, "combustion");
  assert.equal(golf.paymentMode, "upfront");
  assert.equal(golf.upfrontPrice, 15500);
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
  assert.ok(short.warnings.some((warning) => /Loan still active/.test(warning.message)));
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
  assert.ok(scenario.warnings.some((warning) => /Loan still active/.test(warning.message)));
});

run("monthly budget exceeded creates warning and subtracts deficits", () => {
  const scenario = model.simulateScenario(car({ annualMaintenance: 12000, resaleValue: 0 }), assumptions({ monthlyBudget: 100, yearsOwned: 1 }), "upfront", 1);
  assert.ok(scenario.totalDeficits > 0);
  assert.ok(scenario.warnings.some((warning) => /Monthly cost exceeds/.test(warning.message)));
  approx(scenario.finalMoney, scenario.investedResult + scenario.resaleValue - scenario.loanLeft - scenario.totalDeficits);
  approx(scenario.totalPaid, scenario.carPaymentsPaid + scenario.runningPaid);
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
  edited.modelId = null;
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

run("selecting each model loads non-empty valid values", () => {
  assert.equal(model.CAR_DATABASE.length, 114);
  ["opel-corsa", "seat-ibiza", "skoda-octavia", "volvo-ex30", "porsche-macan-electric", "lamborghini-huracan"].forEach((id) => {
    assert.ok(model.carModelById(id), `${id} should exist`);
  });
  model.CAR_DATABASE.forEach((entry) => {
    const loaded = model.applyCarModelDefaults({}, entry.id);
    assert.equal(loaded.modelId, entry.id);
    assert.equal(model.displayCarName(loaded), entry.displayName);
    ["upfrontPrice", "annualMaintenance", "annualInsurance", "annualRepairs", "annualTax", "resaleRetentionEstimate"].forEach((field) => {
      assert.ok(Number.isFinite(Number(loaded[field])), `${entry.id} ${field} should be finite`);
      assert.ok(Number(loaded[field]) >= 0, `${entry.id} ${field} should be non-negative`);
    });
    assert.ok(["high", "medium", "low"].includes(loaded.confidence), `${entry.id} confidence`);
    assert.ok(loaded.sourceNotes, `${entry.id} sourceNotes`);
  });
});

run("database is ordered from common cheap categories to rare expensive categories", () => {
  const categoryOrder = ["Cheap city cars", "Common small cars", "Common family cars", "Hybrids", "Cheap EVs", "Common EVs", "SUVs", "Premium sedans", "Premium EVs", "Sports cars", "Luxury cars", "Supercars / collector cars"];
  function group(entry) {
    if (entry.categoryGroup) return entry.categoryGroup;
    if (entry.category === "hybrid") return "Hybrids";
    if (entry.energyType === "electricity") {
      if (entry.category === "luxury" || entry.category === "supercar" || entry.defaultUpfrontPrice >= 36000) return "Premium EVs";
      return entry.defaultUpfrontPrice <= 22000 ? "Cheap EVs" : "Common EVs";
    }
    if (entry.category === "supercar") return "Supercars / collector cars";
    if (entry.category === "luxury" && entry.defaultUpfrontPrice >= 60000) return "Luxury cars";
    if (entry.category === "luxury" || ["bmw-3-series", "mercedes-c-class", "audi-a4"].includes(entry.id)) return "Premium sedans";
    if (entry.category === "pickup" || /hilux|f150|rav4|cr-v|rx/i.test(entry.id)) return "SUVs";
    if (entry.defaultUpfrontPrice <= 9000 || /panda|aygo|picanto|i10|up|206/i.test(entry.id)) return "Cheap city cars";
    if (entry.defaultUpfrontPrice <= 14500 || /fiesta|clio|sandero|corsa|ibiza|fabia|micra|208/i.test(entry.id)) return "Common small cars";
    return "Common family cars";
  }
  let previous = -1;
  model.CAR_DATABASE.forEach((entry) => {
    const current = categoryOrder.indexOf(group(entry));
    assert.ok(current >= previous, `${entry.id} should not move backwards in category order`);
    previous = current;
  });
});

run("EV models use kWh/100km and ignore L/100km", () => {
  model.CAR_DATABASE.filter((entry) => entry.energyType === "electricity").forEach((entry) => {
    const ev = model.applyCarModelDefaults({}, entry.id);
    assert.equal(ev.type, "ev", entry.id);
    assert.ok(ev.kwhPer100Km > 0, entry.id);
    assert.equal(ev.litersPer100Km, 0, entry.id);
    const base = model.annualEnergyCost(ev, assumptions({ annualKm: 10000 }));
    const polluted = model.annualEnergyCost(Object.assign({}, ev, { litersPer100Km: 99, fuelPrice: 99 }), assumptions({ annualKm: 10000 }));
    approx(polluted, base, 1e-9, entry.id);
  });
});

run("combustion models use L/100km and ignore kWh/100km", () => {
  model.CAR_DATABASE.filter((entry) => !["ev", "hybrid"].includes(entry.category) && entry.energyType !== "electricity").forEach((entry) => {
    const gas = model.applyCarModelDefaults({}, entry.id);
    assert.equal(gas.type, "combustion", entry.id);
    assert.ok(gas.litersPer100Km > 0, entry.id);
    assert.equal(gas.kwhPer100Km, 0, entry.id);
    const base = model.annualEnergyCost(gas, assumptions({ annualKm: 10000 }));
    const polluted = model.annualEnergyCost(Object.assign({}, gas, { kwhPer100Km: 99, homeElectricityPrice: 99, publicElectricityPrice: 99 }), assumptions({ annualKm: 10000 }));
    approx(polluted, base, 1e-9, entry.id);
  });
});

run("hybrid models use L/100km by default", () => {
  model.CAR_DATABASE.filter((entry) => entry.category === "hybrid").forEach((entry) => {
    const hybrid = model.applyCarModelDefaults({}, entry.id);
    assert.equal(hybrid.type, "hybrid", entry.id);
    assert.ok(hybrid.litersPer100Km > 0, entry.id);
    assert.equal(hybrid.kwhPer100Km, 0, entry.id);
  });
});

run("same model can be selected on both sides with different prices and terms", () => {
  const car1 = model.applyCarModelDefaults({}, "tesla-model-3");
  const car2 = model.applyCarModelDefaults({}, "tesla-model-3");
  car1.upfrontPrice = 20000;
  car2.upfrontPrice = 28800;
  car2.paymentMode = "finance";
  car2.downPayment = 3000;
  car2.monthlyPayment = 420;
  car2.loanMonths = 72;
  const result = model.analyze({ assumptions: assumptions(), cars: { car1, car2 } });
  assert.equal(result.cars.car1.modelId, "tesla-model-3");
  assert.equal(result.cars.car2.modelId, "tesla-model-3");
  assert.equal(result.cars.car1.upfrontPrice, 20000);
  assert.equal(result.cars.car2.upfrontPrice, 28800);
  assert.match(result.rows.map((row) => row.option).join(" | "), /Tesla Model 3 upfront[\s\S]*Tesla Model 3 finance/);
});

run("changing price does not reset loaded model costs", () => {
  const loaded = model.applyCarModelDefaults({}, "toyota-corolla-hybrid");
  const before = {
    litersPer100Km: loaded.litersPer100Km,
    annualMaintenance: loaded.annualMaintenance,
    annualInsurance: loaded.annualInsurance,
    annualRepairs: loaded.annualRepairs,
    annualTax: loaded.annualTax,
  };
  loaded.upfrontPrice = 12345;
  const analyzed = model.analyze({ assumptions: assumptions(), cars: { car1: loaded, car2: model.applyCarModelDefaults({}, "dacia-sandero") } }).cars.car1;
  Object.entries(before).forEach(([field, value]) => assert.equal(analyzed[field], value, field));
});

run("changing car model reloads model defaults", () => {
  const corolla = model.applyCarModelDefaults({}, "toyota-corolla");
  corolla.annualInsurance = 999;
  model.markCustom(corolla, "annualInsurance");
  const phantom = model.applyCarModelDefaults(corolla, "rolls-royce-phantom");
  assert.equal(phantom.modelId, "rolls-royce-phantom");
  assert.equal(phantom.annualInsurance, 9000);
  assert.equal(phantom.customFields.length, 0);
});

run("custom display name appears in labels and results", () => {
  const named = model.applyCarModelDefaults({}, "tesla-model-3", { customName: "Blue Tesla offer" });
  const other = model.applyCarModelDefaults({}, "volkswagen-golf");
  const result = model.analyze({ assumptions: assumptions(), cars: { car1: named, car2: other } });
  assert.match(result.rows.map((row) => row.option).join(" | "), /Blue Tesla offer upfront/);
  assert.doesNotMatch(JSON.stringify(result.rows), /Car 1|Car 2|Custom/);
});

run("luxury and supercar models have dramatically higher ownership costs", () => {
  const dacia = model.applyCarModelDefaults({}, "dacia-sandero");
  const toyota = model.applyCarModelDefaults({}, "toyota-corolla");
  const honda = model.applyCarModelDefaults({}, "honda-civic");
  const mainstreamAverage = [dacia, toyota, honda].reduce((sum, item) => sum + item.annualMaintenance + item.annualInsurance + item.annualRepairs, 0) / 3;
  ["mercedes-s-class", "rolls-royce-phantom", "lamborghini-aventador", "bugatti-chiron", "rimac-nevera"].forEach((id) => {
    const exotic = model.applyCarModelDefaults({}, id);
    const annual = exotic.annualMaintenance + exotic.annualInsurance + exotic.annualRepairs;
    assert.ok(annual > mainstreamAverage * 3, `${id} should be far above mainstream costs`);
  });
});

run("fuel, electricity, and annual km changes affect the appropriate models", () => {
  const gas = model.applyCarModelDefaults({}, "volkswagen-golf");
  const hybrid = model.applyCarModelDefaults({}, "toyota-prius");
  const ev = model.applyCarModelDefaults({}, "tesla-model-3");
  assert.ok(model.annualEnergyCost(Object.assign({}, gas, { fuelPrice: 2.2 }), assumptions()) > model.annualEnergyCost(gas, assumptions()));
  assert.ok(model.annualEnergyCost(Object.assign({}, hybrid, { fuelPrice: 2.2 }), assumptions()) > model.annualEnergyCost(hybrid, assumptions()));
  assert.ok(model.annualEnergyCost(Object.assign({}, ev, { homeElectricityPrice: 0.4, publicElectricityPrice: 0.8 }), assumptions()) > model.annualEnergyCost(ev, assumptions()));
  assert.ok(model.annualEnergyCost(gas, assumptions({ annualKm: 30000 })) > model.annualEnergyCost(gas, assumptions({ annualKm: 10000 })));
  assert.ok(model.annualEnergyCost(ev, assumptions({ annualKm: 30000 })) > model.annualEnergyCost(ev, assumptions({ annualKm: 10000 })));
});

run("no NaN, undefined, or missing values for any model analysis", () => {
  model.CAR_DATABASE.forEach((entry) => {
    const result = model.analyze({
      assumptions: assumptions({ yearsOwned: 7 }),
      cars: {
        car1: model.applyCarModelDefaults({}, entry.id),
        car2: model.applyCarModelDefaults({}, "dacia-sandero"),
      },
    });
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /NaN|undefined|Infinity/, entry.id);
    assert.ok(result.rows.every((row) => row.option && row.carName), entry.id);
  });
});

run("ranking uses the same formulas as main comparison", () => {
  const setup = assumptions({ initialCashBudget: 35000, monthlyBudget: 450, yearsOwned: 6, annualKm: 18000 });
  const ranking = model.rankCarDatabase(setup);
  assert.equal(ranking.length, model.CAR_DATABASE.length);
  assert.ok(ranking[0].finalMoney >= ranking[1].finalMoney);
  const rankedTesla = ranking.find((row) => row.modelId === "tesla-model-3");
  const car1 = model.applyCarModelDefaults({}, "tesla-model-3");
  const comparison = model.analyze({ assumptions: setup, cars: { car1, car2: model.applyCarModelDefaults({}, "volkswagen-golf") } });
  const comparedTesla = comparison.rows.find((row) => row.carKey === "car1");
  approx(rankedTesla.finalMoney, comparedTesla.finalMoney, 1e-9);
  approx(rankedTesla.totalPaid, comparedTesla.totalPaid, 1e-9);
});

run("ranking updates when setup values change", () => {
  const lowKm = model.rankCarDatabase(assumptions({ annualKm: 5000 }));
  const highKm = model.rankCarDatabase(assumptions({ annualKm: 40000 }));
  assert.notEqual(JSON.stringify(lowKm.slice(0, 10).map((row) => [row.modelId, Math.round(row.finalMoney)])), JSON.stringify(highKm.slice(0, 10).map((row) => [row.modelId, Math.round(row.finalMoney)])));
  assert.doesNotMatch(JSON.stringify(highKm), /NaN|undefined|Infinity/);
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
