const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class FakeElement {
  constructor(id = "", tagName = "DIV") {
    this.id = id;
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.value = "";
    this.type = "";
    this.listeners = {};
    this.attributes = {};
    this._innerHTML = "";
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = parseChildren(this._innerHTML);
  }
  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name].push(handler);
  }
  dispatch(name, event = { target: this }) {
    (this.listeners[name] || []).forEach((handler) => handler(event));
  }
  querySelectorAll(selector) {
    const attr = selector.match(/^\[([^=\]]+)(?:="([^"]+)")?\]$/);
    if (!attr) return [];
    const key = attr[1].startsWith("data-") ? toDatasetKey(attr[1]) : attr[1];
    const expected = attr[2];
    return this.children.filter((child) => key in child.dataset && (expected === undefined || child.dataset[key] === expected));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function toDatasetKey(attr) {
  return attr.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseChildren(html) {
  const children = [];
  const tagRe = /<(input|select)\b([^>]*)>/g;
  let match;
  while ((match = tagRe.exec(html))) {
    const el = new FakeElement("", match[1].toUpperCase());
    const attrs = match[2];
    const attrRe = /([a-zA-Z0-9:-]+)(?:="([^"]*)")?/g;
    let attr;
    while ((attr = attrRe.exec(attrs))) {
      const name = attr[1];
      const value = attr[2] === undefined ? "" : attr[2];
      if (name.startsWith("data-")) el.dataset[toDatasetKey(name)] = value;
      if (name === "value") el.value = value;
      if (name === "type") el.type = value;
    }
    children.push(el);
  }
  return children;
}

const ids = [
  "setupInputs", "baselineTable", "choiceInputs", "financeInputs", "runningInputs", "resaleInputs", "qualityInputs",
  "heroSummary", "winnerCards", "winnerReasons", "warningBox", "primaryTable", "secondaryTable", "mobileResultCards", "summarySteps",
  "moneyChart", "investmentChart", "paidChart", "legend1", "legend2", "legend3", "sensitivityBox",
];
const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id, id.includes("Chart") ? "SVG" : "DIV")]));
const document = {
  getElementById(id) {
    if (!elements[id]) elements[id] = new FakeElement(id);
    return elements[id];
  },
};
const context = { window: null, document, console, structuredClone: (value) => JSON.parse(JSON.stringify(value)), Intl };
context.window = context;
context.globalThis = context;
vm.createContext(context);

const html = fs.readFileSync("dashboard.html", "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert.equal(scripts.length, 2);
scripts.forEach((script) => vm.runInContext(script, context));

assert.match(elements.baselineTable.innerHTML, /No|Final baseline wealth|Baseline/i);
assert.match(elements.primaryTable.innerHTML, /3y money left/);
assert.match(elements.primaryTable.innerHTML, /Takeaway/);
assert.match(elements.secondaryTable.innerHTML, /Purchase paid/);
assert.match(elements.primaryTable.innerHTML, /title="Investments \+ resale value - loan owed - deficits\."/);
assert.match(elements.winnerCards.innerHTML, /Selected winner/);
assert.match(elements.winnerReasons.innerHTML, /wins at 10 years because/);
assert.match(elements.summarySteps.innerHTML, /The 10 year winner is/);
assert.match(elements.sensitivityBox.innerHTML, /stock return|km\/year|Fuel|Resale/);
assert.ok(elements.moneyChart.innerHTML.includes("<path"));
assert.ok(elements.moneyChart.innerHTML.includes("stroke-dasharray"));
assert.ok(elements.investmentChart.innerHTML.includes("<path"));
assert.ok(elements.paidChart.innerHTML.includes("<path"));
assert.doesNotMatch(elements.primaryTable.innerHTML, /Car 1|Car 2/);

Object.entries(elements).forEach(([id, el]) => {
  assert.doesNotMatch(el.innerHTML, /NaN|undefined/, `${id} should not show broken values`);
});

const presetInputs = elements.choiceInputs.querySelectorAll("[data-preset]");
assert.equal(presetInputs.length, 2);
presetInputs[1].value = "tesla_model_3_used";
presetInputs[1].dispatch("input", { target: presetInputs[1] });
assert.match(elements.primaryTable.innerHTML, /Tesla Model 3 Used/);

const typeInputs = elements.choiceInputs.querySelectorAll('[data-field="type"]');
typeInputs[1].value = "combustion";
typeInputs[1].dispatch("input", { target: typeInputs[1] });
assert.match(elements.runningInputs.innerHTML, /data-car="car2" data-field="litersPer100Km"/);
assert.doesNotMatch(elements.runningInputs.innerHTML, /data-car="car2" data-field="kwhPer100Km"/);
typeInputs[1].value = "electric";
typeInputs[1].dispatch("input", { target: typeInputs[1] });
assert.match(elements.runningInputs.innerHTML, /data-car="car2" data-field="kwhPer100Km"/);

const initial = elements.primaryTable.innerHTML;
const paymentModeInputs = elements.choiceInputs.querySelectorAll('[data-field="paymentMode"]');
assert.equal(paymentModeInputs.length, 2);
paymentModeInputs[0].value = "upfront";
paymentModeInputs[0].dispatch("input", { target: paymentModeInputs[0] });
paymentModeInputs[1].value = "finance";
paymentModeInputs[1].dispatch("input", { target: paymentModeInputs[1] });
assert.notEqual(elements.primaryTable.innerHTML, initial);
assert.match(elements.primaryTable.innerHTML, /Tesla Model 3 New upfront/);
assert.doesNotMatch(elements.primaryTable.innerHTML, /Tesla Model 3 New finance/);
assert.match(elements.primaryTable.innerHTML, /Tesla Model 3 Used finance/);
assert.doesNotMatch(elements.primaryTable.innerHTML, /Tesla Model 3 Used upfront/);

const returnInput = elements.setupInputs.querySelector('[data-assumption="investmentReturn"]');
returnInput.value = "10";
returnInput.dispatch("input", { target: returnInput });

const upfrontPrice = elements.financeInputs.querySelector('[data-field="upfrontPrice"]');
upfrontPrice.value = "37000";
upfrontPrice.dispatch("input", { target: upfrontPrice });

function field(root, carKey, fieldName) {
  return root.children.find((child) => child.dataset.car === carKey && child.dataset.field === fieldName);
}

function resale(root, carKey, year) {
  return root.children.find((child) => child.dataset.car === carKey && child.dataset.resale === String(year));
}

function changeAndExpectOutputChange(input, value, label) {
  assert.ok(input, `${label} input should exist`);
  const before = elements.primaryTable.innerHTML + elements.secondaryTable.innerHTML + elements.summarySteps.innerHTML + elements.moneyChart.innerHTML;
  input.value = String(value);
  input.dispatch("input", { target: input });
  const after = elements.primaryTable.innerHTML + elements.secondaryTable.innerHTML + elements.summarySteps.innerHTML + elements.moneyChart.innerHTML;
  assert.notEqual(after, before, `${label} should update dependent outputs`);
}

changeAndExpectOutputChange(elements.setupInputs.querySelector('[data-assumption="initialCashBudget"]'), 50000, "initial cash");
changeAndExpectOutputChange(elements.setupInputs.querySelector('[data-assumption="monthlyBudget"]'), 450, "monthly budget");
changeAndExpectOutputChange(field(elements.financeInputs, "car2", "downPayment"), 9000, "down payment");
changeAndExpectOutputChange(field(elements.financeInputs, "car2", "monthlyPayment"), 375, "monthly payment");
changeAndExpectOutputChange(field(elements.financeInputs, "car2", "loanMonths"), 72, "loan months");
changeAndExpectOutputChange(field(elements.financeInputs, "car2", "openingFee"), 200, "opening fee");
changeAndExpectOutputChange(field(elements.financeInputs, "car2", "balloonPayment"), 1000, "balloon payment");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "homeElectricityPrice"), 0.1, "home electricity price");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "kwhPer100Km"), 18, "kWh per 100km");
changeAndExpectOutputChange(elements.setupInputs.querySelector('[data-assumption="annualKm"]'), 35000, "annual km");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "publicChargingPct"), 50, "public charging split");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "homeChargingPct"), 50, "home charging split");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "publicElectricityPrice"), 0.5, "public electricity price");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "annualMaintenance"), 800, "maintenance");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "annualInsurance"), 900, "insurance");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "annualRepairs"), 600, "repairs");
changeAndExpectOutputChange(field(elements.runningInputs, "car1", "annualTax"), 120, "tax");
changeAndExpectOutputChange(resale(elements.resaleInputs, "car1", 7), 18000, "resale values");

