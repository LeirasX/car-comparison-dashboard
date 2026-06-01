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
    electricityPrice: 0.24,
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
  approx(model.monthlyInvestmentRate(4), Math.pow(1.04, 1 / 12) - 1, 1e-12);
});

run("default comparison uses real database-backed car models", () => {
  assert.equal(model.DEFAULT_ASSUMPTIONS.initialCashBudget, 20000);
  assert.equal(model.DEFAULT_ASSUMPTIONS.monthlyBudget, 300);
  assert.equal(model.DEFAULT_ASSUMPTIONS.yearsOwned, 7);
  assert.equal(model.DEFAULT_ASSUMPTIONS.annualKm, 15000);
  const tesla = model.defaultCar("car1");
  const golf = model.defaultCar("car2");
  assert.equal(tesla.modelId, "tesla-model-3");
  assert.equal(tesla.name, "Tesla Model 3 2021");
  assert.equal(tesla.type, "ev");
  assert.equal(tesla.paymentMode, "upfront");
  assert.equal(tesla.upfrontPrice, 28000);
  assert.equal(golf.modelId, "volkswagen-golf");
  assert.equal(golf.name, "Volkswagen Golf 2021");
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
  const ev = car({ type: "ev", kwhPer100Km: 20, litersPer100Km: 99, fuelPrice: 99, electricityPrice: 0 });
  const gas = car({ type: "combustion", kwhPer100Km: 99, litersPer100Km: 6, fuelPrice: 2, electricityPrice: 99 });
  approx(model.annualEnergyCost(ev, assumptions({ annualKm: 10000, electricityPrice: 0 })), 0);
  approx(model.annualEnergyCost(gas, assumptions({ annualKm: 10000, fuelPrice: 2 })), 1200);
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
  assert.ok(model.CAR_DATABASE.length >= 5000 && model.CAR_DATABASE.length <= 10000, `expected 5000-10000 cars, got ${model.CAR_DATABASE.length}`);
  ["opel-corsa", "seat-ibiza", "skoda-octavia", "volvo-ex30", "porsche-macan-electric", "lamborghini-huracan", "citroen-c3", "renault-captur", "toyota-yaris-cross", "volkswagen-id3", "kia-ev9", "bugatti-veyron", "koenigsegg-jesko", "pagani-huayra", "porsche-carrera-gt", "tesla-cybertruck-cyberbeast", "maybach-s-class"].forEach((id) => {
    assert.ok(model.carModelById(id), `${id} should exist`);
  });
  model.CAR_DATABASE.forEach((entry) => {
    const loaded = model.applyCarModelDefaults({}, entry.id);
    assert.equal(loaded.modelId, entry.id);
    assert.equal(model.displayCarName(loaded), entry.displayName);
    ["brand", "model", "category", "powertrain", "segment", "marketContext"].forEach((field) => {
      assert.ok(String(entry[field] || loaded[field] || "").trim(), `${entry.id} ${field}`);
    });
    ["carValue", "upfrontPrice", "annualMaintenance", "annualInsurance", "annualRepairs", "annualTax", "resaleRetentionEstimate"].forEach((field) => {
      assert.ok(Number.isFinite(Number(loaded[field])), `${entry.id} ${field} should be finite`);
      assert.ok(Number(loaded[field]) >= 0, `${entry.id} ${field} should be non-negative`);
    });
    assert.equal(loaded.carValue, entry.defaultUpfrontPrice, `${entry.id} car value`);
    assert.equal(entry.fullName, entry.displayName, `${entry.id} fullName should drive visible name`);
    assert.match(entry.displayName, new RegExp(`^${entry.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} .+ (19[8-9]\\d|20[0-2]\\d)$`), `${entry.id} should use Brand + Model + Year visible naming`);
    assert.doesNotMatch(entry.displayName, /Standard Range|Long Range|Performance|RWD|Plaid|PureTech|BlueHDi|TDI|TSI|Hybrid|Plus/i, `${entry.id} visible name should not expose trim clutter`);
    assert.ok(entry.displayName.startsWith(entry.brand), `${entry.id} complete searchable name should start with brand`);
    ["reliability", "comfort", "safety", "practicality", "tech", "drivingEnjoyment"].forEach((field) => {
      assert.ok(Number.isFinite(Number(loaded.scores[field])), `${entry.id} score ${field}`);
      assert.ok(Number(loaded.scores[field]) >= 0 && Number(loaded.scores[field]) <= 10, `${entry.id} score range ${field}`);
    });
    assert.equal(Object.keys(loaded.scores).length, 6, `${entry.id} score count`);
    assert.ok(["high", "medium", "low"].includes(loaded.confidence), `${entry.id} confidence`);
    assert.ok(loaded.sourceNotes, `${entry.id} sourceNotes`);
  });
});

