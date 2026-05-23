const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const model = fs.readFileSync(path.join(root, "src", "model.js"), "utf8");
const template = fs.readFileSync(path.join(root, "src", "dashboard.template.html"), "utf8");
const html = template.replace("/* __MODEL_JS__ */", model);

fs.writeFileSync(path.join(root, "dashboard.html"), html);
fs.writeFileSync(path.join(root, "index.html"), html);
console.log("Built dashboard.html and index.html");
