import { sneakerPrice } from "./pricing.mjs";

function decode(value = "") {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#39|#34);/g, entity => ({
    "&amp;": "&", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&#34;": '"', "&lt;": "<", "&gt;": ">",
  }[entity]));
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1], decode(match[3])]));
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

