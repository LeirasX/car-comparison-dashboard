import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const cars = require(path.join(root, "src", "data", "cars.js"));
const outFile = path.join(root, "src", "data", "car-images.generated.js");
const reportFile = path.join(root, "outputs", "car_image_coverage.json");
const cacheFile = path.join(root, "outputs", "car_image_commons_cache.json");

const args = new Set(process.argv.slice(2));
const refresh = args.has("--refresh");
const wikiOnly = args.has("--wiki-only");
const titleOnly = args.has("--title-only");
const maxGroupsArg = process.argv.find((arg) => arg.startsWith("--max-groups="));
const maxGroups = maxGroupsArg ? Number(maxGroupsArg.split("=")[1]) : Infinity;
const delayMs = Number(process.env.COMMONS_DELAY_MS || 250);

const skipWords = /\b(logo|badge|emblem|interior|dashboard|steering|engine|motor|wheel|rim|headlight|taillight|wreck|crash|accident|police|taxi|diagram|map|render|drawing|svg|industry|formula one|motorsport season|list of)\b/i;
const carWords = /\b(car|auto|automobile|vehicle|sedan|hatchback|suv|crossover|wagon|estate|coupe|convertible|roadster|front|rear|side|facelift|sportback|touring|variant)\b/i;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalModel(car) {
  const brand = normalize(car.brand);
  let model = normalize(car.model);
  if (brand && model.startsWith(`${brand} `)) model = model.slice(brand.length + 1);
  return model
    .replace(/\b(standard range plus|standard range|long range|performance|rwd|awd|plaid|highland|hybrid|plug in hybrid|e tech|puretech|bluehdi|tdi|tsi|tfsi|xdrive|quattro|4matic|plus|style|comfortline|active|allure|gt line|amg line|m sport)\b/g, " ")
    .replace(/\b\d\.\d\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function groupKey(car) {
  return `${normalize(car.brand)} ${canonicalModel(car)}`.trim();
}

function displayGroup(car) {
  const brand = String(car.brand || "").trim();
  const model = String(car.model || "").trim();
  const brandNorm = normalize(brand);
  const modelNorm = normalize(model);
  if (brandNorm && modelNorm.startsWith(`${brandNorm} `)) return model.replace(/\s+/g, " ").trim();
  return `${brand} ${model}`.replace(/\s+/g, " ").trim();
}

function titleCaseNormalized(value) {
  return normalize(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? part : part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function titleVariantsForGroup(group) {
  const variants = new Set([group.label]);
  const normalizedBrand = normalize(group.brand);
  const modelTitle = titleCaseNormalized(group.model);
  if (modelTitle) variants.add(`${group.brand} ${modelTitle}`.replace(/\s+/g, " ").trim());
  if (normalizedBrand === "seat" && normalize(group.model).startsWith("cupra ")) {
    variants.add(modelTitle);
    variants.add(modelTitle.replace(/^CUPRA\b/, "Cupra"));
  }
  if (normalizedBrand === "citroen") variants.add(group.label.replace(/^Citroën\b/, "Citroen"));
  if (normalizedBrand === "skoda") variants.add(group.label.replace(/^Skoda\b/, "Škoda"));
  if (normalizedBrand === "mercedes benz") variants.add(group.label.replace(/^Mercedes-Benz\b/, "Mercedes"));
  if (normalizedBrand === "bmw" && /\bseries\b/i.test(group.label)) variants.add(group.label.replace(/\b(\d) Series\b/i, "$1 Series (G20)"));
  return [...variants].filter(Boolean);
}

function yearFromText(value) {
  const match = String(value || "").match(/\b(19[8-9]\d|20[0-2]\d)\b/);
  return match ? Number(match[1]) : 0;
}

function confidenceFor(car, imageYear, groupYears) {
  if (imageYear && imageYear === Number(car.year)) return "exact";
  if (imageYear && Math.abs(imageYear - Number(car.year)) <= 6) return "generation";
  if (groupYears.length && imageYear && Number(car.year) >= Math.min(...groupYears) && Number(car.year) <= Math.max(...groupYears)) return "generation";
  return "model";
}

function tokensFor(value) {
  return normalize(value).split(/\s+/).filter((token) => token.length > 1 || /\d/.test(token));
}

function tokenInText(text, token) {
  return new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
}

function scoreCandidate(candidate, group, query) {
  const text = normalize(`${candidate.title} ${candidate.metadata}`);
  const brandTokens = tokensFor(group.brand);
  const modelTokens = tokensFor(group.model);
  const titleText = normalize(candidate.title);
  const hasBrand = brandTokens.some((token) => text.includes(token));
  const modelPhrase = normalize(group.model);
  const hasModelPhrase = modelPhrase && text.includes(modelPhrase);
  const importantModelTokens = modelTokens.filter((token) => token.length > 1);
  const hasModelToken = importantModelTokens.some((token) => text.includes(token));
  const titleHasModelPhrase = modelPhrase && titleText.includes(modelPhrase);
  const titleHasNumberedModel = importantModelTokens.some((token) => /\d/.test(token) && (tokenInText(titleText, token) || titleText.includes(token)));
  const optionalModelWords = new Set(["active", "allspace", "amg", "avant", "bluehdi", "cabrio", "cabriolet", "classic", "coupe", "cross", "crossover", "electric", "estate", "evo", "evolution", "gran", "grand", "gt", "gti", "gtd", "gte", "hybrid", "line", "long", "mhev", "performance", "plug", "plus", "rs", "sport", "sportback", "sports", "stepway", "tourer", "touring", "turbo", "wagon"]);
  const coreTitleTokens = importantModelTokens.filter((token) => !optionalModelWords.has(token) && !brandTokens.includes(token));
  const titleHasCoreModel = coreTitleTokens.length > 0 && coreTitleTokens.every((token) => tokenInText(titleText, token));
  const titleHasModel = titleHasModelPhrase || titleHasNumberedModel || titleHasCoreModel;
  if (!hasBrand || !hasModelToken || !titleHasModel) return -50;
  let score = 0;
  brandTokens.forEach((token) => { if (text.includes(token)) score += 5; });
  modelTokens.forEach((token) => { if (text.includes(token)) score += 7; });
  if (carWords.test(candidate.title)) score += 2;
  if (query.exactYear && text.includes(String(query.exactYear))) score += 8;
  if (skipWords.test(candidate.title)) score -= 12;
  if (!candidate.thumburl && !candidate.url) score -= 8;
  if (!/^image\/(jpeg|png|webp)$/i.test(candidate.mime || "")) score -= 20;
  return score;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function fetchJsonWithBackoff(url, tries = 4) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { headers: { "User-Agent": "CarValueStudioImagePipeline/1.0 (local static site image metadata)" } });
    } catch (error) {
      if (attempt === tries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
      continue;
    }
    if (response.status === 429 || response.status === 503) {
      const wait = Number(response.headers.get("retry-after") || 0) * 1000 || (attempt + 1) * 1800;
      await new Promise((resolve) => setTimeout(resolve, wait));
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} for ${url}`);
    return response.json();
  }
  throw new Error(`rate limited for ${url}`);
}

function pageToCandidate(page) {
  if (!page || page.missing) return null;
  const url = page.thumbnail?.source || page.original?.source || "";
  const source = page.fullurl || (page.pageid ? `https://en.wikipedia.org/?curid=${page.pageid}` : "");
  if (!url || !source) return null;
  return {
    title: page.title || "",
    url,
    source,
    mime: "image/jpeg",
    metadata: page.extract || "",
  };
}

function normalizedTitle(value) {
  return normalize(value).replace(/\s+/g, " ");
}

function resolveReturnedTitle(requested, redirects) {
  let current = requested;
  for (let index = 0; index < 4; index += 1) {
    const next = redirects.get(normalizedTitle(current));
    if (!next || normalizedTitle(next) === normalizedTitle(current)) return current;
    current = next;
  }
  return current;
}

async function hydrateWikipediaTitleCache(groups, cache) {
  const titles = [];
  const seen = new Set();
  groups.forEach((group) => {
    titleVariantsForGroup(group).forEach((title) => {
      const key = `wikipedia-title:${title}`;
      if (!refresh && Object.prototype.hasOwnProperty.call(cache, key)) return;
      const dedupeKey = normalizedTitle(title);
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      titles.push(title);
    });
  });
  if (!titles.length) return;

  const chunkSize = 45;
  for (let index = 0; index < titles.length; index += chunkSize) {
    const chunk = titles.slice(index, index + chunkSize);
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      titles: chunk.join("|"),
      redirects: "1",
      prop: "pageimages|info|extracts",
      piprop: "thumbnail|original",
      pithumbsize: "1200",
      inprop: "url",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      format: "json",
      origin: "*",
    }).toString();
    const data = await fetchJsonWithBackoff(url);
    const redirects = new Map();
    (data.query?.normalized || []).forEach((item) => redirects.set(normalizedTitle(item.from), item.to));
    (data.query?.redirects || []).forEach((item) => redirects.set(normalizedTitle(item.from), item.to));
    const pages = Object.values(data.query?.pages || {});
    const pagesByTitle = new Map(pages.map((page) => [normalizedTitle(page.title), page]));
    chunk.forEach((requestedTitle) => {
      const returnedTitle = resolveReturnedTitle(requestedTitle, redirects);
      const page = pagesByTitle.get(normalizedTitle(returnedTitle)) || pagesByTitle.get(normalizedTitle(requestedTitle));
      const candidate = pageToCandidate(page);
      cache[`wikipedia-title:${requestedTitle}`] = candidate ? [candidate] : [];
    });
    process.stdout.write(`title batch ${Math.min(index + chunk.length, titles.length)}/${titles.length}\n`);
    await writeJson(cacheFile, cache);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function wikipediaSearch(query, cache) {
  const key = `wikipedia:${query.term}`;
  if (!refresh && cache[key]) return cache[key];
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "0",
    gsrlimit: "8",
    gsrsearch: `${query.term} automobile`,
    prop: "pageimages|info|extracts",
    piprop: "thumbnail|original",
    pithumbsize: "1200",
    inprop: "url",
    exintro: "1",
    explaintext: "1",
    exsentences: "2",
    format: "json",
    origin: "*",
  }).toString();
  const data = await fetchJsonWithBackoff(url);
  const pages = Object.values(data.query?.pages || {});
  const results = pages.map((page) => ({
    title: page.title || "",
    url: page.thumbnail?.source || page.original?.source || "",
    source: page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`,
    mime: "image/jpeg",
    metadata: page.extract || "",
  })).filter((item) => item.url && item.source);
  cache[key] = results;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return results;
}

async function commonsSearch(query, cache) {
  const key = `commons:${query.term}`;
  if (!refresh && cache[key]) return cache[key];
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: query.term,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1200",
    format: "json",
    origin: "*",
  }).toString();
  const data = await fetchJsonWithBackoff(url);
  const pages = Object.values(data.query?.pages || {});
  const results = pages.map((page) => {
    const info = page.imageinfo?.[0] || {};
    const metadata = info.extmetadata ? Object.values(info.extmetadata).map((item) => item?.value || "").join(" ") : "";
    return {
      title: page.title || "",
      url: info.thumburl || info.url || "",
      source: info.descriptionurl || "",
      mime: info.mime || "",
      metadata,
    };
  }).filter((item) => item.url && item.source);
  cache[key] = results;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return results;
}

function buildGroups() {
  const groups = new Map();
  cars.forEach((car) => {
    if (!car.brand || !car.model || !car.year) return;
    const key = groupKey(car);
    if (!key || key.split(" ").length < 2) return;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        brand: car.brand,
        model: canonicalModel(car),
        label: displayGroup(car),
        cars: [],
        years: new Set(),
      });
    }
    const group = groups.get(key);
    group.cars.push(car);
    group.years.add(Number(car.year));
  });
  return [...groups.values()]
    .map((group) => Object.assign(group, { years: [...group.years].filter(Boolean).sort((a, b) => a - b) }))
    .sort((a, b) => b.cars.length - a.cars.length || a.label.localeCompare(b.label));
}

function queriesFor(group) {
  const medianYear = group.years[Math.floor(group.years.length / 2)] || "";
  const recentYear = group.years.filter((year) => year <= 2026).at(-1) || medianYear;
  return [
    { term: `${group.label} ${recentYear} car`, exactYear: recentYear },
    { term: `${group.label} ${medianYear} Wikimedia Commons car`, exactYear: medianYear },
    { term: `${group.label} car`, exactYear: 0 },
  ].filter((query, index, arr) => query.term.trim() && arr.findIndex((item) => item.term === query.term) === index);
}

async function findImageForGroup(group, cache) {
  let best = null;
  let bestQuery = null;
  for (const title of titleVariantsForGroup(group)) {
    const query = { term: `Wikipedia title: ${title}`, exactYear: 0 };
    const titleResults = cache[`wikipedia-title:${title}`] || [];
    for (const candidate of titleResults) {
      const score = scoreCandidate(candidate, group, query) + 8;
      if (!best || score > best.score) {
        best = Object.assign({}, candidate, { score });
        bestQuery = query.term;
      }
    }
    if (best && best.score >= 16) break;
  }
  if (best && best.score >= 16) {
    return {
      image: best.url,
      gallery: [best.url],
      imageSource: best.source,
      imageQueryUsed: bestQuery,
      imageTitle: best.title,
      imageYear: yearFromText(`${best.title} ${best.metadata}`),
    };
  }
  if (titleOnly) return null;
  for (const query of queriesFor(group)) {
    const wikiResults = await wikipediaSearch(query, cache);
    for (const candidate of wikiResults) {
      const score = scoreCandidate(candidate, group, query) + 4;
      if (!best || score > best.score) {
        best = Object.assign({}, candidate, { score });
        bestQuery = query.term;
      }
    }
    if (best && best.score >= 16) break;
  }
  if (wikiOnly) {
    if (!best || best.score < 9) return null;
    return {
      image: best.url,
      gallery: [best.url],
      imageSource: best.source,
      imageQueryUsed: bestQuery,
      imageTitle: best.title,
      imageYear: yearFromText(`${best.title} ${best.metadata}`),
    };
  }
  for (const query of queriesFor(group)) {
    if (best && best.score >= 16) break;
    const results = await commonsSearch(query, cache);
    for (const candidate of results) {
      const score = scoreCandidate(candidate, group, query);
      if (!best || score > best.score) {
        best = Object.assign({}, candidate, { score });
        bestQuery = query.term;
      }
    }
    if (best && best.score >= 14) break;
  }
  if (!best || best.score < 9) return null;
  return {
    image: best.url,
    gallery: [best.url],
    imageSource: best.source,
    imageQueryUsed: bestQuery,
    imageTitle: best.title,
    imageYear: yearFromText(`${best.title} ${best.metadata}`),
  };
}

function generatedModule(overrides) {
  return `(function initCarImageOverrides(root, factory) {
  const images = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = images;
  root.CarImageOverrides = images;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildCarImageOverrides() {
  "use strict";

  // Generated by scripts/fetch_car_images.mjs.
  return ${JSON.stringify(overrides)};
});
`;
}

function coverage(overrides) {
  const counts = { total: cars.length, exact: 0, generation: 0, model: 0, fallback: 0 };
  const missingExamples = [];
  cars.forEach((car) => {
    const confidence = overrides[car.id]?.imageConfidence || "fallback";
    counts[confidence] = (counts[confidence] || 0) + 1;
    if (confidence === "fallback" && missingExamples.length < 50) missingExamples.push({ id: car.id, fullName: car.fullName });
  });
  const real = counts.exact + counts.generation + counts.model;
  return {
    ...counts,
    real,
    realPct: Number((real / counts.total * 100).toFixed(1)),
    fallbackPct: Number((counts.fallback / counts.total * 100).toFixed(1)),
    missingExamples,
  };
}

const groups = buildGroups().slice(0, maxGroups);
const cache = await readJson(cacheFile, {});
const groupImages = {};

await hydrateWikipediaTitleCache(groups, cache);

for (let index = 0; index < groups.length; index += 1) {
  const group = groups[index];
  process.stdout.write(`[${index + 1}/${groups.length}] ${group.label} (${group.cars.length}) ... `);
  try {
    const image = await findImageForGroup(group, cache);
    if (image) {
      groupImages[group.key] = image;
      console.log(`${image.imageTitle} score ok`);
    } else {
      console.log("no match");
    }
  } catch (error) {
    console.log(`error: ${error.message}`);
  }
  if (index % 20 === 0) await writeJson(cacheFile, cache);
}

await writeJson(cacheFile, cache);

const overrides = {};
cars.forEach((car) => {
  const image = groupImages[groupKey(car)];
  if (!image) return;
  const groupYears = groups.find((group) => group.key === groupKey(car))?.years || [];
  overrides[car.id] = {
    image: image.image,
    gallery: image.gallery,
    imageSource: image.imageSource,
    imageConfidence: confidenceFor(car, image.imageYear, groupYears),
    imageQueryUsed: image.imageQueryUsed,
  };
});

await fs.writeFile(outFile, generatedModule(overrides));
  const report = {
  generatedAt: new Date().toISOString(),
  source: "Wikipedia pageimages plus Wikimedia Commons imageinfo thumb URLs and source pages",
  groupsProcessed: groups.length,
  groupsWithImages: Object.keys(groupImages).length,
  coverage: coverage(overrides),
};
await writeJson(reportFile, report);
console.log(JSON.stringify(report.coverage, null, 2));
