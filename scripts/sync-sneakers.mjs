import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SOURCE = "https://catalogoaguiar.netlify.app";
export const SNEAKER_MARKUP_CENTS = 15000;

function decode(value = "") {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#39|#34);/g, entity => ({
    "&amp;": "&", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&#34;": '"', "&lt;": "<", "&gt;": ">",
  }[entity]));
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1], decode(match[3])]));
}

export function sneakerPrice(value) {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? (cents + SNEAKER_MARKUP_CENTS) / 100 : null;
}

export function sneakerSizes(value) {
  const match = String(value).trim().match(/^(\d{2})\s+ao\s+(\d{2})$/i);
  if (!match) throw new Error(`Numeração não reconhecida: ${value}`);
  const first = Number(match[1]), last = Number(match[2]);
  if (first < 30 || last > 48 || first > last) throw new Error(`Numeração inválida: ${value}`);
  return Array.from({ length: last - first + 1 }, (_, i) => String(first + i));
}

export function importedPages(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  const links = [...main.matchAll(/<a\b[^>]*>/gi)].map(match => attributes(match[0]).href)
    .filter(href => /^\/prod-importado-[a-z0-9-]+$/.test(href || ""));
  const result = [...new Set(links)];
  const expected = Number(html.match(/class=["']count["'][^>]*>\s*(\d+)/i)?.[1]);
  if (!result.length || !expected || result.length !== expected) throw new Error("Lista de importados vazia ou incompleta; publicação cancelada.");
  return result;
}

export function sneakerRecords(html, sourcePath) {
  if (!/^\/prod-importado-[a-z0-9-]+$/.test(sourcePath)) throw new Error("Somente a aba Importado pode ser importada.");
  const records = [...html.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi)]
    .map(match => ({ data: attributes(match[1]), body: match[2] }))
    .filter(({ data }) => data.class?.split(/\s+/).includes("ph"))
    .map(({ data, body }) => {
      const thumbnail = attributes(body.match(/<img\b[^>]*>/i)?.[0] || "").src;
      const photo = data["data-full"], id = data["data-id"], label = data["data-label"];
      if (!id || !/^[\w-]+$/.test(id) || !label || !photo || !thumbnail) throw new Error(`Modelo incompleto em ${sourcePath}`);
      for (const [url, directory] of [[photo, "fotos"], [thumbnail, "thumbs"]]) {
        const parsed = new URL(url);
        if (parsed.origin !== "https://meucatalogotenis.netlify.app" || !parsed.pathname.startsWith(`/${directory}/c-premium-importado/`)) {
          throw new Error(`Foto fora da coleção importada em ${sourcePath}`);
        }
      }
      return { id, label, photo, thumbnail, sizes: sneakerSizes(data["data-num"]), sizeRange: data["data-num"], sourcePath };
    });
  const expected = Number(html.match(/class=["']count["'][^>]*>\s*(\d+)/i)?.[1]);
  if (!records.length || records.length !== expected) throw new Error(`Modelos incompletos em ${sourcePath}`);
  return records;
}

export function buildSneakerCatalog(records, priceRows, generatedAt = new Date().toISOString()) {
  if (!Array.isArray(records) || !records.length || !Array.isArray(priceRows) || !priceRows.length) throw new Error("Fonte de tênis vazia; catálogo anterior preservado.");
  if (new Set(records.map(item => item.id)).size !== records.length) throw new Error("Modelos de tênis duplicados na fonte.");
  const prices = new Map();
  for (const row of priceRows) {
    if (prices.has(row.drive_id)) throw new Error("Preços duplicados na fonte.");
    prices.set(row.drive_id, row.price);
  }
  const products = records.map(record => {
    const price = sneakerPrice(prices.get(record.id));
    const brand = record.label.startsWith("New Balance") ? "New Balance" : record.label.startsWith("On Running") ? "On Running" : record.label.split(" ")[0];
    const code = new URL(record.photo).pathname.split("/").pop().replace(/\.[^.]+$/, "");
    const name = `Tênis ${record.label} — ${code}`;
    return {
      id: `aguiar-${record.id}`, slug: `tenis-${record.id}`, name, category: "tenis", kind: "sneaker",
      brand, line: record.label, modelCode: code, type: "tenis", badge: price === null ? "Indisponível" : "",
      shortDescription: `${brand} · Numeração ${record.sizeRange}`,
      description: `${record.label}, modelo ${code}. Confira o produto na foto do catálogo e selecione sua numeração. Pedido sob encomenda, com disponibilidade a confirmar.`,
      price, priceVaries: false, sizes: record.sizes,
      variants: record.sizes.map(size => ({ size, label: size, price, available: price !== null })),
      availableSizes: price === null ? [] : record.sizes, available: price !== null, published: true,
      availabilityConfirmation: true, freeShipping: true, featured: false,
      photos: [record.photo], photoPreview: record.thumbnail,
    };
  });
  const priced = products.filter(product => product.price !== null);
  const metadata = {
    generatedAt, modelCount: products.length, pricedCount: priced.length,
    unpricedCount: products.length - priced.length, photoCount: products.length,
    brandCount: new Set(products.map(product => product.brand)).size,
    lineCount: new Set(products.map(product => product.line)).size,
    minPrice: priced.length ? Math.min(...priced.map(product => product.price)) : null,
    maxPrice: priced.length ? Math.max(...priced.map(product => product.price)) : null,
  };
  return { products, metadata };
}

async function request(url, headers = {}) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`Falha HTTP ${response.status} ao atualizar tênis.`);
      return response;
    } catch (cause) {
      error = cause;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw error;
}

async function main() {
  const [index, config] = await Promise.all([
    request(`${SOURCE}/cat-importado`).then(r => r.text()),
    request(`${SOURCE}/supabase-config.js`).then(r => r.text()),
  ]);
  const pages = importedPages(index);
  // This is the same public, read-only price feed used by the source storefront.
  // Read its published configuration without executing any third-party JavaScript.
  const priceHost = config.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const publicKey = config.match(/SUPABASE_ANON\s*=\s*["']([^"']+)["']/)?.[1];
  if (!publicKey || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(priceHost || "")) throw new Error("Fonte pública de preços não reconhecida.");
  const priceRows = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const response = await request(`${priceHost.replace(/\/$/, "")}/rest/v1/prices?select=drive_id,price&limit=1000&offset=${offset}`, { apikey: publicKey, Accept: "application/json", Prefer: "count=exact" });
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Fonte de preços inválida.");
    priceRows.push(...rows);
    const total = Number(response.headers.get("content-range")?.split("/")[1]);
    if (Number.isInteger(total) && total > 0 && priceRows.length === total) break;
    if (rows.length < 1000) {
      if (Number.isInteger(total) && total > priceRows.length) throw new Error("Tabela de preços incompleta.");
      break;
    }
    if (offset === 99000) throw new Error("Tabela de preços excedeu o limite seguro.");
  }
  const records = [];
  // Small batches keep the supplier site responsive.
  for (let start = 0; start < pages.length; start += 3) {
    const batch = await Promise.all(pages.slice(start, start + 3).map(async sourcePath => sneakerRecords(await (await request(SOURCE + sourcePath)).text(), sourcePath)));
    records.push(...batch.flat());
  }
  const { products, metadata } = buildSneakerCatalog(records, priceRows);
  const serialize = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  await mkdir(path.join(ROOT, "assets/js"), { recursive: true });
  await writeFile(path.join(ROOT, "assets/js/sneaker-products.js"), `// Generated by scripts/sync-sneakers.mjs. Imported collection only.\nwindow.HYPE_ELITE_SNEAKER_META=${serialize(metadata)};\nwindow.HYPE_ELITE_SNEAKER_PRODUCTS=${serialize(products)};\n`);
  console.log(JSON.stringify(metadata, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `\n## Tênis importados\n\n${metadata.modelCount} modelos; ${metadata.pricedCount} com preço confirmado. Catálogo Aguiar, somente aba Importado. Acréscimo fixo de R$150 por par e frete grátis. Numerações conforme a fonte; estoque sujeito a confirmação.\n`, { flag: "a" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
