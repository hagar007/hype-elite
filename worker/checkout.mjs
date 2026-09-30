import { loadFreshProducts } from "./sources.mjs";

const encoder = new TextEncoder();
const STRIPE_VERSION = "2026-08-26.dahlia";
// Stable per integration: changing it between attempts would defeat idempotency.
const INTEGRATION_IDENTIFIER = "hype_elite_checkout_ryqzndtq";
const SESSION_ID = /^cs_(?:test_|live_)?[A-Za-z0-9]{10,240}$/;
const REQUEST_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export class CheckoutError extends Error {
  constructor(status, code, message, extra = {}) { super(message); Object.assign(this, { status, code, extra }); }
}

export function validateItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new CheckoutError(400, "invalid_cart", "Confira os itens da sua sacola.");
  const seen = new Set();
  return items.map(item => {
    if (!item || typeof item.productId !== "string" || !/^(?:mic|aguiar)-[A-Za-z0-9_-]{1,128}$/.test(item.productId) || typeof item.size !== "string" || !/^[A-Za-z0-9 -]{1,24}$/.test(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new CheckoutError(400, "invalid_cart", "Confira os itens da sua sacola.");
    const key = `${item.productId}:${item.size}`;
    if (seen.has(key)) throw new CheckoutError(400, "invalid_cart", "Confira as quantidades da sua sacola.");
    seen.add(key);
    return { productId: item.productId, size: item.size, quantity: item.quantity };
  }).sort((a, b) => `${a.productId}:${a.size}`.localeCompare(`${b.productId}:${b.size}`));
}

function couponCode(value = "") {
  if (typeof value !== "string" || value.length > 64) throw new CheckoutError(400, "invalid_coupon", "Confira o código do cupom.");
  const code = value.trim().toUpperCase();
  if (code && !/^[A-Z0-9_-]{1,64}$/.test(code)) throw new CheckoutError(400, "invalid_coupon", "Confira o código do cupom.");
  return code;
}

function configured(env) {
  return env.CHECKOUT_ENABLED === "true" && Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.ORDERS?.put && env.ORDERS?.get);
}

function storeUrl(env) {
  const url = new URL(env.STORE_URL);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Configuração inválida");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

async function readBody(request, maxBytes = 16384) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new CheckoutError(415, "invalid_request", "Envie uma solicitação válida.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw new CheckoutError(413, "invalid_request", "Solicitação muito grande.");
  const reader = request.body?.getReader();
  if (!reader) throw new CheckoutError(400, "invalid_request", "Solicitação inválida.");
  const chunks = []; let size = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new CheckoutError(413, "invalid_request", "Solicitação muito grande."); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const raw = new TextDecoder().decode(bytes);
  try { return { raw, data: JSON.parse(raw) }; } catch { throw new CheckoutError(400, "invalid_request", "Solicitação inválida."); }
}

async function digest(text) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))), b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyWebhook(raw, signature, secret, now = Date.now()) {
  const fields = String(signature || "").split(",");
  const timestamps = fields.filter(f => f.startsWith("t="));
  const timestamp = Number(timestamps[0]?.slice(2));
  const signatures = fields.filter(f => /^v1=[a-f0-9]{64}$/.test(f)).map(f => f.slice(3));
  if (timestamps.length !== 1 || !Number.isInteger(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > 300 || !secret || !signatures.length) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  for (const hex of signatures) {
    const bytes = new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)));
    if (await crypto.subtle.verify("HMAC", key, bytes, encoder.encode(`${timestamp}.${raw}`))) return true;
  }
  return false;
}

