import { buildCatalog } from "../shared/catalog-core.mjs";
import { importedPages, sneakerRecords, buildSneakerCatalog } from "../shared/sneaker-core.mjs";
import mappings from "../scripts/catalog-mappings.json" with { type: "json" };

const APP_ID = "69386f6ce9fe29121d66f65f";
const AGUIAR = "https://catalogoaguiar.netlify.app";

async function request(fetcher, url, headers = {}) {
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Fonte indisponível");
  return response;
}

async function jerseys(ids, fetcher) {
  const entity = async name => {
    const data = await (await request(fetcher, `https://base44.app/api/apps/${APP_ID}/entities/${name}?sort=-created_date&limit=5000`, { "X-App-Id": APP_ID })).json();
    if (!Array.isArray(data) || !data.length || data.length >= 5000) throw new Error("Fonte incompleta");
    return data;
  };
  const supplier = async () => {
    const products = [], seen = new Set();
    for (let page = 1; page <= 40; page++) {
      const data = await (await request(fetcher, `https://miccamisasdetime.com.br/products.json?limit=250&page=${page}`)).json();
      if (!Array.isArray(data.products)) throw new Error("Fonte incompleta");
      for (const product of data.products) {
        if (seen.has(product.id)) throw new Error("Paginação repetida");
        seen.add(product.id); products.push(product);
      }
      if (data.products.length < 250) return products;
    }
    throw new Error("Fonte incompleta");
  };
  const [models, teams, countries, supplierProducts] = await Promise.all([entity("Model"), entity("Team"), entity("Country"), supplier()]);
  const selected = models.filter(model => ids.has(`mic-${model.id}`) && !model.is_archived && !model.shopify_archived);
  if (!selected.length) return [];
  return buildCatalog({ models: selected, teams, countries, supplierProducts, mappings }).products;
}

async function sneakers(ids, fetcher) {
  const [index, config] = await Promise.all([
    request(fetcher, `${AGUIAR}/cat-importado`).then(r => r.text()),
    request(fetcher, `${AGUIAR}/supabase-config.js`).then(r => r.text()),
  ]);
  const pages = importedPages(index);
  if (pages.length > 40) throw new Error("Fonte incompleta");
  const records = [];
  for (let offset = 0; offset < pages.length; offset += 3) {
    const batch = await Promise.all(pages.slice(offset, offset + 3).map(async sourcePath => sneakerRecords(await (await request(fetcher, AGUIAR + sourcePath)).text(), sourcePath)));
    records.push(...batch.flat());
  }
  if (new Set(records.map(record => record.id)).size !== records.length) throw new Error("Modelo duplicado");
  const selected = records.filter(record => ids.has(`aguiar-${record.id}`));
  if (!selected.length) return [];
  const host = config.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const publicKey = config.match(/SUPABASE_ANON\s*=\s*["']([^"']+)["']/)?.[1];
  if (!publicKey || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(host || "")) throw new Error("Fonte não reconhecida");
  const query = new URLSearchParams({ select: "drive_id,price", drive_id: `in.(${selected.map(r => r.id).join(",")})` });
  const prices = await (await request(fetcher, `${host.replace(/\/$/, "")}/rest/v1/prices?${query}`, { apikey: publicKey, Accept: "application/json" })).json();
  return buildSneakerCatalog(selected, prices).products;
}

// Nothing supplied by the shopper controls a source URL, stock flag or price.
export async function loadFreshProducts(items, fetcher = fetch) {
  const jerseyIds = new Set(items.filter(i => i.productId.startsWith("mic-")).map(i => i.productId));
  const sneakerIds = new Set(items.filter(i => i.productId.startsWith("aguiar-")).map(i => i.productId));
  const groups = await Promise.all([
    jerseyIds.size ? jerseys(jerseyIds, fetcher) : [],
    sneakerIds.size ? sneakers(sneakerIds, fetcher) : [],
  ]);
  return groups.flat();
}
