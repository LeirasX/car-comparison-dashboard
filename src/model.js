(function initCarMoneyModel(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CarCompareModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildModel() {
  "use strict";

  const STOCK_RETURN = 8;
  const PAYMENT_MODES = { upfront: "upfront", finance: "finance" };
  const VEHICLE_TYPES = { ev: "EV", hybrid: "Hybrid", combustion: "Combustion" };
  const CAR_DATABASE = (function loadCars() {
    if (typeof module !== "undefined" && module.exports) return require("./data/cars.js");
    return (typeof globalThis !== "undefined" && globalThis.CarCompareDatabase) || [];
  })();
  const CAR_BY_ID = Object.fromEntries(CAR_DATABASE.map((car) => [car.id, car]));

  const DEFAULT_ASSUMPTIONS = {
    initialCashBudget: 20000,
    monthlyBudget: 300,
    yearsOwned: 7,
    annualKm: 15000,
  };

  const TYPE_DEFAULTS = {
    ev: {
      type: "ev",
      upfrontPrice: 20000,
      downPayment: 5000,
      monthlyPayment: 325,
      loanMonths: 84,
      // Conservative Portugal-like defaults: used Model 3 real use above WLTP, mostly home charging.
      kwhPer100Km: 15.8,
      litersPer100Km: 0,
      fuelPrice: 1.75,
      homeElectricityPrice: 0.20,
      publicElectricityPrice: 0.48,
      homeChargingPct: 85,
      publicChargingPct: 15,
      annualMaintenance: 380,
      annualInsurance: 650,
      annualRepairs: 450,
      annualTax: 0,
    },
    hybrid: {
      type: "hybrid",
      upfrontPrice: 22000,
      downPayment: 4000,
      monthlyPayment: 285,
      loanMonths: 72,
      kwhPer100Km: 0,
      // Toyota Corolla-like non-plug-in hybrid, adjusted above WLTP for mixed real use.
      litersPer100Km: 4.9,
      fuelPrice: 1.75,
      homeElectricityPrice: 0.18,
      publicElectricityPrice: 0.45,
      homeChargingPct: 0,
      publicChargingPct: 0,
      annualMaintenance: 520,
      annualInsurance: 560,
      annualRepairs: 520,
      annualTax: 110,
    },
    combustion: {
      type: "combustion",
      upfrontPrice: 10000,
      downPayment: 3000,
      monthlyPayment: 245,
      loanMonths: 60,
      kwhPer100Km: 0,
      // Used compact petrol/diesel blend for Portugal-like mixed driving at 15,000 km/year.
      litersPer100Km: 6.2,
      fuelPrice: 1.75,
      homeElectricityPrice: 0.18,
      publicElectricityPrice: 0.45,
      homeChargingPct: 0,
      publicChargingPct: 0,
      annualMaintenance: 650,
      annualInsurance: 500,
      annualRepairs: 760,
      annualTax: 170,
    },
  };

  const DEFAULT_CARS = {
    car1: Object.assign({ modelId: "tesla-model-3", customName: "", paymentMode: PAYMENT_MODES.upfront }, carDefaultsFromModel("tesla-model-3")),
    car2: Object.assign({ modelId: "volkswagen-golf", customName: "", paymentMode: PAYMENT_MODES.upfront }, carDefaultsFromModel("volkswagen-golf")),
  };

  const TYPE_FIELDS = [
    "upfrontPrice",
    "downPayment",
    "monthlyPayment",
    "loanMonths",
    "kwhPer100Km",
    "litersPer100Km",
    "fuelPrice",
    "homeElectricityPrice",
    "publicElectricityPrice",
    "homeChargingPct",
    "publicChargingPct",
    "annualMaintenance",
    "annualInsurance",
    "annualRepairs",
    "annualTax",
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, num(value)));
  }

  function cleanType(type) {
    if (type === "electric") return "ev";
    return Object.prototype.hasOwnProperty.call(TYPE_DEFAULTS, type) ? type : "combustion";
  }

  function carModelById(modelId) {
    return CAR_BY_ID[modelId] || null;
  }

  function typeFromModel(model) {
    if (!model) return "combustion";
    if (model.energyType === "electricity" || model.category === "ev") return "ev";
    if (model.category === "hybrid") return "hybrid";
    return "combustion";
  }

  function carDefaultsFromModel(modelId) {
    const model = carModelById(modelId) || CAR_DATABASE[0] || null;
    if (!model) return clone(TYPE_DEFAULTS.combustion);
    const type = typeFromModel(model);
    const defaults = clone(TYPE_DEFAULTS[type] || TYPE_DEFAULTS.combustion);
    return Object.assign(defaults, {
      modelId: model.id,
      modelDisplayName: model.displayName,
      name: model.displayName,
      category: model.category,
      typicalMarket: model.typicalMarket,
      type,
      energyType: model.energyType,
      fuelType: model.fuelType,
      upfrontPrice: model.defaultUpfrontPrice,
      kwhPer100Km: model.realWorldKwhPer100km,
      litersPer100Km: model.realWorldLitersPer100km,
      annualMaintenance: model.maintenancePerYear,
      annualInsurance: model.insurancePerYear,
      annualRepairs: model.repairsPerYear,
      annualTax: model.taxPerYear,
      depreciationProfile: clone(model.depreciationProfile),
      resaleRetentionEstimate: model.resaleRetentionEstimate,
      modelNotes: model.notes,
      confidence: model.confidence,
      sourceNotes: model.sourceNotes,
      loadedFromDatabase: true,
    });
  }

  function displayCarName(carInput) {
    const car = carInput || {};
    const customName = String(car.customName || "").trim();
    if (customName) return customName;
    const model = carModelById(car.modelId);
    return String(car.modelDisplayName || (model && model.displayName) || car.name || "Unnamed option").trim() || "Unnamed option";
  }

  function monthlyInvestmentRate() {
    return Math.pow(1 + STOCK_RETURN / 100, 1 / 12) - 1;
  }

  function normalizeYears(years) {
    return Math.max(1 / 12, num(years, DEFAULT_ASSUMPTIONS.yearsOwned));
  }

  function analysisMonths(years) {
    return Math.max(1, Math.round(normalizeYears(years) * 12));
  }

  function defaultCar(carKey) {
    return clone(DEFAULT_CARS[carKey] || DEFAULT_CARS.car1);
  }

  function customSet(car) {
    return new Set(Array.isArray(car && car.customFields) ? car.customFields : []);
  }

  function applyTypeDefaults(carInput, options) {
    const car = Object.assign({}, carInput || {});
    const nextType = cleanType(car.type);
    const defaults = TYPE_DEFAULTS[nextType];
    const respectCustom = !options || options.respectCustom !== false;
    const custom = customSet(car);
    TYPE_FIELDS.forEach((field) => {
      if (!respectCustom || !custom.has(field) || field === "kwhPer100Km" || field === "litersPer100Km") {
        if (!respectCustom || !custom.has(field)) car[field] = defaults[field];
      }
    });
    car.type = nextType;
    car.customFields = Array.from(custom);
    if (!car.name) car.name = VEHICLE_TYPES[nextType];
    return car;
  }

  function applyCarModelDefaults(carInput, modelId, options) {
    const current = Object.assign({}, carInput || {});
    const modelDefaults = carDefaultsFromModel(modelId);
    const keepPayment = !options || options.keepPayment !== false;
    const next = Object.assign({}, current, modelDefaults, {
      modelId: modelDefaults.modelId,
      customName: options && Object.prototype.hasOwnProperty.call(options, "customName") ? options.customName : "",
      paymentMode: keepPayment ? (current.paymentMode === PAYMENT_MODES.finance ? PAYMENT_MODES.finance : PAYMENT_MODES.upfront) : PAYMENT_MODES.upfront,
      customFields: [],
      resaleCustom: false,
    });
    next.name = displayCarName(next);
    return next;
  }

  function withCarDefaults(carInput, carKey) {
    const base = defaultCar(carKey);
    const merged = Object.assign({}, base, clone(carInput || {}));
    const model = carModelById(merged.modelId);
    if (model) {
      const modelDefaults = carDefaultsFromModel(model.id);
      [
        "modelDisplayName",
        "category",
        "typicalMarket",
        "energyType",
        "fuelType",
        "depreciationProfile",
        "resaleRetentionEstimate",
        "modelNotes",
        "confidence",
        "sourceNotes",
        "loadedFromDatabase",
      ].forEach((field) => {
        if (merged[field] === undefined || merged[field] === null || field === "modelDisplayName") merged[field] = clone(modelDefaults[field]);
      });
      merged.type = typeFromModel(model);
    }
    merged.type = cleanType(merged.type);
    merged.paymentMode = merged.paymentMode === PAYMENT_MODES.finance ? PAYMENT_MODES.finance : PAYMENT_MODES.upfront;
    merged.customFields = Array.isArray(merged.customFields) ? merged.customFields.slice() : [];
    merged.name = displayCarName(merged);
    return merged;
  }

  function markCustom(car, field) {
    const custom = customSet(car);
    custom.add(field);
    car.customFields = Array.from(custom);
    return car;
  }

  function clearCustom(car, fields) {
    const custom = customSet(car);
    fields.forEach((field) => custom.delete(field));
    car.customFields = Array.from(custom);
    return car;
  }

  function retentionRate(typeInput, yearsInput) {
    const type = cleanType(typeInput);
    const years = normalizeYears(yearsInput);
    const firstYearDrop = { ev: 0.78, hybrid: 0.82, combustion: 0.80 }[type];
    const yearlyRetention = { ev: 0.905, hybrid: 0.915, combustion: 0.90 }[type];
    if (years <= 1) return Math.min(0.92, firstYearDrop + (1 - years) * 0.08);
    return clamp(firstYearDrop * Math.pow(yearlyRetention, years - 1), 0.08, 0.92);
  }

  function modelRetentionRate(carInput, yearsInput) {
    const car = withCarDefaults(carInput);
    const profile = car.depreciationProfile;
    const years = normalizeYears(yearsInput);
    if (!profile || !Number.isFinite(Number(profile.firstYearRetention)) || !Number.isFinite(Number(profile.annualRetention))) {
      return retentionRate(car.type, years);
    }
    const firstYearRetention = num(profile.firstYearRetention, retentionRate(car.type, 1));
    const annualRetention = num(profile.annualRetention, 0.9);
    const minRetention = num(profile.minRetention, 0.08);
    if (years <= 1) return Math.min(0.98, firstYearRetention + (1 - years) * 0.06);
    return clamp(firstYearRetention * Math.pow(annualRetention, years - 1), minRetention, 1.15);
  }

  function estimatedResaleValue(carInput, yearsInput) {
    const car = withCarDefaults(carInput);
    return Math.round(Math.max(0, num(car.upfrontPrice) * modelRetentionRate(car, yearsInput)) / 100) * 100;
  }

  function effectiveResaleValue(carInput, yearsInput) {
    const car = withCarDefaults(carInput);
    if (car.resaleCustom) return Math.max(0, num(car.resaleValue));
    return estimatedResaleValue(car, yearsInput);
  }

  function financeSummary(carInput) {
    const car = withCarDefaults(carInput);
    const months = Math.max(0, Math.round(num(car.loanMonths)));
    const monthlyPayment = Math.max(0, num(car.monthlyPayment));
    const downPayment = Math.max(0, num(car.downPayment));
    const financeTotal = downPayment + monthlyPayment * months;
    return {
      downPayment,
      monthlyPayment,
      loanMonths: months,
      financeTotal,
      financeTotalPaid: financeTotal,
      financingCost: financeTotal - num(car.upfrontPrice),
    };
  }

  function loanBalance(carInput, monthsPaidInput) {
    const car = withCarDefaults(carInput);
    const finance = financeSummary(car);
    const totalMonths = finance.loanMonths;
    if (totalMonths <= 0) return 0;
    const paidMonths = clamp(Math.round(num(monthsPaidInput)), 0, totalMonths);
    const principal = Math.max(0, finance.financeTotal - finance.downPayment);
    const owed = principal - finance.monthlyPayment * paidMonths;
    return Math.max(0, owed);
  }

  function weightedElectricityPrice(carInput) {
    const car = withCarDefaults(carInput);
    const homePct = clamp(car.homeChargingPct, 0, 100) / 100;
    const publicPct = clamp(car.publicChargingPct, 0, 100) / 100;
    const total = homePct + publicPct;
    const homeShare = total > 0 ? homePct / total : 1;
    const publicShare = total > 0 ? publicPct / total : 0;
    return homeShare * Math.max(0, num(car.homeElectricityPrice)) + publicShare * Math.max(0, num(car.publicElectricityPrice));
  }

  function annualEnergyCost(carInput, assumptionsInput) {
    const car = withCarDefaults(carInput);
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const km = Math.max(0, num(assumptions.annualKm));
    if (car.type === "ev") return km / 100 * Math.max(0, num(car.kwhPer100Km)) * weightedElectricityPrice(car);
    return km / 100 * Math.max(0, num(car.litersPer100Km)) * Math.max(0, num(car.fuelPrice));
  }

  function annualRunningBreakdown(carInput, assumptions) {
    const car = withCarDefaults(carInput);
    const energy = annualEnergyCost(car, assumptions);
    const maintenance = Math.max(0, num(car.annualMaintenance));
    const insurance = Math.max(0, num(car.annualInsurance));
    const repairs = Math.max(0, num(car.annualRepairs));
    const tax = Math.max(0, num(car.annualTax));
    return {
      energy,
      maintenance,
      insurance,
      repairs,
      tax,
      total: energy + maintenance + insurance + repairs + tax,
    };
  }

  function scenarioLabel(row) {
    const name = String(row && row.carName ? row.carName : row && row.name ? row.name : "").trim() || "Unnamed option";
    const mode = row && row.mode === PAYMENT_MODES.finance ? "finance" : "upfront";
    return `${name} ${mode}`;
  }

  function possibleStatus(warnings) {
    if (warnings.some((warning) => warning.severity === "no")) return "No";
    if (warnings.length) return "Warning";
    return "Yes";
  }

  function shortSummary(row, winner) {
    if (row.possible === "No") return "Impossible: upfront exceeds cash";
    if (row.loanStillOwed > 0) return "Warning: loan not paid";
    if (row.budgetDeficit > 0) return "Loses: high monthly cost";
    if (winner && row.id === winner.id) {
      if (row.averageMonthlyInvested > 0 && row.resaleValue > row.upfrontPrice * 0.35) return "Strong: low cost + resale";
      return "Wins: more invested";
    }
    if (row.resaleRisk) return "Risk: resale assumption high";
    return row.averageMonthlyInvested < (winner ? winner.averageMonthlyInvested : row.averageMonthlyInvested) ? "Loses: high monthly cost" : "Loses: less invested";
  }

  function warning(id, severity, message, carKey, option) {
    return { id, severity, message, carKey, option };
  }

  function buildWarnings(row, car, assumptions, months) {
    const warnings = [];
    if (!String(car.name || "").trim()) warnings.push(warning("missing-name", "warning", "Car name is missing.", row.carKey, row.option));
    if (num(car.upfrontPrice) <= 0) warnings.push(warning("missing-price", "no", "Cash price is missing.", row.carKey, row.option));
    if (row.mode === PAYMENT_MODES.upfront && num(car.upfrontPrice) > num(assumptions.initialCashBudget)) {
      warnings.push(warning("upfront-cash", "no", "Upfront price exceeds initial cash.", row.carKey, row.option));
    }
    if (row.mode === PAYMENT_MODES.finance && num(car.downPayment) > num(assumptions.initialCashBudget)) {
      warnings.push(warning("down-cash", "no", "Down payment exceeds initial cash.", row.carKey, row.option));
    }
    if (row.maxMonthlyCarCost > num(assumptions.monthlyBudget)) {
      warnings.push(warning("monthly-budget", "warning", "Monthly cost exceeds monthly budget.", row.carKey, row.option));
    }
    if (row.mode === PAYMENT_MODES.finance && row.loanStillOwed > 0) {
      warnings.push(warning("loan-long", "warning", "Loan still active after selected years.", row.carKey, row.option));
    }
    if (row.resaleValue < 0 || !Number.isFinite(row.resaleValue)) {
      warnings.push(warning("resale-invalid", "no", "Resale value is missing or negative.", row.carKey, row.option));
    }
    if (row.resaleValue > num(car.upfrontPrice) * 0.9 && normalizeYears(assumptions.yearsOwned) >= 2) {
      warnings.push(warning("resale-high", "warning", "Resale value looks suspiciously high.", row.carKey, row.option));
    }
    return warnings;
  }

  function simulateScenario(carInput, assumptionsInput, modeInput, yearsInput, carKeyInput) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const years = normalizeYears(yearsInput === undefined ? assumptions.yearsOwned : yearsInput);
    const months = analysisMonths(years);
    const monthlyRate = monthlyInvestmentRate();
    const car = withCarDefaults(carInput, carKeyInput);
    const mode = modeInput === PAYMENT_MODES.finance ? PAYMENT_MODES.finance : PAYMENT_MODES.upfront;
    const finance = financeSummary(car);
    const isFinance = mode === PAYMENT_MODES.finance;
    const initialSpent = isFinance ? finance.downPayment : Math.max(0, num(car.upfrontPrice));
    let investmentBalance = Math.max(0, num(assumptions.initialCashBudget) - initialSpent);
    let totalDeficits = Math.max(0, initialSpent - num(assumptions.initialCashBudget));
    let monthlyInvestedTotal = 0;
    let carPaymentsPaid = initialSpent;
    let runningPaid = 0;
    let maxMonthlyCarCost = 0;
    const running = annualRunningBreakdown(car, assumptions);
    const monthlyRunning = running.total / 12;
    const yearly = [];

    for (let month = 1; month <= months; month += 1) {
      investmentBalance *= 1 + monthlyRate;
      const monthlyCarPayment = isFinance && month <= finance.loanMonths ? finance.monthlyPayment : 0;
      const monthlyTotalCarCost = monthlyCarPayment + monthlyRunning;
      const monthlyInvested = Math.max(0, num(assumptions.monthlyBudget) - monthlyTotalCarCost);
      const monthlyDeficit = Math.max(0, monthlyTotalCarCost - num(assumptions.monthlyBudget));
      investmentBalance += monthlyInvested;
      monthlyInvestedTotal += monthlyInvested;
      totalDeficits += monthlyDeficit;
      carPaymentsPaid += monthlyCarPayment;
      runningPaid += monthlyRunning;
      maxMonthlyCarCost = Math.max(maxMonthlyCarCost, monthlyTotalCarCost);

      if (month % 12 === 0) {
        const year = month / 12;
        const resaleAtYear = effectiveResaleValue(car, year);
        const loanAtYear = isFinance ? loanBalance(car, month) : 0;
        yearly.push({
          year,
          finalMoney: investmentBalance + resaleAtYear - loanAtYear - totalDeficits,
          investmentBalance,
          resaleValue: resaleAtYear,
          loanLeft: loanAtYear,
          totalDeficits,
          runningPaid,
          carPaymentsPaid,
        });
      }
    }

    const resaleValue = effectiveResaleValue(car, years);
    const loanStillOwed = isFinance ? loanBalance(car, months) : 0;
    const finalMoney = investmentBalance + resaleValue - loanStillOwed - totalDeficits;
    const totalRunningCost = runningPaid;
    const totalPaid = carPaymentsPaid + totalRunningCost;
    const paidByEnd = isFinance ? carPaymentsPaid : num(car.upfrontPrice);
    const row = {
      id: "",
      carKey: carKeyInput || "",
      carName: car.name,
      option: "",
      mode,
      type: car.type,
      years,
      months,
      possible: "Yes",
      warnings: [],
      upfrontPrice: num(car.upfrontPrice),
      initialSpent,
      carPaidDisplay: isFinance && finance.loanMonths > months ? paidByEnd : (isFinance ? finance.financeTotal : num(car.upfrontPrice)),
      carPaidNote: isFinance && finance.loanMonths > months ? "paid by selected year" : (isFinance ? "full finance term" : "paid upfront"),
      carMonthlyPaymentDisplay: isFinance ? finance.monthlyPayment : 0,
      carTotalDisplay: isFinance ? finance.financeTotal : num(car.upfrontPrice),
      carPaymentsPaid,
      financeTotal: finance.financeTotal,
      financingCost: isFinance ? finance.financingCost : 0,
      monthlyRunningCost: monthlyRunning,
      extraMonth: monthlyRunning,
      extraTotal: totalRunningCost,
      totalPaid,
      investedResult: investmentBalance,
      investmentBalance,
      resaleValue,
      resaleSource: car.resaleCustom ? "custom" : "estimated",
      loanLeft: loanStillOwed,
      loanStillOwed,
      finalMoney,
      finalMoneyLeft: finalMoney,
      totalDeficits,
      budgetDeficit: totalDeficits,
      averageMonthlyInvested: months > 0 ? monthlyInvestedTotal / months : 0,
      averageMonthlyCarCost: months > 0 ? (carPaymentsPaid - initialSpent + totalRunningCost) / months : 0,
      maxMonthlyCarCost,
      running,
      runningPaid,
      energyPaid: running.energy / 12 * months,
      maintenancePaid: running.maintenance / 12 * months,
      insurancePaid: running.insurance / 12 * months,
      repairsPaid: running.repairs / 12 * months,
      taxPaid: running.tax / 12 * months,
      monthlyPaymentUsed: isFinance ? finance.monthlyPayment : 0,
      finance,
      yearly,
      resaleRisk: resaleValue > num(car.upfrontPrice) * 0.9 && years >= 2,
    };
    row.option = scenarioLabel(row);
    row.warnings = buildWarnings(row, car, assumptions, months);
    row.possible = possibleStatus(row.warnings);
    row.summary = shortSummary(row, null);
    return row;
  }

  function compareRows(a, b) {
    return a.finalMoney - b.finalMoney;
  }

  function analyze(input) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, input && input.assumptions ? input.assumptions : {});
    assumptions.yearsOwned = normalizeYears(assumptions.yearsOwned);
    const cars = {
      car1: withCarDefaults(input && input.cars && input.cars.car1, "car1"),
      car2: withCarDefaults(input && input.cars && input.cars.car2, "car2"),
    };
    Object.values(cars).forEach((car) => {
      if (!car.resaleCustom) car.resaleValue = estimatedResaleValue(car, assumptions.yearsOwned);
    });
    const rows = Object.entries(cars).map(([carKey, car]) => {
      const row = simulateScenario(car, assumptions, car.paymentMode, assumptions.yearsOwned, carKey);
      row.id = `${carKey}_${row.mode}`;
      row.option = scenarioLabel(row);
      return row;
    });
    const winner = rows.slice().sort((a, b) => compareRows(b, a))[0] || null;
    rows.forEach((row) => {
      row.isWinner = Boolean(winner && row.id === winner.id);
      row.summary = shortSummary(row, winner);
    });
    const runnerUp = winner ? rows.filter((row) => row.id !== winner.id).sort((a, b) => compareRows(b, a))[0] : null;
    const warnings = rows.flatMap((row) => row.warnings);
    return {
      assumptions,
      cars,
      rows,
      scenarios: rows,
      winner,
      runnerUp,
      difference: winner && runnerUp ? winner.finalMoney - runnerUp.finalMoney : 0,
      warnings,
      stockReturn: STOCK_RETURN,
    };
  }

  function rankCarDatabase(assumptionsInput) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    assumptions.yearsOwned = normalizeYears(assumptions.yearsOwned);
    return CAR_DATABASE.map((entry) => {
      const car = applyCarModelDefaults({}, entry.id, { keepPayment: false });
      const row = simulateScenario(car, assumptions, PAYMENT_MODES.upfront, assumptions.yearsOwned, entry.id);
      row.id = entry.id;
      row.modelId = entry.id;
      row.carName = entry.displayName;
      row.category = entry.category;
      row.categoryGroup = entry.categoryGroup || entry.category;
      row.categoryLabel = entry.categoryLabel || entry.categoryGroup || entry.category;
      row.option = entry.displayName;
      return row;
    }).sort((a, b) => b.finalMoney - a.finalMoney);
  }

  function formatEuro(value) {
    return `€${Math.round(num(value)).toLocaleString("en-IE")}`;
  }

  return {
    STOCK_RETURN,
    PAYMENT_MODES,
    VEHICLE_TYPES,
    CAR_DATABASE,
    CAR_BY_ID,
    DEFAULT_ASSUMPTIONS,
    TYPE_DEFAULTS,
    DEFAULT_CARS,
    TYPE_FIELDS,
    clone,
    num,
    defaultCar,
    carModelById,
    carDefaultsFromModel,
    applyCarModelDefaults,
    displayCarName,
    applyTypeDefaults,
    markCustom,
    clearCustom,
    monthlyInvestmentRate,
    retentionRate,
    modelRetentionRate,
    estimatedResaleValue,
    effectiveResaleValue,
    financeSummary,
    loanBalance,
    weightedElectricityPrice,
    annualEnergyCost,
    annualRunningBreakdown,
    simulateScenario,
    analyze,
    rankCarDatabase,
    scenarioLabel,
    formatEuro,
  };
});
