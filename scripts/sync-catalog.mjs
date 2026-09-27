import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const MARKUP_CENTS = 7500;
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const APP_ID = "69386f6ce9fe29121d66f65f";
const SUPPLIER = "https://miccamisasdetime.com.br";
const PAGE_LIMIT = 5000;

export function normalize(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\b20(?=\d{2})/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeSize(value = "") {
  const text = String(value).trim().toUpperCase();
  const child = text.match(/^(?:TAM\s*|T)(\d+)/);
  return child ? `T${child[1]}` : text;
}

export function supplierCents(value) {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function retailPrice(value) {
  const cents = supplierCents(value);
  return cents === null ? null : (cents + MARKUP_CENTS) / 100;
}

function publicImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ["base44.app", "media.base44.com", "cdn.shopify.com"].includes(parsed.hostname);
  } catch { return false; }
}

function sizeOrder(size) {
  const child = size.match(/^T(\d+)$/);
  if (child) return Number(child[1]);
  const order = ["PP", "P", "M", "G", "GG", "XG", "2GG", "3GG", "4GG", "5GG"];
  return order.includes(size) ? order.indexOf(size) : 100;
}

export function buildCatalog({ models, teams, countries, supplierProducts, mappings = {}, generatedAt = new Date().toISOString() }) {
  for (const [name, value] of Object.entries({ models, teams, countries, supplierProducts })) {
    if (!Array.isArray(value) || !value.length) throw new Error(`Fonte vazia ou inválida: ${name}`);
  }
  const teamMap = new Map(teams.map(team => [team.id, team]));
  const countryMap = new Map(countries.map(country => [country.id, country]));
  const sourceById = new Map(supplierProducts.map(product => [String(product.id), product]));
  const sourceByName = new Map();
  for (const product of supplierProducts) {
    const key = normalize(product.title);
    sourceByName.set(key, [...(sourceByName.get(key) || []), product]);
  }
  const active = models.filter(model => !model.is_archived && !model.shopify_archived);
  if (!active.length) throw new Error("Nenhum modelo ativo: publicação cancelada para preservar a loja.");
  if (new Set(active.map(model => model.id)).size !== active.length) throw new Error("Modelos duplicados na fonte.");
  const report = { byId: 0, byName: 0, byMapping: 0, unpriced: [], uncategorized: [], stockDifferences: 0 };

  const products = active.map(model => {
    if (!model.id || !model.name || !Array.isArray(model.sizes) || !Array.isArray(model.photos)) {
      throw new Error(`Modelo incompleto: ${model.id || "sem id"}`);
    }
    const team = teamMap.get(model.team_id) || { name: "Futebol" };
    const country = countryMap.get(team.country_id);
    const id = String(model.shopify_product_id || "").split("/").pop();
    let source = sourceById.get(id);
    if (source) report.byId++;
    if (!source && mappings[model.id]) {
      const mapping = mappings[model.id];
      const candidate = sourceById.get(String(mapping.productId));
      // A manual alias is valid only while both ID and reviewed title still agree.
      if (candidate && normalize(candidate.title) === normalize(mapping.title)) {
        source = candidate;
        report.byMapping++;
      }
    }
    if (!source) {
      const candidates = sourceByName.get(normalize(model.name)) || [];
      if (candidates.length === 1) { source = candidates[0]; report.byName++; }
    }

    const name = model.name.trim().replace(/\s+/g, " ").replace(/Dortmind/gi, "Dortmund");
    const text = normalize(name);
    const kids = Boolean(model.is_kids_kit) || /\binfantil\b/.test(text);
    const kit = kids || normalize(model.category) === "kits" || /\bkit\b/.test(text);
    const gender = kids ? "infantil" : /\bfeminin[oa]\b/.test(text) ? "feminino" : "masculino";
    const type = kit ? (kids ? "kit-infantil" : "kit-adulto") : "camisa";
    const groupName = normalize(country?.name);
    const collection = mappings._teamCollections?.[model.team_id] || (groupName.includes("brasileiros") ? "nacionais" : groupName.includes("selecoes") ? "selecoes" : country ? "internacionais" : "outros");
    if (collection === "outros") report.uncategorized.push(name);
    const retro = /\bretro\b/.test(text);
    const catalogSizes = [...new Set(model.sizes.map(normalizeSize))];
    const sourceVariants = source?.variants || [];
    if (source && (!Array.isArray(source.variants) || !source.variants.length || source.options?.length !== 1 || normalize(source.options[0].name) !== "tamanho")) {
      throw new Error(`Variações não suportadas: ${name}`);
    }
    const variantMap = new Map();
    for (const variant of sourceVariants) {
      const size = normalizeSize(variant.option1 || variant.title);
      if (!size || variantMap.has(size)) throw new Error(`Tamanho ambíguo: ${name} / ${size}`);
      const price = retailPrice(variant.price);
      const available = variant.available === true && catalogSizes.includes(size) && price !== null;
      variantMap.set(size, { size, label: variant.option1 || variant.title, price, available });
      if (variant.available !== catalogSizes.includes(size)) report.stockDifferences++;
    }
    for (const size of catalogSizes) {
      if (!variantMap.has(size)) variantMap.set(size, { size, label: size, price: null, available: false });
    }
    const variants = [...variantMap.values()].sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size) || a.size.localeCompare(b.size));
    const availableVariants = variants.filter(variant => variant.available);
    const pricedVariants = variants.filter(variant => variant.price !== null);
    const displayedPrices = (availableVariants.length ? availableVariants : pricedVariants).map(variant => variant.price);
    const price = displayedPrices.length ? Math.min(...displayedPrices) : null;
    const photos = [...new Set(model.photos.filter(publicImage))];
    if (!photos.length) throw new Error(`Modelo sem foto pública válida: ${name}`);
    if (price === null) report.unpriced.push({ id: model.id, name });
    const audience = { masculino: "Masculino", feminino: "Feminino", infantil: "Infantil" }[gender];
    const collectionName = { nacionais: "Clubes nacionais", internacionais: "Clubes internacionais", selecoes: "Seleções", outros: "Futebol" }[collection];

    return {
      id: `mic-${model.id}`, slug: normalize(name).replace(/ /g, "-"), name,
      category: "camisas-de-time", kind: "jersey", team: team.name.trim(),
      gender, collection, retro, type,
      badge: price === null ? "Indisponível" : !availableVariants.length ? "Esgotado" : retro ? "Retrô" : kids ? "Kit infantil" : kit ? "Kit adulto" : "",
      shortDescription: `${team.name.trim()} · ${audience} · ${collectionName}${retro ? " · Retrô" : ""}`,
      description: `${name}. ${kit ? "Conjunto" : "Modelo"} da seleção Hype Elite, com fotos e tamanhos para você conferir cada detalhe.`,
      price, priceVaries: new Set(displayedPrices).size > 1,
      sizes: variants.map(variant => variant.size), variants,
      availableSizes: availableVariants.map(variant => variant.size),
      available: availableVariants.length > 0, published: true, featured: false,
      photos, freeShipping: true, createdAt: model.created_date,
    };
  }).sort((a, b) => Number(b.available) - Number(a.available) || String(b.createdAt).localeCompare(String(a.createdAt)) || a.name.localeCompare(b.name, "pt-BR"));

  products.filter(product => product.available).slice(0, 4).forEach(product => { product.featured = true; });
  const metadata = {
    generatedAt, modelCount: products.length,
    pricedCount: products.filter(product => product.price !== null).length,
    availableCount: products.filter(product => product.available).length,
    photoCount: products.reduce((count, product) => count + product.photos.length, 0),
    unpricedCount: report.unpriced.length,
  };
  return { products, metadata, report };
}

