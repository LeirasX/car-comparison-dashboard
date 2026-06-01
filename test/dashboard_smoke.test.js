const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class FakeElement {
  constructor(id = "", tagName = "DIV") {
    this.id = id;
    this.tagName = tagName;
    this.children = [];
    this.value = "";
    this.innerHTML = "";
    this.classNames = new Set();
    this.classList = {
      toggle: (name, enabled) => {
        if (enabled) this.classNames.add(name);
        else this.classNames.delete(name);
      },
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
    };
    this.dataset = {};
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelectorAll() {
    return [];
  }
}

const elements = {
  app: new FakeElement("app"),
  carChoices: new FakeElement("carChoices", "DATALIST"),
};
const navElements = ["home", "cars", "tools", "ranking", "home", "cars", "tools", "ranking"].map((name) => {
  const el = new FakeElement("", "A");
  el.dataset.nav = name;
  return el;
});

const location = { hash: "#home" };
const document = {
  getElementById(id) {
    if (!elements[id]) elements[id] = new FakeElement(id);
    return elements[id];
  },
  createDocumentFragment() {
    return new FakeElement("", "FRAGMENT");
  },
  createElement(tagName) {
    return new FakeElement("", tagName.toUpperCase());
  },
  querySelectorAll(selector) {
    if (selector === "[data-nav]") return navElements;
    return [];
  },
  querySelector() {
    return null;
  },
  addEventListener() {},
};

const context = {
  window: null,
  document,
  location,
  console,
  Intl,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  encodeURIComponent,
  decodeURIComponent,
};
context.window = Object.assign(context, {
  addEventListener() {},
  scrollTo() {},
});
context.globalThis = context;
vm.createContext(context);

const html = fs.readFileSync("dashboard.html", "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert.equal(scripts.length, 2);
scripts.forEach((script) => vm.runInContext(script, context));

function renderRoute(hash) {
  location.hash = hash;
  vm.runInContext("render()", context);
  return elements.app.innerHTML;
}

assert.match(html, /<title>Car Value Studio<\/title>/);
assert.match(html, /Car Value Studio/);
assert.match(html, /id="app"/);
assert.match(html, /id="carChoices"/);
assert.doesNotMatch(html, /Car Money Left Comparison/);

let page = elements.app.innerHTML;
assert.match(page, /Find the car that makes sense/);
assert.match(page, /Explore Cars/);
assert.match(page, /Financial Compare/);
assert.ok(elements.carChoices.children.length > 0, "car datalist should be populated");

page = renderRoute("#cars");
assert.match(page, /Browse/);
assert.match(page, /data-cars-search/);
assert.match(page, /href="#car\//);

page = renderRoute("#car/tesla-model-3");
assert.match(page, /Main Specs/);
assert.match(page, /Ownership/);
assert.match(page, /Scores/);
assert.match(page, /Compare financially/);
assert.match(page, /gallery-strip|(?:upload|commons)\.wikimedia\.org/);

page = renderRoute("#car/kia-ev9");
assert.match(page, /Kia EV9/);
assert.match(page, /(?:upload|commons)\.wikimedia\.org/);

page = renderRoute("#tools");
assert.match(page, /Decision tools/);
assert.match(page, /Used Market Compare/);

page = renderRoute("#tools/financial");
assert.match(page, /Financial Compare/);
assert.match(page, /data-assumption="initialCashBudget"/);
assert.match(page, /Total paid/);
assert.match(page, /Net worth/);

page = renderRoute("#tools/spec");
assert.match(page, /Spec Compare/);
assert.match(page, /Power/);
assert.match(page, /Use/);

page = renderRoute("#tools/used");
assert.match(page, /Used Market Compare/);
assert.match(page, /Offer price/);
assert.match(page, /Adjusted value/);

page = renderRoute("#tools/value");
assert.match(page, /Value Compare/);
assert.match(page, /Formula: 40% financial/);

page = renderRoute("#ranking");
assert.match(page, /Rank cars/);
assert.match(page, /data-ranking-mode="value"/);
assert.match(page, /Total paid/);

console.log("ok - dashboard routes render");
