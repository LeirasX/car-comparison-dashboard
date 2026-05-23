(function initCarMoneyModel(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CarCompareModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildModel() {
  "use strict";

  const HORIZONS = [3, 5, 7, 10];
  const PAYMENT_MODES = { upfront: "upfront", finance: "finance", both: "both" };

  const DEFAULT_ASSUMPTIONS = {
    initialCashBudget: 37975,
    monthlyBudget: 500,
    investmentReturn: 8,
    annualKm: 25000,
    fuelPrice: 1.75,
    homeElectricityPrice: 0,
    publicElectricityPrice: 0.35,
    homeChargingPct: 100,
    publicChargingPct: 0,
    analysisYears: 10,
  };

  const PRESETS = {
    tesla_model_3_new: {
      label: "Tesla Model 3 New",
      name: "Tesla Model 3 New",
      type: "electric",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 36990,
      downPayment: 8650,
      monthlyPayment: 349,
      loanMonths: 84,
      taeg: 0.71,
      openingFee: 0,
      balloonPayment: 0,
      kwhPer100Km: 14.5,
      litersPer100Km: 0,
      annualMaintenance: 350,
      annualInsurance: 750,
      annualRepairs: 150,
      annualTax: 0,
      qualityScore: 8,
      resaleValues: { 3: 25000, 5: 20500, 7: 16500, 10: 11500 },
    },
    tesla_model_3_used: {
      label: "Tesla Model 3 Used",
      name: "Tesla Model 3 Used",
      type: "electric",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 28800,
      downPayment: 5000,
      monthlyPayment: 301,
      loanMonths: 96,
      taeg: 8,
      openingFee: 250,
      balloonPayment: 0,
      kwhPer100Km: 15,
      litersPer100Km: 0,
      annualMaintenance: 450,
      annualInsurance: 650,
      annualRepairs: 450,
      annualTax: 0,
      qualityScore: 7,
      resaleValues: { 3: 20500, 5: 17000, 7: 13000, 10: 8000 },
    },
    cheap_used_combustion: {
      label: "Cheap used combustion",
      name: "Cheap used combustion",
      type: "combustion",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 10000,
      downPayment: 2000,
      monthlyPayment: 0,
      loanMonths: 60,
      taeg: 9,
      openingFee: 250,
      balloonPayment: 0,
      kwhPer100Km: 0,
      litersPer100Km: 6.5,
      annualMaintenance: 750,
      annualInsurance: 450,
      annualRepairs: 800,
      annualTax: 150,
      qualityScore: 5,
      resaleValues: { 3: 6500, 5: 4500, 7: 3000, 10: 1500 },
    },
    expensive_newer_combustion: {
      label: "Expensive/newer combustion",
      name: "Expensive/newer combustion",
      type: "combustion",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 30000,
      downPayment: 6000,
      monthlyPayment: 0,
      loanMonths: 84,
      taeg: 7,
      openingFee: 350,
      balloonPayment: 0,
      kwhPer100Km: 0,
      litersPer100Km: 5.8,
      annualMaintenance: 550,
      annualInsurance: 650,
      annualRepairs: 300,
      annualTax: 160,
      qualityScore: 7,
      resaleValues: { 3: 22000, 5: 17500, 7: 13000, 10: 7500 },
    },
    cheap_used_ev: {
      label: "Cheap used EV",
      name: "Cheap used EV",
      type: "electric",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 18000,
      downPayment: 3500,
      monthlyPayment: 0,
      loanMonths: 60,
      taeg: 8,
      openingFee: 250,
      balloonPayment: 0,
      kwhPer100Km: 15.5,
      litersPer100Km: 0,
      annualMaintenance: 400,
      annualInsurance: 575,
      annualRepairs: 500,
      annualTax: 0,
      qualityScore: 6,
      resaleValues: { 3: 11500, 5: 8500, 7: 5800, 10: 3000 },
    },
    expensive_new_ev: {
      label: "Expensive/new EV",
      name: "Expensive/new EV",
      type: "electric",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 36000,
      downPayment: 8000,
      monthlyPayment: 0,
      loanMonths: 84,
      taeg: 5.5,
      openingFee: 350,
      balloonPayment: 0,
      kwhPer100Km: 15,
      litersPer100Km: 0,
      annualMaintenance: 350,
      annualInsurance: 800,
      annualRepairs: 150,
      annualTax: 0,
      qualityScore: 8,
      resaleValues: { 3: 25000, 5: 20500, 7: 16000, 10: 9500 },
    },
    custom: {
      label: "Custom",
      name: "Custom",
      type: "combustion",
      paymentMode: PAYMENT_MODES.both,
      upfrontPrice: 10000,
      downPayment: 0,
      monthlyPayment: 0,
      loanMonths: 60,
      taeg: 0,
      openingFee: 0,
      balloonPayment: 0,
      kwhPer100Km: 15,
      litersPer100Km: 6,
      annualMaintenance: 500,
      annualInsurance: 500,
      annualRepairs: 500,
      annualTax: 100,
      qualityScore: 5,
      resaleValues: { 3: 7000, 5: 5000, 7: 3000, 10: 1000 },
    },
  };

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

  function applyPreset(key) {
    return clone(PRESETS[key] || PRESETS.custom);
  }

  function firstNumber(value, fallback) {
    if (value === "" || value === null || typeof value === "undefined") return num(fallback);
    return num(value, fallback);
  }

  function monthlyInvestmentRate(annualReturnPercent) {
    return Math.pow(1 + num(annualReturnPercent) / 100, 1 / 12) - 1;
  }

  function selectedYear(assumptionsInput) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const requested = num(assumptions.analysisYears, DEFAULT_ASSUMPTIONS.analysisYears);
    return HORIZONS.reduce((closest, year) => (
      Math.abs(year - requested) < Math.abs(closest - requested) ? year : closest
    ), HORIZONS[0]);
  }

  function loanMonthlyRate(taegPercent) {
    return num(taegPercent) / 100 / 12;
  }

  function futureValue(amount, monthlyRate, months) {
    return num(amount) * Math.pow(1 + monthlyRate, Math.max(0, months));
  }

  function futureValueMonthlyContribution(payment, monthlyRate, months) {
    const n = Math.max(0, Math.round(months));
    const pmt = num(payment);
    if (n === 0) return 0;
    if (Math.abs(monthlyRate) < 1e-12) return pmt * n;
    return pmt * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
  }

  function loanPayment(principal, annualRatePercent, months) {
    const p = Math.max(0, num(principal));
    const n = Math.max(0, Math.round(num(months)));
    if (n === 0) return 0;
    const r = loanMonthlyRate(annualRatePercent);
    if (Math.abs(r) < 1e-12) return p / n;
    return (p * r) / (1 - Math.pow(1 + r, -n));
  }

  function financePrincipal(car) {
    return Math.max(0, num(car.upfrontPrice) - num(car.downPayment) + num(car.openingFee));
  }

  function financeSummary(car) {
    const principal = financePrincipal(car);
    const months = Math.max(0, Math.round(num(car.loanMonths)));
    const calculatedPayment = loanPayment(principal, car.taeg, months);
    const manualPayment = num(car.monthlyPayment);
    const monthlyPayment = manualPayment > 0 ? manualPayment : calculatedPayment;
    const financeTotalPaid = num(car.downPayment) + monthlyPayment * months + num(car.openingFee) + num(car.balloonPayment);
    return {
      principal,
      monthlyPayment,
      calculatedPayment,
      manualPaymentUsed: manualPayment > 0,
      monthlyRate: loanMonthlyRate(car.taeg),
      financeTotalPaid,
      financingCost: financeTotalPaid - num(car.upfrontPrice),
    };
  }

  function loanBalance(car, monthsPaid) {
    const finance = financeSummary(car);
    const totalMonths = Math.max(0, Math.round(num(car.loanMonths)));
    const paidMonths = Math.max(0, Math.min(totalMonths, Math.round(num(monthsPaid))));
    let balance = finance.principal;
    for (let month = 1; month <= paidMonths; month += 1) {
      balance = balance * (1 + finance.monthlyRate) - finance.monthlyPayment;
      if (month === totalMonths) balance -= num(car.balloonPayment);
      if (balance < 0.01) balance = 0;
    }
    return Math.max(0, balance);
  }

  function weightedElectricityPrice(car, assumptionsInput) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const homePct = clamp(firstNumber(car.homeChargingPct, assumptions.homeChargingPct), 0, 100) / 100;
    const publicPct = clamp(firstNumber(car.publicChargingPct, assumptions.publicChargingPct), 0, 100) / 100;
    const total = homePct + publicPct;
    const homeShare = total > 0 ? homePct / total : 1;
    const publicShare = total > 0 ? publicPct / total : 0;
    const homePrice = firstNumber(car.homeElectricityPrice, assumptions.homeElectricityPrice);
    const publicPrice = firstNumber(car.publicElectricityPrice, assumptions.publicElectricityPrice);
    return homeShare * homePrice + publicShare * publicPrice;
  }

  function annualEnergyCost(car, assumptionsInput) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const km = firstNumber(car.annualKm, assumptions.annualKm);
    if (car.type === "electric") {
      return km / 100 * num(car.kwhPer100Km) * weightedElectricityPrice(car, assumptions);
    }
    return km / 100 * num(car.litersPer100Km) * firstNumber(car.fuelPrice, assumptions.fuelPrice);
  }

  function annualRunningBreakdown(car, assumptions) {
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

  function resaleValue(car, year) {
    return Math.max(0, num(car.resaleValues && car.resaleValues[year]));
  }

  function modesForCar(car) {
    if (car.paymentMode === PAYMENT_MODES.upfront) return [PAYMENT_MODES.upfront];
    if (car.paymentMode === PAYMENT_MODES.finance) return [PAYMENT_MODES.finance];
    return [PAYMENT_MODES.upfront, PAYMENT_MODES.finance];
  }

  function noCarBaseline(assumptionsInput) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const monthlyRate = monthlyInvestmentRate(assumptions.investmentReturn);
    return HORIZONS.map((year) => {
      const months = year * 12;
      const initialCashInvested = futureValue(assumptions.initialCashBudget, monthlyRate, months);
      const monthlyBudgetInvested = futureValueMonthlyContribution(assumptions.monthlyBudget, monthlyRate, months);
      return {
        year,
        initialCashInvested,
        monthlyBudgetInvested,
        finalBaselineWealth: initialCashInvested + monthlyBudgetInvested,
      };
    });
  }

  function simulateScenario(carInput, assumptionsInput, mode, years) {
    const car = Object.assign({}, applyPreset("custom"), clone(carInput));
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, assumptionsInput || {});
    const months = Math.max(0, Math.round(num(years) * 12));
    const monthlyRate = monthlyInvestmentRate(assumptions.investmentReturn);
    const finance = financeSummary(car);
    const isFinance = mode === PAYMENT_MODES.finance;
    const month0Paid = isFinance ? num(car.downPayment) + num(car.openingFee) : num(car.upfrontPrice);
    let investments = Math.max(0, num(assumptions.initialCashBudget) - month0Paid);
    let budgetDeficit = Math.max(0, month0Paid - num(assumptions.initialCashBudget));
    let totalPaid = month0Paid;
    let purchasePaid = month0Paid;
    let runningPaid = 0;
    let loanPaid = isFinance ? month0Paid : 0;
    let monthlyInvestmentContributed = 0;
    const running = annualRunningBreakdown(car, assumptions);
    const monthlyRunning = running.total / 12;
    const loanMonths = Math.max(0, Math.round(num(car.loanMonths)));
    let energyPaid = 0;
    let maintenancePaid = 0;
    let insurancePaid = 0;
    let repairsPaid = 0;
    let taxPaid = 0;
    const yearly = [];

    for (let month = 1; month <= months; month += 1) {
      investments *= 1 + monthlyRate;
      const loanPaymentThisMonth = isFinance && month <= loanMonths ? finance.monthlyPayment : 0;
      const balloonThisMonth = isFinance && month === loanMonths ? num(car.balloonPayment) : 0;
      const monthlyCarCost = monthlyRunning + loanPaymentThisMonth + balloonThisMonth;
      const monthlyInvestment = Math.max(0, num(assumptions.monthlyBudget) - monthlyCarCost);
      const monthlyDeficit = Math.max(0, monthlyCarCost - num(assumptions.monthlyBudget));
      investments += monthlyInvestment;
      monthlyInvestmentContributed += monthlyInvestment;
      budgetDeficit += monthlyDeficit;
      totalPaid += monthlyCarCost;
      runningPaid += monthlyRunning;
      loanPaid += loanPaymentThisMonth + balloonThisMonth;
      purchasePaid += loanPaymentThisMonth + balloonThisMonth;
      energyPaid += running.energy / 12;
      maintenancePaid += running.maintenance / 12;
      insurancePaid += running.insurance / 12;
      repairsPaid += running.repairs / 12;
      taxPaid += running.tax / 12;

      if (month % 12 === 0) {
        const year = month / 12;
        const carValueLeft = resaleValue(car, year);
        const loanStillOwed = isFinance ? loanBalance(car, month) : 0;
        yearly.push({
          year,
          finalMoneyLeft: investments + carValueLeft - loanStillOwed - budgetDeficit,
          investments,
          carValueLeft,
          loanStillOwed,
          totalPaid,
          budgetDeficit,
          averageMonthlyCarCost: month > 0 ? (totalPaid - month0Paid) / month : 0,
          averageMonthlyInvested: month > 0 ? monthlyInvestmentContributed / month : 0,
        });
      }
    }

    const carValueLeft = resaleValue(car, years);
    const loanStillOwed = isFinance ? loanBalance(car, months) : 0;
    const finalMoneyLeft = investments + carValueLeft - loanStillOwed - budgetDeficit;
    const totalKm = firstNumber(car.annualKm, assumptions.annualKm) * years;
    return {
      id: "",
      carKey: "",
      carName: car.name,
      mode,
      year: years,
      years,
      month0Paid,
      month0Invested: Math.max(0, num(assumptions.initialCashBudget) - month0Paid),
      month0Deficit: Math.max(0, month0Paid - num(assumptions.initialCashBudget)),
      finalMoneyLeft,
      investments,
      carValueLeft,
      loanStillOwed,
      totalPaid,
      budgetDeficit,
      averageMonthlyCarCost: months > 0 ? (totalPaid - month0Paid) / months : 0,
      averageMonthlyInvested: months > 0 ? monthlyInvestmentContributed / months : 0,
      purchasePaid,
      runningPaid,
      financingCost: isFinance ? finance.financingCost : 0,
      resaleValue: carValueLeft,
      ownershipCost: totalPaid + loanStillOwed - carValueLeft,
      costPerKm: totalKm > 0 ? (totalPaid + loanStillOwed - carValueLeft) / totalKm : 0,
      energyPaid,
      maintenancePaid,
      insurancePaid,
      repairsPaid,
      taxPaid,
      monthlyPaymentUsed: isFinance ? finance.monthlyPayment : 0,
      financeTotalPaid: isFinance ? finance.financeTotalPaid : 0,
      finance,
      running,
      yearly,
    };
  }

  function scenarioLabel(row) {
    const name = String(row.carName || "").trim() || "Custom vehicle";
    return `${name} ${row.mode === PAYMENT_MODES.upfront ? "upfront" : "finance"}`;
  }

  function bestByMoney(rows) {
    return rows.reduce((best, row) => (best && best.finalMoneyLeft >= row.finalMoneyLeft ? best : row), null);
  }

  function takeaway(row, winner, competitors) {
    const reasons = scenarioReasons(row, winner, competitors);
    if (reasons.length) return reasons[0];
    if (winner && row.id === winner.id) {
      if (row.mode === PAYMENT_MODES.finance && row.month0Invested > 0) return "Wins because cheap financing lets cash compound.";
      if (row.purchasePaid < Math.min(...competitors.filter((x) => x.id !== row.id).map((x) => x.purchasePaid))) return "Wins because low upfront leaves more invested.";
      return "Wins because it leaves the most money.";
    }
    const best = winner || row;
    if (row.energyPaid + row.repairsPaid > best.energyPaid + best.repairsPaid) return "Loses because fuel and repairs eat monthly budget.";
    if (row.ownershipCost < best.ownershipCost && row.finalMoneyLeft < best.finalMoneyLeft) return "Lower ownership cost, but worse net worth.";
    if (row.totalPaid > best.totalPaid) return "Loses because total paid is higher.";
    return "Leaves less money after investments, car value, and loan.";
  }

  function reasonForWinner(winner, rows) {
    if (!winner) return [];
    const rivals = rows.filter((row) => row.id !== winner.id);
    const nextBest = rivals.slice().sort((a, b) => b.finalMoneyLeft - a.finalMoneyLeft)[0];
    const reasons = [];
    if (winner.month0Invested > 0) reasons.push(`${formatEuro(winner.month0Invested)} invested at month 0`);
    if (winner.budgetDeficit === 0) reasons.push("monthly car cost stays inside the budget");
    if (nextBest && winner.investments > nextBest.investments) reasons.push("more investments left at the end");
    if (nextBest && winner.totalPaid < nextBest.totalPaid) reasons.push("lower total paid");
    if (nextBest && winner.carValueLeft > nextBest.carValueLeft) reasons.push("higher car value left");
    return reasons.slice(0, 4);
  }

  function scenarioReasons(row, winner, rows) {
    if (!row || !winner) return [];
    const rivals = (rows || []).filter((candidate) => candidate.id !== row.id);
    const benchmark = row.id === winner.id
      ? rivals.slice().sort((a, b) => b.finalMoneyLeft - a.finalMoneyLeft)[0]
      : winner;
    if (!benchmark) {
      return [`Leaves ${formatEuro(row.finalMoneyLeft)} after investments, car value, loan, and deficits.`];
    }

    const reasons = [];
    const isWinner = row.id === winner.id;
    const moneyDiff = row.finalMoneyLeft - benchmark.finalMoneyLeft;
    const pushMore = (field, label) => {
      const diff = row[field] - benchmark[field];
      if (Math.abs(diff) >= 1) reasons.push(`${label} ${formatEuro(Math.abs(diff))} ${diff > 0 ? "higher" : "lower"} than ${scenarioLabel(benchmark)}.`);
    };
    const pushLessCost = (field, label) => {
      const diff = benchmark[field] - row[field];
      if (Math.abs(diff) >= 1) reasons.push(`${label} ${formatEuro(Math.abs(diff))} ${diff > 0 ? "lower" : "higher"} than ${scenarioLabel(benchmark)}.`);
    };

    if (isWinner) {
      if (moneyDiff >= 1) reasons.push(`Leaves ${formatEuro(moneyDiff)} more final money than ${scenarioLabel(benchmark)}.`);
      if (row.month0Invested - benchmark.month0Invested >= 1) reasons.push(`Invests ${formatEuro(row.month0Invested - benchmark.month0Invested)} more at month 0.`);
      if (row.averageMonthlyInvested - benchmark.averageMonthlyInvested >= 1) reasons.push(`Invests about ${formatEuro(row.averageMonthlyInvested - benchmark.averageMonthlyInvested)} more each month.`);
      if (benchmark.energyPaid - row.energyPaid >= 1) reasons.push(`Fuel/energy is ${formatEuro(benchmark.energyPaid - row.energyPaid)} lower.`);
      if (benchmark.repairsPaid - row.repairsPaid >= 1) reasons.push(`Repairs are ${formatEuro(benchmark.repairsPaid - row.repairsPaid)} lower.`);
      if (row.carValueLeft - benchmark.carValueLeft >= 1) reasons.push(`Car value left is ${formatEuro(row.carValueLeft - benchmark.carValueLeft)} higher.`);
      if (benchmark.totalPaid - row.totalPaid >= 1) reasons.push(`Total paid is ${formatEuro(benchmark.totalPaid - row.totalPaid)} lower.`);
      if (benchmark.financingCost - row.financingCost >= 1) reasons.push(`Financing cost is ${formatEuro(benchmark.financingCost - row.financingCost)} lower.`);
      if (row.loanStillOwed === 0 && benchmark.loanStillOwed > 0) reasons.push("No loan remains at the selected year.");
      if (row.budgetDeficit === 0) reasons.push("Stays inside the monthly budget.");
      return reasons.slice(0, 5);
    }

    if (benchmark.finalMoneyLeft - row.finalMoneyLeft >= 1) reasons.push(`Leaves ${formatEuro(benchmark.finalMoneyLeft - row.finalMoneyLeft)} less final money than ${scenarioLabel(benchmark)}.`);
    if (benchmark.month0Invested - row.month0Invested >= 1) reasons.push(`Invests ${formatEuro(benchmark.month0Invested - row.month0Invested)} less at month 0.`);
    if (row.averageMonthlyCarCost - benchmark.averageMonthlyCarCost >= 1) reasons.push(`Monthly car cost is about ${formatEuro(row.averageMonthlyCarCost - benchmark.averageMonthlyCarCost)} higher.`);
    if (row.energyPaid - benchmark.energyPaid >= 1) reasons.push(`Fuel/energy costs ${formatEuro(row.energyPaid - benchmark.energyPaid)} more.`);
    if (row.repairsPaid - benchmark.repairsPaid >= 1) reasons.push(`Repairs cost ${formatEuro(row.repairsPaid - benchmark.repairsPaid)} more.`);
    if (benchmark.carValueLeft - row.carValueLeft >= 1) reasons.push(`Car value left is ${formatEuro(benchmark.carValueLeft - row.carValueLeft)} lower.`);
    if (row.totalPaid - benchmark.totalPaid >= 1) reasons.push(`Total paid is ${formatEuro(row.totalPaid - benchmark.totalPaid)} higher.`);
    if (row.financingCost - benchmark.financingCost >= 1) reasons.push(`Financing cost is ${formatEuro(row.financingCost - benchmark.financingCost)} higher.`);
    if (row.loanStillOwed - benchmark.loanStillOwed >= 1) reasons.push(`Loan still owed is ${formatEuro(row.loanStillOwed - benchmark.loanStillOwed)} higher.`);
    if (row.budgetDeficit - benchmark.budgetDeficit >= 1) reasons.push(`Budget deficits are ${formatEuro(row.budgetDeficit - benchmark.budgetDeficit)} higher.`);
    return reasons.slice(0, 5);
  }

  function formatEuro(value) {
    return `€${Math.round(num(value)).toLocaleString("en-IE")}`;
  }

  function analyze(input) {
    const assumptions = Object.assign({}, DEFAULT_ASSUMPTIONS, input && input.assumptions ? input.assumptions : {});
    const activeYear = selectedYear(assumptions);
    const cars = {
      car1: Object.assign({}, applyPreset("tesla_model_3_new"), clone(input && input.cars && input.cars.car1 ? input.cars.car1 : {})),
      car2: Object.assign({}, applyPreset("cheap_used_ev"), clone(input && input.cars && input.cars.car2 ? input.cars.car2 : {})),
    };
    const horizonResults = HORIZONS.map((year) => {
      const rows = [];
      Object.entries(cars).forEach(([carKey, car]) => {
        modesForCar(car).forEach((mode) => {
          const row = simulateScenario(car, assumptions, mode, year);
          row.carKey = carKey;
          row.id = `${carKey}_${mode}`;
          rows.push(row);
        });
      });
      const winner = bestByMoney(rows);
      rows.forEach((row) => {
        row.isWinner = winner && winner.id === row.id;
        row.takeaway = takeaway(row, winner, rows);
      });
      return { year, rows, winner, reason: reasonForWinner(winner, rows) };
    });
    const scenarios = {};
    horizonResults.forEach((horizon) => {
      horizon.rows.forEach((row) => {
        scenarios[row.id] = scenarios[row.id] || {
          id: row.id,
          carKey: row.carKey,
          carName: row.carName,
          mode: row.mode,
          horizons: {},
        };
        scenarios[row.id].horizons[horizon.year] = row;
      });
    });
    return {
      assumptions,
      cars,
      selectedYear: activeYear,
      selected: horizonResults.find((horizon) => horizon.year === activeYear),
      baseline: noCarBaseline(assumptions),
      scenarios: Object.values(scenarios),
      horizonResults,
      winners: Object.fromEntries(horizonResults.map((horizon) => [horizon.year, horizon.winner])),
    };
  }

  return {
    HORIZONS,
    PAYMENT_MODES,
    DEFAULT_ASSUMPTIONS,
    PRESETS,
    applyPreset,
    monthlyInvestmentRate,
    selectedYear,
    futureValue,
    futureValueMonthlyContribution,
    noCarBaseline,
    loanPayment,
    financeSummary,
    loanBalance,
    annualEnergyCost,
    weightedElectricityPrice,
    annualRunningBreakdown,
    resaleValue,
    modesForCar,
    simulateScenario,
    analyze,
    scenarioLabel,
    scenarioReasons,
  };
});