async function getJson(url, headers = {}) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} em ${new URL(url).pathname}`);
      return await response.json();
    } catch (cause) {
      error = cause;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1500));
    }
  }
  throw error;
}

async function entity(name) {
  const result = await getJson(`https://base44.app/api/apps/${APP_ID}/entities/${name}?sort=-created_date&limit=${PAGE_LIMIT}`, { "X-App-Id": APP_ID });
  if (!Array.isArray(result) || result.length >= PAGE_LIMIT) throw new Error(`Resposta incompleta de ${name}; catálogo anterior preservado.`);
  return result;
}

async function supplierCatalog() {
  const products = [];
  const seen = new Set();
  for (let page = 1; page <= 100; page++) {
    const response = await getJson(`${SUPPLIER}/products.json?limit=250&page=${page}`);
    if (!Array.isArray(response.products)) throw new Error("Catálogo MIC inválido.");
    for (const product of response.products) {
      if (seen.has(product.id)) throw new Error("Paginação MIC repetiu produtos.");
      seen.add(product.id);
      products.push(product);
    }
    if (response.products.length < 250) return products;
  }
  throw new Error("Paginação MIC incompleta.");
}

async function main() {
  const mappings = JSON.parse(await readFile(path.join(ROOT, "scripts/catalog-mappings.json"), "utf8"));
  const [models, teams, countries, supplierProducts] = await Promise.all([
    entity("Model"), entity("Team"), entity("Country"), supplierCatalog(),
  ]);
  const { products, metadata, report } = buildCatalog({ models, teams, countries, supplierProducts, mappings });
  const serialize = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const output = `// Generated by scripts/sync-catalog.mjs. Do not edit prices here.\nwindow.HYPE_ELITE_CATALOG_META=${serialize(metadata)};\nwindow.HYPE_ELITE_CATALOG_PRODUCTS=${serialize(products)};\n`;
  await mkdir(path.join(ROOT, "assets/js"), { recursive: true });
  await writeFile(path.join(ROOT, "assets/js/catalog-products.js"), output);
  console.log(JSON.stringify({ ...metadata, ...report }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `## Catálogo Hype Elite\n\n${metadata.modelCount} modelos, ${metadata.pricedCount} com preço confirmado, ${metadata.availableCount} disponíveis e ${metadata.photoCount} fotos.\n\nPreço normal MIC + R$75,00 por produto/kit. Frete grátis.\n\n${report.unpriced.length ? "### Sem preço atual (venda bloqueada)\n" + report.unpriced.map(item => `- ${item.name}`).join("\n") : "Todos os modelos têm preço de origem confirmado."}\n`;
    await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