run("priority Tesla and Portugal/EU models have key years", () => {
  [
    "Tesla Model 3 2019",
    "Tesla Model 3 2021",
    "Tesla Model 3 2024",
    "Tesla Model Y 2021",
    "Tesla Model Y 2022",
    "Tesla Model Y 2023",
    "Tesla Model Y 2024",
    "Renault Clio 2018",
    "Peugeot 208 2022",
    "Toyota Corolla 2020",
    "Volkswagen Golf 2019",
    "Nissan Leaf 2021",
    "BMW 3 Series 2018",
    "Audi A3 2020",
    "BYD Atto 3 2024",
  ].forEach((fullName) => {
    assert.ok(model.CAR_DATABASE.some((entry) => entry.fullName === fullName), `${fullName} should exist`);
  });
});

run("complete-name search supports brand, model, year, and mixed token queries", () => {
  const matches = (query) => model.CAR_DATABASE.filter((entry) => {
    const haystack = [entry.displayName, entry.brand, entry.model, entry.year, entry.yearRange, entry.categoryGroup, entry.powertrain, entry.fuelType].filter(Boolean).join(" ").toLowerCase();
    return query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
  });
  assert.ok(matches("Tesla").some((entry) => /Tesla/.test(entry.displayName)));
  assert.ok(matches("Model 3").some((entry) => /Tesla Model 3/.test(entry.displayName)));
  assert.ok(matches("2021").every((entry) => /2021/.test(entry.displayName) || entry.year === 2021 || entry.yearRange === 2021));
  assert.ok(matches("BMW 2020").some((entry) => /^BMW .* 2020$/.test(entry.displayName)));
  assert.ok(matches("Tesla Model 3 2024").some((entry) => entry.fullName === "Tesla Model 3 2024"));
  assert.ok(matches("Corolla 2020").some((entry) => entry.fullName === "Toyota Corolla 2020"));
  assert.ok(matches("Toyota Corolla").some((entry) => /^Toyota Corolla/.test(entry.displayName)));
  assert.ok(matches("GT3").some((entry) => /GT3/.test(entry.displayName)));
});

run("database covers requested brand groups and required iconic cars", () => {
  const brands = new Set(model.CAR_DATABASE.map((entry) => entry.brand));
  ["Toyota", "Honda", "Nissan", "Mazda", "Subaru", "Suzuki", "Mitsubishi", "Hyundai", "Kia", "Volkswagen", "Skoda", "SEAT", "Renault", "Peugeot", "Citroën", "Fiat", "Ford", "Chevrolet", "Opel", "Dacia", "BMW", "Mercedes-Benz", "Audi", "Lexus", "Volvo", "Jaguar", "Land Rover", "Porsche", "Genesis", "Tesla", "BYD", "Polestar", "NIO", "XPeng", "Rivian", "Lucid", "Ferrari", "Lamborghini", "McLaren", "Bugatti", "Pagani", "Koenigsegg", "Aston Martin", "Maserati", "Alfa Romeo", "Rolls-Royce", "Bentley", "Maybach", "Jeep", "Ram", "GMC", "Isuzu", "Geely", "Chery", "Great Wall", "MG"].forEach((brand) => {
    assert.ok(brands.has(brand), `${brand} should be covered`);
  });
  ["bugatti-chiron", "bugatti-veyron", "koenigsegg-jesko", "koenigsegg-regera", "pagani-huayra", "rimac-nevera", "ferrari-laferrari", "ferrari-sf90-stradale", "ferrari-f40", "ferrari-enzo", "lamborghini-aventador", "lamborghini-revuelto", "lamborghini-huracan-sto", "lamborghini-murcielago", "porsche-918-spyder", "porsche-911-gt3-rs", "porsche-carrera-gt", "porsche-taycan-turbo-gt", "mclaren-p1", "mclaren-senna", "mclaren-speedtail", "mclaren-765lt", "mercedes-amg-one", "mercedes-clk-gtr", "bmw-m5-cs", "bmw-m3-csl", "bmw-i8", "bmw-xm", "audi-r8", "audi-rs6-avant", "audi-e-tron-gt-rs", "tesla-roadster", "tesla-model-s", "tesla-cybertruck-cyberbeast", "nissan-gt-r", "toyota-supra", "honda-nsx", "lexus-lfa", "mazda-rx-7", "ford-gt", "dodge-challenger-srt-demon-170", "chevrolet-corvette-zr1", "ford-mustang-shelby-gt500", "rolls-royce-phantom", "bentley-continental-gt", "maybach-s-class"].forEach((id) => {
    assert.ok(model.carModelById(id), `${id} should exist`);
  });
});