const secondPreset = elements.choiceInputs.querySelectorAll("[data-preset]")[1];
secondPreset.value = "cheap_used_combustion";
secondPreset.dispatch("input", { target: secondPreset });
changeAndExpectOutputChange(field(elements.runningInputs, "car2", "litersPer100Km"), 8, "L per 100km");
changeAndExpectOutputChange(field(elements.runningInputs, "car2", "fuelPrice"), 2.1, "fuel price");

const analysisYears = elements.setupInputs.querySelector('[data-assumption="analysisYears"]');
const chartBeforeYearChange = elements.moneyChart.innerHTML;
analysisYears.value = "7";
analysisYears.dispatch("input", { target: analysisYears });
assert.match(elements.primaryTable.innerHTML, /Investments \(7y\)/);
assert.match(elements.secondaryTable.innerHTML, /Resale value/);
assert.match(elements.winnerReasons.innerHTML, /wins at 7 years because/);
assert.match(elements.summarySteps.innerHTML, /The 7 year winner is/);
assert.notEqual(elements.moneyChart.innerHTML, chartBeforeYearChange);
analysisYears.value = "3";
analysisYears.dispatch("input", { target: analysisYears });
assert.match(elements.primaryTable.innerHTML, /Investments \(3y\)/);
assert.match(elements.summarySteps.innerHTML, /The 3 year winner is/);

const allEditableSelectors = [
  '[data-assumption="initialCashBudget"]',
  '[data-assumption="monthlyBudget"]',
  '[data-assumption="investmentReturn"]',
  '[data-assumption="annualKm"]',
  '[data-field="name"]',
  '[data-field="paymentMode"]',
  '[data-field="upfrontPrice"]',
  '[data-field="downPayment"]',
  '[data-field="monthlyPayment"]',
  '[data-field="loanMonths"]',
  '[data-field="openingFee"]',
  '[data-field="balloonPayment"]',
  '[data-field="kwhPer100Km"]',
  '[data-field="annualMaintenance"]',
  '[data-field="annualInsurance"]',
  '[data-field="annualRepairs"]',
  '[data-field="annualTax"]',
  '[data-resale="3"]',
];
allEditableSelectors.forEach((selector) => {
  const roots = Object.values(elements);
  const input = roots.map((root) => root.querySelector(selector)).find(Boolean);
  assert.ok(input, `${selector} should exist`);
});

const output = Object.values(elements).map((el) => el.innerHTML).join("\n");
assert.doesNotMatch(output, /NaN|undefined/);
assert.doesNotMatch(output, /Financed price/);
console.log("ok - dashboard smoke");
