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
    this.textContent = "";
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

const ids = ["setupInputs", "choiceInputs", "financeInputs", "runningInputs", "heroSummary", "warningBox", "primaryTable", "mobileResultCards"];
const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
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

function field(root, carKey, fieldName) {
  return root.children.find((child) => child.dataset.car === carKey && child.dataset.field === fieldName);
}

function assumption(fieldName) {
  return elements.setupInputs.children.find((child) => child.dataset.assumption === fieldName);
}

function output() {
  return [elements.heroSummary.innerHTML, elements.warningBox.innerHTML, elements.primaryTable.innerHTML, elements.mobileResultCards.innerHTML].join("\n");
}

assert.match(html, /id="setup"/);
assert.match(html, /id="cars"/);
assert.match(html, /id="payment"/);
assert.match(html, /id="costs"/);
assert.match(html, /id="results"/);
assert.doesNotMatch(html, /No Car Baseline|Charts|Quality|Preset|Balloon|Opening fee|Financed price|Explanation|Sensitivity|Car Comparison Inputs|Resale Values/i);
assert.doesNotMatch(html, /data-assumption="investmentReturn"/);
assert.match(elements.primaryTable.innerHTML, /Option/);
assert.match(elements.primaryTable.innerHTML, /Final money/);
assert.doesNotMatch(elements.primaryTable.innerHTML, /3y money left|5y money left|Car 1|Car 2|Custom/);

assert.ok(assumption("yearsOwned"), "years owned input should exist");
assert.ok(!assumption("investmentReturn"), "stock return input should be removed");

assert.ok(field(elements.financeInputs, "car1", "upfrontPrice"), "upfront mode shows upfront price");
assert.ok(!field(elements.financeInputs, "car1", "downPayment"), "upfront mode hides down payment");
assert.ok(!field(elements.financeInputs, "car1", "monthlyPayment"), "upfront mode hides monthly payment");
assert.ok(!field(elements.financeInputs, "car1", "loanMonths"), "upfront mode hides months");
assert.ok(field(elements.financeInputs, "car2", "upfrontPrice"), "finance mode shows cash price");
assert.ok(field(elements.financeInputs, "car2", "downPayment"), "finance mode shows down payment");
assert.ok(field(elements.financeInputs, "car2", "monthlyPayment"), "finance mode shows monthly payment");
assert.ok(field(elements.financeInputs, "car2", "loanMonths"), "finance mode shows months");

assert.ok(field(elements.runningInputs, "car1", "kwhPer100Km"), "EV shows electricity use");
assert.ok(!field(elements.runningInputs, "car1", "litersPer100Km"), "EV hides fuel use");
assert.ok(field(elements.runningInputs, "car2", "litersPer100Km"), "Hybrid shows fuel use");
assert.ok(!field(elements.runningInputs, "car2", "kwhPer100Km"), "Hybrid hides electricity use");

const beforeYear = output();
const resaleBefore = field(elements.runningInputs, "car1", "resaleValue").value;
assumption("yearsOwned").value = "20";
assumption("yearsOwned").dispatch("input", { target: assumption("yearsOwned") });
assert.notEqual(output(), beforeYear, "years owned should update visible results");
assert.notEqual(field(elements.runningInputs, "car1", "resaleValue").value, resaleBefore, "auto resale should update with years");
assert.match(elements.primaryTable.innerHTML, /Warning: loan not paid|Strong: low cost|Wins: more invested|Loses:/);

const car1Mode = field(elements.choiceInputs, "car1", "paymentMode");
car1Mode.value = "finance";
car1Mode.dispatch("input", { target: car1Mode });
assert.ok(field(elements.financeInputs, "car1", "downPayment"), "switching to finance shows finance fields");
assert.ok(field(elements.financeInputs, "car1", "monthlyPayment"), "switching to finance shows monthly payment");

const car1Type = field(elements.choiceInputs, "car1", "type");
car1Type.value = "combustion";
car1Type.dispatch("input", { target: car1Type });
assert.ok(field(elements.runningInputs, "car1", "litersPer100Km"), "combustion shows fuel field");
assert.ok(!field(elements.runningInputs, "car1", "kwhPer100Km"), "combustion hides EV field");
assert.match(elements.primaryTable.innerHTML, /Used EV finance/);

const name = field(elements.choiceInputs, "car1", "name");
name.value = "My actual car";
name.dispatch("input", { target: name });
assert.match(output(), /My actual car finance/);
assert.doesNotMatch(output(), /Car 1|Car 2|Custom/);

const highPayment = field(elements.financeInputs, "car1", "monthlyPayment");
highPayment.value = "3000";
highPayment.dispatch("input", { target: highPayment });
assert.match(elements.warningBox.innerHTML, /Monthly cost exceeds monthly budget/);

const highDown = field(elements.financeInputs, "car1", "downPayment");
highDown.value = "999999";
highDown.dispatch("input", { target: highDown });
assert.match(elements.warningBox.innerHTML, /Down payment exceeds initial cash/);
assert.match(elements.primaryTable.innerHTML, /status-no|No/);

const serialized = output() + elements.financeInputs.innerHTML + elements.runningInputs.innerHTML;
assert.doesNotMatch(serialized, /NaN|undefined|Infinity/);
assert.doesNotMatch(serialized, /<option[^>]*background:\s*black/i);
console.log("ok - dashboard smoke");
