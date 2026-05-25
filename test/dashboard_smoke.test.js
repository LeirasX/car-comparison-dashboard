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
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
    };
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = parseChildren(this._innerHTML);
  }
  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { document.activeElement = this; }
  blur() {
    if (document.activeElement === this) document.activeElement = null;
  }
  select() {
    document.activeElement = this;
    this.selectionStart = 0;
    this.selectionEnd = String(this.value).length;
  }
  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
  addEventListener(name, handler) {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name].push(handler);
  }
  dispatch(name, event = { target: this }) {
    (this.listeners[name] || []).forEach((handler) => handler(event));
  }
  querySelectorAll(selector) {
    const selectors = selector.split(",").map((part) => part.trim()).filter(Boolean);
    const results = [];
    selectors.forEach((part) => {
      const attrs = [...part.matchAll(/\[([^=\]]+)(?:="([^"]+)")?\]/g)];
      if (!attrs.length || attrs.map((match) => match[0]).join("") !== part) return;
      this.children.forEach((child) => {
        const matches = attrs.every((attr) => {
          const key = attr[1].startsWith("data-") ? toDatasetKey(attr[1]) : attr[1];
          const expected = attr[2];
          return key in child.dataset && (expected === undefined || child.dataset[key] === expected);
        });
        if (matches && !results.includes(child)) results.push(child);
      });
    });
    return results;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function toDatasetKey(attr) {
  return attr.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseChildren(html) {
  const children = [];
  const tagRe = /<(input|select|button)\b([^>]*)>([^<]*)/g;
  let match;
  while ((match = tagRe.exec(html))) {
    const el = new FakeElement("", match[1].toUpperCase());
    const attrs = match[2];
    el.textContent = match[3] || "";
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

const ids = ["setupInputs", "choiceInputs", "financeInputs", "runningInputs", "heroSummary", "rankingPanel", "rankingTools", "rankingTable", "rankingSummary", "rankingClose", "rankingSearch", "toast", "warningBox", "primaryTable", "mobileResultCards"];
const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
const document = {
  activeElement: null,
  getElementById(id) {
    if (!elements[id]) elements[id] = new FakeElement(id);
    return elements[id];
  },
  querySelectorAll(selector) {
    return Object.values(elements).flatMap((element) => element.querySelectorAll(selector));
  },
};
const context = { window: null, document, console, structuredClone: (value) => JSON.parse(JSON.stringify(value)), Intl, setTimeout, clearTimeout };
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

function market(fieldName) {
  return elements.runningInputs.children.find((child) => child.dataset.market === fieldName);
}

function carSearch(carKey) {
  return elements.choiceInputs.children.find((child) => child.dataset.carSearch === carKey);
}

function carToggle(carKey) {
  return elements.choiceInputs.children.find((child) => child.dataset.carSelectToggle === carKey);
}

function carOption(carKey, modelId) {
  return elements.choiceInputs.children.find((child) => child.dataset.carOption === carKey && child.dataset.modelId === modelId);
}

function rankingFilter(fieldName) {
  return elements.rankingTools.children.find((child) => child.dataset.rankingFilter === fieldName);
}

function rankingSort(fieldName) {
  return elements.rankingTable.children.find((child) => child.dataset.rankingSort === fieldName);
}

function rankingPage(action) {
  return elements.rankingTable.children.find((child) => child.dataset.rankingPage === action);
}

function score(carKey, fieldName) {
  return elements.runningInputs.children.find((child) => child.dataset.car === carKey && child.dataset.score === fieldName);
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
assert.match(html, /<main>\s*<section id="rankingPanel"[\s\S]*?<\/section>\s*<div id="warningBox" class="warnings" aria-live="polite"><\/div>\s*<details id="setup"/);
assert.doesNotMatch(html, /No Car Baseline|Charts|Preset|Balloon|Opening fee|Financed price|Explanation|Sensitivity|Car Comparison Inputs|Resale Values/i);
assert.doesNotMatch(html, /data-assumption="investmentReturn"/);
assert.doesNotMatch(html, /stock return|Reset type defaults|Public %|Home %|Public €\/kWh|Home €\/kWh/i);
assert.match(html, /mouseenter/);
assert.match(html, /mouseleave/);
assert.match(html, /pointerdown/);
assert.match(elements.primaryTable.innerHTML, /Option/);
assert.match(elements.primaryTable.innerHTML, /Car\/month[\s\S]*Car total[\s\S]*Costs\/month[\s\S]*Costs total[\s\S]*Total paid[\s\S]*Net worth/);
assert.doesNotMatch(elements.primaryTable.innerHTML, /Possible\?|Invested result|Investments result|Resale value|Loan left|Summary|Final money|Resale estimated|3y money left|5y money left|Car 1|Car 2|Custom/);
assert.equal((elements.heroSummary.innerHTML.match(/class="hero-metric/g) || []).length, 3);
assert.match(elements.heroSummary.innerHTML, /Winner/);
assert.match(elements.heroSummary.innerHTML, /Cost difference/);
assert.match(elements.heroSummary.innerHTML, /Net worth difference/);
assert.match(html, /data-rank-toggle[\s\S]*Rank/);
assert.match(elements.heroSummary.innerHTML, /[-+]\d+(?:\.\d)?%/);
assert.doesNotMatch(elements.heroSummary.innerHTML, /Warnings|Clean run|Check inputs|Final money|wins with|€[0-9,]+ vs|Difference[\s\S]*€[0-9,]+/);
const defaultResult = context.CarCompareModel.analyze({
  assumptions: context.CarCompareModel.DEFAULT_ASSUMPTIONS,
  cars: {
    car1: context.CarCompareModel.defaultCar("car1"),
    car2: context.CarCompareModel.defaultCar("car2"),
  },
});
const expectedCostPct = (defaultResult.winner.totalPaid - defaultResult.runnerUp.totalPaid) / Math.abs(defaultResult.runnerUp.totalPaid) * 100;
const expectedNetPct = (defaultResult.winner.finalMoney - defaultResult.runnerUp.finalMoney) / Math.abs(defaultResult.runnerUp.finalMoney) * 100;
assert.match(elements.heroSummary.innerHTML, new RegExp(`${expectedCostPct >= 0 ? "\\+" : ""}${expectedCostPct.toLocaleString("en-IE", { maximumFractionDigits:1 })}%`));
assert.match(elements.heroSummary.innerHTML, new RegExp(`${expectedNetPct >= 0 ? "\\+" : ""}${expectedNetPct.toLocaleString("en-IE", { maximumFractionDigits:1 })}%`));
assert.match(context.helpText("heroWinner"), /(Tesla Model 3 2021|Volkswagen Golf 2021) upfront leaves €[\d,]+ after 7 years/);
assert.match(context.helpText("heroWinner"), /(Tesla Model 3 2021|Volkswagen Golf 2021) upfront leaves €[\d,]+/);
assert.match(context.helpText("heroWinner"), /Total paid:/);
assert.doesNotMatch(context.helpText("heroWinner"), /Car 1|Car 2/);
assert.match(html, /heroComparisonText/);
assert.match(html, /winner\.finalMoney/);
assert.match(html, /other\.finalMoney/);
assert.match(html, /winner\.totalPaid/);
assert.match(html, /other\.totalPaid/);

assert.ok(assumption("yearsOwned"), "years owned input should exist");
assert.ok(!assumption("investmentReturn"), "old stock return input should be removed");
assert.equal(assumption("initialCashBudget").value, "20000");
assert.equal(assumption("monthlyBudget").value, "300");
assert.equal(assumption("yearsOwned").value, "7");
assert.equal(assumption("annualKm").value, "15000");

assert.ok(field(elements.financeInputs, "car1", "upfrontPrice"), "upfront mode shows upfront price");
assert.ok(!field(elements.financeInputs, "car1", "downPayment"), "upfront mode hides down payment");
assert.ok(!field(elements.financeInputs, "car1", "monthlyPayment"), "upfront mode hides monthly payment");
assert.ok(!field(elements.financeInputs, "car1", "loanMonths"), "upfront mode hides months");
assert.ok(field(elements.financeInputs, "car2", "upfrontPrice"), "upfront mode shows upfront price");
assert.ok(!field(elements.financeInputs, "car2", "downPayment"), "upfront mode hides down payment");
assert.ok(!field(elements.financeInputs, "car2", "monthlyPayment"), "upfront mode hides monthly payment");
assert.ok(!field(elements.financeInputs, "car2", "loanMonths"), "upfront mode hides months");

assert.ok(field(elements.runningInputs, "car1", "kwhPer100Km"), "EV shows electricity use");
assert.ok(!field(elements.runningInputs, "car1", "litersPer100Km"), "EV hides fuel use");
assert.ok(!field(elements.runningInputs, "car1", "homeChargingPct"), "EV hides home charging percent");
assert.ok(!field(elements.runningInputs, "car1", "publicChargingPct"), "EV hides public charging percent");
assert.ok(field(elements.runningInputs, "car2", "litersPer100Km"), "Combustion shows fuel use");
assert.ok(!field(elements.runningInputs, "car2", "kwhPer100Km"), "Combustion hides electricity use");
assert.ok(field(elements.choiceInputs, "car1", "modelId"), "car1 model selector should exist");
assert.ok(field(elements.choiceInputs, "car2", "modelId"), "car2 model selector should exist");
assert.ok(field(elements.choiceInputs, "car1", "carValue"), "car1 car value should exist");
assert.ok(field(elements.choiceInputs, "car2", "carValue"), "car2 car value should exist");
assert.ok(!field(elements.choiceInputs, "car1", "customName"), "custom name field should be removed");
assert.ok(!field(elements.choiceInputs, "car2", "customName"), "custom name field should be removed");
assert.match(elements.choiceInputs.innerHTML, /data-car-select-toggle="car1"[\s\S]*Tesla Model 3/);
assert.match(elements.choiceInputs.innerHTML, /data-car-select-toggle="car2"[\s\S]*Volkswagen Golf/);
assert.ok(!carSearch("car1"), "closed selector hides search");
assert.ok(carToggle("car1"), "car selector trigger exists");
carToggle("car1").dispatch("click", { target: carToggle("car1") });
assert.ok(carSearch("car1"), "open selector shows search");
assert.match(elements.choiceInputs.innerHTML, /City car|Supermini|Hatchback|Sports car/);
const selectorSearch = carSearch("car1");
selectorSearch.value = "Toyota Corolla";
selectorSearch.dispatch("input", { target: selectorSearch });
assert.match(elements.choiceInputs.innerHTML, /Toyota Corolla/);
const selectorSearchDiesel = carSearch("car1");
selectorSearchDiesel.value = "diesel";
selectorSearchDiesel.dispatch("input", { target: selectorSearchDiesel });
assert.match(elements.choiceInputs.innerHTML, /Volkswagen Passat|Toyota Hilux|diesel/i, "selector filters by fuel/category text");
const selectorSearchReset = carSearch("car1");
selectorSearchReset.value = "\"><img src=x onerror=alert(1)>";
selectorSearchReset.dispatch("input", { target: selectorSearchReset });
assert.doesNotMatch(elements.choiceInputs.innerHTML, /<img/i, "search value should be escaped");
const selectorSearchAfterXss = carSearch("car1");
selectorSearchReset.value = "";
selectorSearchAfterXss.value = "";
selectorSearchAfterXss.dispatch("input", { target: selectorSearchAfterXss });
context.toggleModelDropdown("car1", false);
assert.ok(!carSearch("car1"), "closing selector removes search");
assert.match(elements.choiceInputs.innerHTML, /aria-label="Choose car model"/);
assert.match(elements.choiceInputs.innerHTML, /id="car1-paymentMode"[\s\S]*value="upfront" selected/);
assert.match(elements.choiceInputs.innerHTML, /id="car2-paymentMode"[\s\S]*value="upfront" selected/);
assert.equal(field(elements.choiceInputs, "car1", "carValue").value, "28000");
assert.equal(field(elements.choiceInputs, "car2", "carValue").value, "15500");
assert.equal(field(elements.financeInputs, "car1", "upfrontPrice").value, "28000");
assert.equal(field(elements.financeInputs, "car2", "upfrontPrice").value, "15500");
assert.match(elements.financeInputs.innerHTML, /data-offer-action="save"/);
assert.match(elements.financeInputs.innerHTML, /data-offer-action="reset"/);
assert.doesNotMatch(elements.financeInputs.innerHTML + html, /Finance total|Finance cost/);
assert.match(elements.runningInputs.innerHTML, /Market/);
assert.match(elements.runningInputs.innerHTML, /Car/);
assert.match(elements.runningInputs.innerHTML, /Scores/);
assert.ok(market("fuelPrice"), "market fuel price exists");
assert.ok(market("electricityPrice"), "market electricity price exists");
assert.ok(market("marketReturn"), "market return exists");
assert.ok(!market("homeElectricityPrice"), "old home electricity price removed");
assert.ok(!market("publicElectricityPrice"), "old public electricity price removed");
assert.ok(score("car1", "reliability"), "score fields exist");
assert.ok(score("car1", "drivingEnjoyment"), "driving score exists");
assert.ok(!score("car1", "quality"), "quality score removed");
assert.ok(!score("car1", "ownershipConfidence"), "ownership confidence score removed");
assert.match(elements.runningInputs.innerHTML, /Electricity:/);
assert.match(elements.runningInputs.innerHTML, /Fuel:/);
assert.match(elements.runningInputs.innerHTML, /Monthly running:/);
assert.match(elements.runningInputs.innerHTML, /Annual running:/);
assert.doesNotMatch(elements.runningInputs.innerHTML, /high confidence|medium confidence|low confidence|>estimated<|Retention:|Depreciation:|>Custom</);
assert.doesNotMatch(output(), /Car 1|Car 2/);
assert.equal(elements.rankingPanel.hidden, true, "ranking starts closed");
context.toggleRanking(true);
assert.equal(elements.rankingPanel.hidden, false, "ranking opens");
assert.match(elements.rankingTable.innerHTML, /Rank[\s\S]*Car[\s\S]*Category[\s\S]*Total paid[\s\S]*Net worth[\s\S]*Score/);
assert.doesNotMatch(elements.rankingTable.innerHTML, /Car value|Running\/month/);
assert.doesNotMatch(elements.rankingTable.innerHTML, /NaN|undefined|Infinity/);
assert.match(elements.rankingSummary.textContent, /Showing 250|No matches/);
assert.ok(rankingFilter("search"), "ranking search exists");
assert.ok(!rankingFilter("category"), "category filter should be removed");
assert.ok(!rankingFilter("brand"), "brand filter should be removed");
assert.ok(!rankingFilter("powertrain"), "type filter should be removed");
assert.ok(!rankingFilter("model"), "model filter should be removed");
const defaultOrdering = context.CarCompareModel.rankCarDatabase(context.CarCompareModel.DEFAULT_ASSUMPTIONS);
const rankedTeslaY = defaultOrdering.find((row) => row.carName === "Tesla Model Y 2022");
const rankingSearchInput = rankingFilter("search");
rankingSearchInput.focus();
for (const char of "Tesla Model Y 2022") {
  rankingSearchInput.value += char;
  rankingSearchInput.selectionStart = rankingSearchInput.value.length;
  rankingSearchInput.dispatch("input", { target: rankingSearchInput });
  assert.equal(document.activeElement, rankingSearchInput, "ranking search keeps focus while typing");
}
assert.match(elements.rankingTable.innerHTML, /Tesla/);
assert.doesNotMatch(elements.rankingTable.innerHTML, /Peugeot 206/);
assert.match(elements.rankingTable.innerHTML, new RegExp(`#${rankedTeslaY.globalRank}`), "search keeps global rank");
assert.doesNotMatch(elements.rankingTable.innerHTML, />#1<\/td>[\s\S]*Tesla Model Y/, "search should not renumber filtered row");
while (rankingSearchInput.value) {
  rankingSearchInput.value = rankingSearchInput.value.slice(0, -1);
  rankingSearchInput.selectionStart = rankingSearchInput.value.length;
  rankingSearchInput.dispatch("input", { target: rankingSearchInput });
  assert.equal(document.activeElement, rankingSearchInput, "ranking search keeps focus while deleting");
}
rankingSearchInput.value = "BMW";
rankingSearchInput.dispatch("input", { target: rankingSearchInput });
assert.match(elements.rankingTable.innerHTML, /BMW/);
assert.doesNotMatch(elements.rankingTable.innerHTML, /Toyota Corolla/);
rankingSearchInput.value = "";
rankingSearchInput.dispatch("input", { target: rankingSearchInput });
rankingSearchInput.value = "Tesla";
rankingSearchInput.dispatch("input", { target: rankingSearchInput });
assert.match(elements.rankingTable.innerHTML, /Tesla/);
rankingSearchInput.dispatch("keydown", { target: rankingSearchInput, key: "Enter" });
assert.notEqual(document.activeElement, rankingSearchInput, "enter blurs ranking search");
rankingSearchInput.focus();
rankingSearchInput.value = "";
rankingSearchInput.dispatch("input", { target: rankingSearchInput });
assert.ok(rankingPage("more"), "show more button exists");
rankingPage("more").dispatch("click", { target: rankingPage("more") });
assert.match(elements.rankingSummary.textContent, /Showing 500/);
assert.ok(rankingPage("all"), "show all button exists");
rankingPage("all").dispatch("click", { target: rankingPage("all") });
assert.match(elements.rankingSummary.textContent, new RegExp(`Showing ${context.CarCompareModel.CAR_DATABASE.length}`));
rankingSort("totalPaid").dispatch("click", { target: rankingSort("totalPaid") });
const totalPaidAscFirstRank = elements.rankingTable.innerHTML.match(/<tbody>[\s\S]*?<td>#(\d+)<\/td>/)?.[1];
assert.equal(totalPaidAscFirstRank, "1", "total paid sorting updates rank numbers");
rankingSort("finalMoney").dispatch("click", { target: rankingSort("finalMoney") });
const netWorthFirstRank = elements.rankingTable.innerHTML.match(/<tbody>[\s\S]*?<td>#(\d+)<\/td>/)?.[1];
assert.equal(netWorthFirstRank, "1", "net worth sorting updates rank numbers");
rankingSort("score").dispatch("click", { target: rankingSort("score") });
const scoreFirstRank = elements.rankingTable.innerHTML.match(/<tbody>[\s\S]*?<td>#(\d+)<\/td>/)?.[1];
assert.equal(scoreFirstRank, "1", "score sorting updates rank numbers");
const scoreOrderedTeslaY = context.CarCompareModel.rankCarDatabase(context.CarCompareModel.DEFAULT_ASSUMPTIONS)
  .slice()
  .sort((a, b) => b.qualityScore - a.qualityScore || a.carName.localeCompare(b.carName))
  .map((row, index) => Object.assign({}, row, { globalRank: index + 1 }))
  .find((row) => row.carName === "Tesla Model Y 2022");
rankingSearchInput.value = "Tesla Model Y 2022";
rankingSearchInput.dispatch("input", { target: rankingSearchInput });
assert.match(elements.rankingTable.innerHTML, new RegExp(`#${scoreOrderedTeslaY.globalRank}`), "search preserves score-sort rank");
rankingSearchInput.value = "";
rankingSearchInput.dispatch("input", { target: rankingSearchInput });
const rankingBeforeSetupChange = elements.rankingTable.innerHTML;
assumption("annualKm").value = "30000";
assumption("annualKm").dispatch("input", { target: assumption("annualKm") });
assert.notEqual(elements.rankingTable.innerHTML, rankingBeforeSetupChange, "ranking updates when setup values change");
context.toggleRanking(false);
assert.equal(elements.rankingPanel.hidden, true, "ranking closes");

const maintenanceBeforePriceEdit = field(elements.runningInputs, "car1", "annualMaintenance").value;
const car1Price = field(elements.financeInputs, "car1", "upfrontPrice");
car1Price.value = "20000";
car1Price.dispatch("input", { target: car1Price });
assert.equal(field(elements.runningInputs, "car1", "annualMaintenance").value, maintenanceBeforePriceEdit, "price edit should not reset model costs");
assert.equal(field(elements.choiceInputs, "car1", "carValue").value, "28000", "offer price edit should not reset car value");

context.saveOffer("car1");
assert.equal(elements.toast.textContent, "Saved", "save gives feedback");
car1Price.value = "21000";
car1Price.dispatch("input", { target: car1Price });
context.resetOffer("car1");
assert.equal(elements.toast.textContent, "Reset", "reset gives feedback");
assert.equal(field(elements.financeInputs, "car1", "upfrontPrice").value, "28000", "reset restores default offer only");
assert.equal(field(elements.runningInputs, "car1", "annualMaintenance").value, maintenanceBeforePriceEdit, "reset does not overwrite model costs");
const freshCar1Price = field(elements.financeInputs, "car1", "upfrontPrice");
freshCar1Price.value = "20000";
freshCar1Price.dispatch("input", { target: freshCar1Price });
context.saveOffer("car1");

context.selectModel("car2", "tesla-model-3");
const car2Price = field(elements.financeInputs, "car2", "upfrontPrice");
car2Price.value = "28800";
car2Price.dispatch("input", { target: car2Price });
assert.match(output(), /Tesla Model 3 2021 upfront[\s\S]*Tesla Model 3 2021 upfront/);
assert.equal(field(elements.financeInputs, "car1", "upfrontPrice").value, "20000");
assert.equal(field(elements.financeInputs, "car2", "upfrontPrice").value, "28800");

const beforeYear = output();
const resaleBefore = field(elements.runningInputs, "car1", "resaleValue").value;
assumption("yearsOwned").value = "20";
assumption("yearsOwned").dispatch("input", { target: assumption("yearsOwned") });
assert.notEqual(output(), beforeYear, "years owned should update visible results");
assert.notEqual(field(elements.runningInputs, "car1", "resaleValue").value, resaleBefore, "auto resale should update with years");
assert.doesNotMatch(elements.warningBox.innerHTML + elements.primaryTable.innerHTML, /Resale estimated/);
assert.match(context.helpText("heroWinner"), /after 20 years/);

const car1Mode = field(elements.choiceInputs, "car1", "paymentMode");
car1Mode.value = "finance";
car1Mode.dispatch("input", { target: car1Mode });
assert.ok(field(elements.financeInputs, "car1", "downPayment"), "switching to finance shows finance fields");
assert.ok(field(elements.financeInputs, "car1", "monthlyPayment"), "switching to finance shows monthly payment");

const focusedMonthly = field(elements.financeInputs, "car1", "monthlyPayment");
focusedMonthly.focus();
focusedMonthly.value = "12345";
focusedMonthly.dispatch("input", { target: focusedMonthly });
assert.equal(document.activeElement, focusedMonthly, "finance input keeps focus while typing");
assert.ok(elements.financeInputs.children.includes(focusedMonthly), "finance input is not remounted while typing");

context.selectModel("car1", "toyota-corolla");
assert.ok(field(elements.runningInputs, "car1", "litersPer100Km"), "combustion shows fuel field");
assert.ok(!field(elements.runningInputs, "car1", "kwhPer100Km"), "combustion hides EV field");
assert.match(elements.primaryTable.innerHTML, /Toyota Corolla 2021 finance/);
assert.doesNotMatch(output(), /Car 1|Car 2|Custom/);
assert.match(context.helpText("heroWinner"), /(Toyota Corolla 2021|Tesla Model 3 2021|Volkswagen Golf 2021) finance/);
assert.doesNotMatch(context.helpText("heroWinner"), /Car 1|Car 2/);

const highPayment = field(elements.financeInputs, "car1", "monthlyPayment");
highPayment.focus();
highPayment.value = "3000";
highPayment.dispatch("input", { target: highPayment });
assert.equal(document.activeElement, highPayment, "monthly payment keeps focus after live recalculation");
assert.match(elements.warningBox.innerHTML, /Monthly cost exceeds monthly budget/);
assert.doesNotMatch(elements.heroSummary.innerHTML, /Warnings|Clean run|Check inputs/);
assert.doesNotMatch(elements.warningBox.innerHTML, /Toyota Corolla finance:/);
assert.match(context.helpText("car1.monthlyPayment"), /Toyota Corolla 2021 finance payment is €3,000\/month/);
const fuelPrice = market("fuelPrice");
fuelPrice.focus();
fuelPrice.value = "2.5";
fuelPrice.dispatch("input", { target: fuelPrice });
assert.equal(document.activeElement, fuelPrice, "running cost input keeps focus while typing");
assert.ok(elements.runningInputs.children.includes(fuelPrice), "running cost input is not remounted while typing");
assert.match(context.helpText("fuelPrice"), /€2\.50\/L/);
assert.match(context.helpText("costs"), /Toyota Corolla 2021 running cost is €[\d,]+\/month/);

const taxInput = field(elements.runningInputs, "car1", "annualTax");
taxInput.focus();
taxInput.value = "";
taxInput.dispatch("input", { target: taxInput });
assert.equal(document.activeElement, taxInput, "temporarily empty input keeps focus");
assert.doesNotMatch(output(), /NaN|undefined|Infinity/);
taxInput.value = "0";
taxInput.dispatch("input", { target: taxInput });
assert.equal(document.activeElement, taxInput, "0 input keeps focus");

const decimalInput = field(elements.runningInputs, "car1", "litersPer100Km");
decimalInput.focus();
decimalInput.value = "1.75";
decimalInput.dispatch("input", { target: decimalInput });
assert.equal(document.activeElement, decimalInput, "decimal input keeps focus");

const highDown = field(elements.financeInputs, "car1", "downPayment");
highDown.value = "999999";
highDown.dispatch("input", { target: highDown });
assert.match(elements.warningBox.innerHTML, /Down payment exceeds initial cash/);
assert.match(elements.primaryTable.innerHTML, /Initial cash not enough/);

const serialized = output() + elements.financeInputs.innerHTML + elements.runningInputs.innerHTML;
assert.doesNotMatch(serialized, /NaN|undefined|Infinity/);
assert.doesNotMatch(serialized, /<option[^>]*background:\s*black/i);
console.log("ok - dashboard smoke");