export function createHandler({ fetcher = fetch, loadProducts = loadFreshProducts, now = () => Date.now() } = {}) {
  async function stripe(env, path, form, idempotencyKey) {
    const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Stripe-Version": STRIPE_VERSION };
    if (form) headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const response = await fetcher(`https://api.stripe.com/v1/${path}`, { method: form ? "POST" : "GET", headers, body: form?.toString(), signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok) {
      if (data.error?.param?.startsWith("discounts") || /promotion|coupon/.test(data.error?.code || "")) throw new CheckoutError(400, "invalid_coupon", "Esse cupom não pode ser usado nesta compra. Confira o código e as condições.");
      throw new CheckoutError(503, "payment_unavailable", "Não foi possível abrir o pagamento. Tente novamente em instantes.");
    }
    return data;
  }

  async function saveOrder(env, session) {
    await env.ORDERS.put(`session:${session.id}`, JSON.stringify({ sessionId: session.id, requestId: session.metadata?.request_id, status: session.payment_status, totalCents: session.amount_total, updatedAt: new Date(now()).toISOString() }));
  }

  async function session(env, body) {
    if (!REQUEST_ID.test(body.requestId || "")) throw new CheckoutError(400, "invalid_request", "Atualize a sacola e tente novamente.");
    const items = validateItems(body.items);
    const code = couponCode(body.couponCode);
    let products;
    try { products = await loadProducts(items, fetcher); } catch { throw new CheckoutError(503, "source_unavailable", "Não conseguimos conferir o catálogo agora. Tente novamente em instantes."); }
    const lines = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const variant = product?.variants?.find(v => v.size === item.size);
      const unitAmount = Math.round((variant?.price || 0) * 100);
      if (!product?.published || !product.available || !variant?.available || !Number.isSafeInteger(unitAmount) || unitAmount <= 0 || unitAmount % 100 !== 99 || !product.freeShipping) throw new CheckoutError(409, "item_unavailable", "Um item ou tamanho ficou indisponível. Confira sua sacola.");
      return { ...item, unitAmount, product };
    });
    const subtotalCents = lines.reduce((total, line) => total + line.unitAmount * line.quantity, 0);
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 99999999) throw new CheckoutError(400, "invalid_cart", "Revise as quantidades da sua sacola.");
    const needsConfirmation = lines.filter(line => line.product.availabilityConfirmation);
    if (needsConfirmation.length) {
      await env.ORDERS.put(`confirmation:${body.requestId}`, JSON.stringify({ items: needsConfirmation.map(({ product, ...line }) => ({ ...line, name: product.name })), createdAt: new Date(now()).toISOString() }));
      for (const line of needsConfirmation) {
        const confirmation = await env.ORDERS.get(`stock:${body.requestId}:${line.productId}:${line.size}`, "json");
        const expires = Date.parse(confirmation?.expiresAt);
        if (!confirmation || !Number.isInteger(confirmation.quantity) || confirmation.quantity < line.quantity || !Number.isFinite(expires) || expires <= now() || expires > now() + 3600000) throw new CheckoutError(409, "confirmation_required", "Precisamos confirmar a disponibilidade dos tênis antes do pagamento. Sua seleção ficou salva.");
      }
    }
    const form = new URLSearchParams({
      mode: "payment", locale: "pt-BR",
      integration_identifier: INTEGRATION_IDENTIFIER,
      success_url: `${storeUrl(env)}pagamento.html?session_id={CHECKOUT_SESSION_ID}&pedido=${body.requestId}`,
      cancel_url: `${storeUrl(env)}carrinho.html?pagamento=cancelado`,
      "shipping_address_collection[allowed_countries][0]": "BR",
      "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
      "shipping_options[0][shipping_rate_data][fixed_amount][amount]": "0",
      "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "brl",
      "shipping_options[0][shipping_rate_data][display_name]": "Frete grátis",
      "metadata[store]": "hype-elite", "metadata[request_id]": body.requestId,
      "payment_intent_data[metadata][store]": "hype-elite",
      "payment_intent_data[metadata][request_id]": body.requestId,
      client_reference_id: body.requestId,
    });
    if (code) {
      const promotion = await stripe(env, `promotion_codes?${new URLSearchParams({ code, active: "true", limit: "2" })}`);
      if (!Array.isArray(promotion.data) || promotion.data.length !== 1 || !promotion.data[0].active || String(promotion.data[0].code).toUpperCase() !== code) throw new CheckoutError(400, "invalid_coupon", "Cupom não encontrado ou indisponível.");
      form.set("discounts[0][promotion_code]", promotion.data[0].id);
    } else form.set("allow_promotion_codes", "true");
    lines.forEach((line, i) => {
      const prefix = `line_items[${i}]`;
      form.set(`${prefix}[quantity]`, String(line.quantity));
      form.set(`${prefix}[price_data][currency]`, "brl");
      form.set(`${prefix}[price_data][unit_amount]`, String(line.unitAmount));
      form.set(`${prefix}[price_data][product_data][name]`, `${line.product.name} · ${line.size}`.slice(0, 250));
      form.set(`${prefix}[price_data][product_data][metadata][product_id]`, line.productId);
      form.set(`${prefix}[price_data][product_data][metadata][size]`, line.size);
      if (line.product.photos?.[0]?.startsWith("https://")) form.set(`${prefix}[price_data][product_data][images][0]`, line.product.photos[0]);
    });
    // Same cart, request ID and coupon reuse the session; new prices produce a new key.
    const key = `he-${body.requestId}-${await digest(form.toString())}`;
    const data = await stripe(env, "checkout/sessions", form, key);
    if (data.currency !== "brl" || data.amount_subtotal !== subtotalCents || !Number.isSafeInteger(data.amount_total) || data.amount_total < 0 || data.amount_total > subtotalCents || !SESSION_ID.test(data.id || "")) throw new CheckoutError(503, "payment_unavailable", "Não foi possível conferir o pagamento. Tente novamente.");
    const url = new URL(data.url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new CheckoutError(503, "payment_unavailable", "Não foi possível abrir o pagamento. Tente novamente.");
    await saveOrder(env, data);
    return { data, quote: { subtotalCents, discountCents: subtotalCents - data.amount_total, totalCents: data.amount_total, couponCode: code, lines: lines.map(({ product, ...line }) => line) } };
  }

  return {
    async fetch(request, env) {
      let origin, cors = {};
      const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cors } });
      try {
        const path = new URL(request.url).pathname.replace(/\/$/, "");
        if (path === "/stripe/webhook" && request.method === "POST") {
          if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY || !env.ORDERS?.put) throw new CheckoutError(503, "unconfigured", "Serviço indisponível.");
          const { raw, data: event } = await readBody(request, 262144);
          if (!await verifyWebhook(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET, now())) throw new CheckoutError(400, "invalid_signature", "Assinatura inválida.");
          if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
            const id = event.data?.object?.id;
            if (!SESSION_ID.test(id || "")) throw new CheckoutError(400, "invalid_event", "Evento inválido.");
            const current = await stripe(env, `checkout/sessions/${id}`);
            if (current.metadata?.store === "hype-elite") await saveOrder(env, current);
          }
          return json({ received: true });
        }
        origin = request.headers.get("origin");
        const allowed = new Set([storeUrl(env).origin, ...(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)]);
        if (!origin || !allowed.has(origin)) throw new CheckoutError(403, "origin_forbidden", "Acesse o pagamento pela loja.");
        cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
        if (!["/quote", "/checkout", "/checkout/session"].includes(path)) return json({ code: "not_found", message: "Página não encontrada." }, 404);
        if (request.method !== "POST") return json({ code: "method_not_allowed", message: "Método inválido." }, 405);
        if (!configured(env)) throw new CheckoutError(503, "checkout_disabled", "As compras online estarão disponíveis em breve. Sua seleção fica salva neste navegador.");
        const { data: body } = await readBody(request);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new CheckoutError(400, "invalid_request", "Solicitação inválida.");
        if (path === "/checkout/session") {
          if (!SESSION_ID.test(body.sessionId || "") || !REQUEST_ID.test(body.requestId || "")) throw new CheckoutError(400, "invalid_request", "Não foi possível conferir esse pedido.");
          const current = await stripe(env, `checkout/sessions/${body.sessionId}`);
          if (current.metadata?.store !== "hype-elite" || current.metadata?.request_id !== body.requestId) throw new CheckoutError(404, "order_not_found", "Pedido não encontrado.");
          const paid = current.payment_status === "paid" || (current.payment_status === "no_payment_required" && current.status === "complete");
          return json({ paid, status: current.status, totalCents: current.amount_total, requestId: body.requestId });
        }
        const { data, quote } = await session(env, body);
        if (path === "/quote") return json({ quote });
        if (!Number.isSafeInteger(body.expectedTotalCents) || body.expectedTotalCents !== quote.totalCents || body.expectedSubtotalCents !== quote.subtotalCents) throw new CheckoutError(409, "price_changed", "O valor foi atualizado. Confira o resumo e finalize novamente.", { quote });
        return json({ url: data.url, quote });
      } catch (error) {
        if (error instanceof CheckoutError) return json({ code: error.code, message: error.message, ...error.extra }, error.status);
        return json({ code: "temporarily_unavailable", message: "Não foi possível concluir agora. Tente novamente em instantes." }, 503);
      }
    },
  };
}

export default createHandler();