run("database is ordered from common cheap categories to rare expensive categories", () => {
  const categoryOrder = ["City car", "Supermini", "Hatchback", "Sedan", "Estate", "MPV", "Crossover", "SUV", "Pickup", "Van", "Coupe", "Convertible", "Sports car", "Supercar", "Hypercar", "Luxury sedan", "Luxury SUV", "Off-road", "EV hatchback", "EV sedan", "EV SUV"];
  const categories = new Set(model.CAR_DATABASE.map((entry) => entry.categoryGroup));
  categoryOrder.forEach((category) => assert.ok(categories.has(category), `${category} should exist`));
  let previous = -1;
  model.CAR_DATABASE.forEach((entry) => {
    const current = categoryOrder.indexOf(entry.categoryGroup);
    assert.ok(current >= 0, `${entry.id} should use a clean category`);
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
    const polluted = model.annualEnergyCost(Object.assign({}, gas, { kwhPer100Km: 99, electricityPrice: 99 }), assumptions({ annualKm: 10000 }));
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
  assert.match(result.rows.map((row) => row.option).join(" | "), /Tesla Model 3 2021 upfront[\s\S]*Tesla Model 3 2021 finance/);
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
  assert.equal(phantom.annualInsurance, model.carModelById("rolls-royce-phantom").insurancePerYear);
  assert.equal(phantom.customFields.length, 0);
});

run("selected model name appears in labels and results", () => {
  const named = model.applyCarModelDefaults({}, "tesla-model-3");
  const other = model.applyCarModelDefaults({}, "volkswagen-golf");
  const result = model.analyze({ assumptions: assumptions(), cars: { car1: named, car2: other } });
  assert.match(result.rows.map((row) => row.option).join(" | "), /Tesla Model 3 2021 upfront/);
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
  assert.ok(model.annualEnergyCost(gas, assumptions({ fuelPrice: 2.2 })) > model.annualEnergyCost(gas, assumptions({ fuelPrice: 1.5 })));
  assert.ok(model.annualEnergyCost(hybrid, assumptions({ fuelPrice: 2.2 })) > model.annualEnergyCost(hybrid, assumptions({ fuelPrice: 1.5 })));
  assert.ok(model.annualEnergyCost(ev, assumptions({ electricityPrice: 0.4 })) > model.annualEnergyCost(ev, assumptions({ electricityPrice: 0.1 })));
  assert.ok(model.annualEnergyCost(gas, assumptions({ annualKm: 30000 })) > model.annualEnergyCost(gas, assumptions({ annualKm: 10000 })));
  assert.ok(model.annualEnergyCost(ev, assumptions({ annualKm: 30000 })) > model.annualEnergyCost(ev, assumptions({ annualKm: 10000 })));
});

run("EVs use only the single electricity price", () => {
  const ev = model.applyCarModelDefaults({}, "tesla-model-3");
  const cheap = model.annualEnergyCost(ev, assumptions({ annualKm: 12000, electricityPrice: 0.10, fuelPrice: 9 }));
  const expensive = model.annualEnergyCost(ev, assumptions({ annualKm: 12000, electricityPrice: 0.40, fuelPrice: 9 }));
  const pollutedLegacy = model.annualEnergyCost(ev, assumptions({ annualKm: 12000, electricityPrice: 0.10, fuelPrice: 9 }));
  assert.ok(expensive > cheap);
  approx(pollutedLegacy, cheap, 1e-9);
});

run("market return changes investment results", () => {
  const setup = assumptions({ marketReturn: 0, annualKm: 0, monthlyBudget: 500 });
  const high = model.analyze({ assumptions: Object.assign({}, setup, { marketReturn: 12 }), cars: { car1: model.applyCarModelDefaults({}, "dacia-sandero"), car2: model.applyCarModelDefaults({}, "toyota-corolla") } });
  const low = model.analyze({ assumptions: setup, cars: { car1: model.applyCarModelDefaults({}, "dacia-sandero"), car2: model.applyCarModelDefaults({}, "toyota-corolla") } });
  assert.ok(high.rows[0].investmentBalance > low.rows[0].investmentBalance);
});

run("six scores are meaningful and spread across the database", () => {
  const scoreFields = ["reliability", "comfort", "safety", "practicality", "tech", "drivingEnjoyment"];
  scoreFields.forEach((field) => {
    const values = model.CAR_DATABASE.map((entry) => entry.scores[field]);
    assert.ok(Math.min(...values) <= 4, `${field} should use low scores`);
    assert.ok(Math.max(...values) >= 8, `${field} should use high scores`);
  });
  const spring = model.carModelById("dacia-spring");
  const tesla = model.carModelById("tesla-model-3");
  const corolla = model.carModelById("toyota-corolla");
  const ferrari = model.carModelById("ferrari-f40");
  assert.ok(tesla.scores.tech > spring.scores.tech);
  assert.ok(corolla.scores.reliability >= 8);
  assert.ok(ferrari.scores.practicality <= 2);
  assert.ok(ferrari.scores.drivingEnjoyment >= 9);
});

run("score heuristics avoid obvious nonsense", () => {
  const find = (fullName) => model.CAR_DATABASE.find((entry) => entry.fullName === fullName) || model.CAR_DATABASE.find((entry) => entry.id === fullName);
  const corolla = find("Toyota Corolla 2021");
  const civic = find("Honda Civic 2021");
  const spring = find("Dacia Spring 2022");
  const tesla = find("Tesla Model 3 2021");
  const phantom = find("Rolls-Royce Phantom 2021");
  const ferrari = find("Ferrari 488 2015");
  assert.ok(corolla.scores.reliability >= 8, "Corolla reliability should be high");
  assert.ok(civic.scores.reliability >= 8, "Civic reliability should be high");
  assert.ok(spring.scores.tech <= 4 && spring.scores.comfort <= 4, "Dacia Spring should stay basic");
  assert.ok(tesla.scores.tech >= 8 && tesla.acceleration0to100 <= 7, "Model 3 should be tech-forward and quick");
  assert.ok(phantom.scores.comfort >= 9 && phantom.maintenancePerYear >= 3500, "Phantom should be comfort-heavy and expensive");
  assert.ok(ferrari.scores.drivingEnjoyment >= 9 && ferrari.scores.practicality <= 2, "Ferrari should be driving-heavy, not practical");
});

run("image metadata has clean fallbacks and curated real photos where available", () => {
  model.CAR_DATABASE.forEach((entry) => {
    assert.ok(entry.fallbackCategoryImage, `${entry.id} fallback image key`);
    assert.ok(["exact", "generation", "model", "fallback"].includes(entry.imageConfidence), `${entry.id} image confidence`);
    assert.ok(Array.isArray(entry.gallery), `${entry.id} gallery array`);
    if (entry.imageConfidence !== "fallback") {
      assert.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(entry.image), `${entry.id} real image URL`);
      assert.ok(entry.imageSource, `${entry.id} image source`);
    }
  });
  ["tesla-model-3", "toyota-corolla", "volkswagen-golf", "honda-civic", "kia-ev9-2024"].forEach((id) => {
    const entry = model.carModelById(id);
    assert.ok(entry.image, `${id} should have a real image`);
    assert.notEqual(entry.imageConfidence, "fallback", `${id} should not use category fallback`);
  });
});

run("data validation catches impossible scores, costs, energy fields, and images", () => {
  model.CAR_DATABASE.forEach((entry) => {
    assert.ok(Number(entry.defaultUpfrontPrice) > 0, `${entry.id} value`);
    ["maintenancePerYear", "insurancePerYear", "repairsPerYear", "taxPerYear", "resaleRetentionEstimate", "horsepower", "acceleration0to100", "topSpeed", "seats", "doors", "bootLiters"].forEach((field) => {
      assert.ok(Number.isFinite(Number(entry[field])), `${entry.id} ${field}`);
      assert.ok(Number(entry[field]) >= 0, `${entry.id} ${field} non-negative`);
    });
    Object.values(entry.scores).forEach((score) => {
      assert.ok(Number(score) >= 0 && Number(score) <= 10, `${entry.id} score range`);
    });
    if (entry.energyType === "electricity") {
      assert.ok(Number(entry.realWorldKwhPer100km) > 0, `${entry.id} EV kWh`);
      assert.equal(Number(entry.realWorldLitersPer100km), 0, `${entry.id} EV liters`);
    } else {
      assert.ok(Number(entry.realWorldLitersPer100km) > 0, `${entry.id} fuel liters`);
      assert.equal(Number(entry.realWorldKwhPer100km), 0, `${entry.id} fuel kWh`);
    }
    if (/supercar|hypercar/i.test(entry.categoryGroup || "")) {
      assert.ok(entry.scores.practicality <= 3, `${entry.id} supercar practicality`);
    }
    if (entry.year <= 2012 && entry.defaultUpfrontPrice < 12000 && entry.energyType !== "electricity" && !/Sports|Supercar|Hypercar|Luxury/i.test(entry.categoryGroup || "")) {
      assert.ok(entry.scores.tech <= 5, `${entry.id} old cheap tech`);
    }
  });
});

run("car value drives resale independently from offer price", () => {
  const tesla = model.applyCarModelDefaults({}, "tesla-model-3");
  tesla.carValue = 28800;
  tesla.upfrontPrice = 20000;
  tesla.resaleCustom = false;
  const expected = Math.round(28800 * model.modelRetentionRate(tesla, assumptions().yearsOwned) / 100) * 100;
  assert.equal(model.estimatedResaleValue(tesla, assumptions().yearsOwned), expected);
  const analyzed = model.analyze({ assumptions: assumptions(), cars: { car1: tesla, car2: model.applyCarModelDefaults({}, "volkswagen-golf") } }).cars.car1;
  assert.equal(analyzed.carValue, 28800);
  assert.equal(analyzed.upfrontPrice, 20000);
});

run("scores are editable data but do not decide the financial winner", () => {
  const base = model.analyze({
    assumptions: assumptions(),
    cars: {
      car1: model.applyCarModelDefaults({}, "tesla-model-3"),
      car2: model.applyCarModelDefaults({}, "volkswagen-golf"),
    },
  });
  const scoredTesla = Object.assign(model.applyCarModelDefaults({}, "tesla-model-3"), { scores: { reliability: 0, comfort: 0, safety: 0, practicality: 0, tech: 0, drivingEnjoyment: 0 } });
  const scoredGolf = Object.assign(model.applyCarModelDefaults({}, "volkswagen-golf"), { scores: { reliability: 10, comfort: 10, safety: 10, practicality: 10, tech: 10, drivingEnjoyment: 10 } });
  const changed = model.analyze({ assumptions: assumptions(), cars: { car1: scoredTesla, car2: scoredGolf } });
  assert.equal(changed.winner.id, base.winner.id);
  approx(changed.rows[0].finalMoney, base.rows[0].finalMoney, 1e-9);
  approx(changed.rows[1].finalMoney, base.rows[1].finalMoney, 1e-9);
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
  assert.equal(ranking[0].globalRank, 1);
  const rankedTesla = ranking.find((row) => row.modelId === "tesla-model-3");
  const car1 = model.applyCarModelDefaults({}, "tesla-model-3");
  const comparison = model.analyze({ assumptions: setup, cars: { car1, car2: model.applyCarModelDefaults({}, "volkswagen-golf") } });
  const comparedTesla = comparison.rows.find((row) => row.carKey === "car1");
  approx(rankedTesla.finalMoney, comparedTesla.finalMoney, 1e-9);
  approx(rankedTesla.totalPaid, comparedTesla.totalPaid, 1e-9);
  approx(rankedTesla.qualityScore, model.weightedQualityScore(car1), 1e-9);
});

run("ranking has no hidden combined rank formula", () => {
  const setup = assumptions({ initialCashBudget: 30000, monthlyBudget: 500, yearsOwned: 7, annualKm: 15000 });
  const ranking = model.rankCarDatabase(setup);
  ranking.forEach((row, index) => {
    assert.equal(row.globalRank, index + 1);
    assert.equal(row.rankingScore, undefined);
    assert.equal(row.netWorthScore, undefined);
    assert.equal(row.qualityScoreNormalized, undefined);
    if (index > 0) assert.ok(ranking[index - 1].finalMoney >= row.finalMoney);
  });
});

run("ranking handles equal net worth without division by zero", () => {
  const original = model.CAR_DATABASE.slice();
  model.CAR_DATABASE.splice(0, model.CAR_DATABASE.length, model.carModelById("dacia-sandero"), model.carModelById("dacia-sandero"));
  try {
    const ranking = model.rankCarDatabase(assumptions({ annualKm: 0 }));
    assert.equal(ranking.length, 2);
    ranking.forEach((row) => {
      assert.doesNotMatch(JSON.stringify(row), /NaN|Infinity|undefined/);
    });
  } finally {
    model.CAR_DATABASE.splice(0, model.CAR_DATABASE.length, ...original);
  }
});

run("ranking updates when setup values change", () => {
  const lowKm = model.rankCarDatabase(assumptions({ annualKm: 5000 }));
  const highKm = model.rankCarDatabase(assumptions({ annualKm: 40000 }));
  assert.notEqual(JSON.stringify(lowKm.slice(0, 10).map((row) => [row.modelId, Math.round(row.finalMoney)])), JSON.stringify(highKm.slice(0, 10).map((row) => [row.modelId, Math.round(row.finalMoney)])));
  assert.doesNotMatch(JSON.stringify(highKm), /NaN|undefined|Infinity/);
});

run("ranking remains fast with the expanded database", () => {
  const start = Date.now();
  const ranking = model.rankCarDatabase(assumptions({ annualKm: 20000 }));
  const elapsed = Date.now() - start;
  assert.equal(ranking.length, model.CAR_DATABASE.length);
  assert.ok(elapsed < 750, `ranking took ${elapsed}ms`);
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
  const ev = car({ type: "ev", kwhPer100Km: 18, electricityPrice: 0 });
  approx(model.annualEnergyCost(ev, assumptions({ annualKm: 25000, electricityPrice: 0 })), 0);
});

run("combustion fuel formula is annual_km / 100 * L_per_100km * fuel_price", () => {
  const gas = car({ type: "combustion", litersPer100Km: 6.5, fuelPrice: 1.75 });
  approx(model.annualEnergyCost(gas, assumptions({ annualKm: 25000, fuelPrice: 1.75 })), 25000 / 100 * 6.5 * 1.75);
});

run("results contain no NaN, undefined, Infinity, or negative loan values", () => {
  const result = model.analyze({
    assumptions: assumptions({ yearsOwned: 20, annualKm: 0 }),
    cars: {
      car1: car({ name: "Free EV", type: "ev", paymentMode: "upfront", electricityPrice: 0 }),
      car2: car({ name: "Gas", type: "combustion", paymentMode: "finance", monthlyPayment: 0, loanMonths: 0 }),
    },
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /NaN|undefined|Infinity/);
  result.rows.forEach((row) => assert.ok(row.loanLeft >= 0));
});
