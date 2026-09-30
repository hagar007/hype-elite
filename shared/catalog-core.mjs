import { retailPrice } from "./pricing.mjs";

export function normalize(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\b20(?=\d{2})/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeSize(value = "") {
  const text = String(value).trim().toUpperCase();
  const child = text.match(/^(?:TAM\s*|T)(\d+)/);
  return child ? `T${child[1]}` : text;
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

