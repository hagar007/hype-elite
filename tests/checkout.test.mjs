import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createHandler, validateItems, verifyWebhook } from "../worker/checkout.mjs";
import { loadFreshProducts } from "../worker/sources.mjs";
import { ending99Cents, retailPrice, sneakerPrice } from "../shared/pricing.mjs";

const now = Date.parse("2026-09-29T23:40:00Z");
const requestId = "10eacacf-60ad-4b19-8cbb-123456789abc";
const sessionId = "cs_test_abcdefghijklmnopqrstuvwxyz123456";
const item = { productId: "mic-model-1", size: "P", quantity: 1 };
const product = { id: item.productId, name: "Camisa Flamengo", published: true, available: true, freeShipping: true, variants: [{ size: "P", available: true, price: 135.99 }], photos: ["https://cdn.shopify.com/test.jpg"] };

function fixture({ products = [product], discount = 0, couponExists = true, stripeUrl = "https://checkout.stripe.com/c/pay/test", paid = false } = {}) {
  const values = new Map(), calls = [];
  const env = { STORE_URL: "https://hagar007.github.io/hype-elite/", CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", ORDERS: { put: async (key, value) => values.set(key, value), get: async (key, type) => values.has(key) ? type === "json" ? JSON.parse(values.get(key)) : values.get(key) : null } };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("promotion_codes?")) return Response.json({ data: couponExists ? [{ id: "promo_fixture", active: true, code: "TESTE" }] : [] });
    if (options.method === "GET") return Response.json({ id: sessionId, metadata: { store: "hype-elite", request_id: requestId }, payment_status: paid ? "paid" : "unpaid", amount_total: 13599, status: paid ? "complete" : "open" });
    const form = new URLSearchParams(options.body);
    let subtotal = 0;
    for (let i = 0; form.has(`line_items[${i}][quantity]`); i++) subtotal += Number(form.get(`line_items[${i}][quantity]`)) * Number(form.get(`line_items[${i}][price_data][unit_amount]`));
    return Response.json({ id: sessionId, currency: "brl", amount_subtotal: subtotal, amount_total: subtotal - discount, payment_status: "unpaid", metadata: { request_id: requestId }, url: stripeUrl });
  };
  const handler = createHandler({ fetcher, loadProducts: async () => products, now: () => now });
  const call = async (path, extra = {}, origin = "https://hagar007.github.io") => {
    const response = await handler.fetch(new Request(`https://checkout.example${path}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ requestId, items: [item], ...extra }) }), env);
    return { status: response.status, data: await response.json(), response };
  };
  return { env, values, calls, call, handler };
}

test("preços terminam em 99 sem mudar o real nem diminuir o acréscimo", () => {
  for (const [cost, shirt, shoe] of [["100.02", 175.99, 250.99], ["100.18", 175.99, 250.99], ["100.98", 175.99, 250.99], ["100.99", 175.99, 250.99], ["100", 175.99, 250.99]]) { assert.equal(retailPrice(cost), shirt); assert.equal(sneakerPrice(cost), shoe); }
  assert.equal(ending99Cents(19999), 19999);
  assert.equal(ending99Cents(Number.MAX_SAFE_INTEGER), null);
  assert.equal(retailPrice("90071992547409.91"), null);
});

test("o servidor ignora preços enviados pelo navegador e cobra a variação atual", async () => {
  const f = fixture();
  const result = await f.call("/checkout", { items: [{ ...item, price: 0.01, available: true }], expectedTotalCents: 13599, expectedSubtotalCents: 13599 });
  assert.equal(result.status, 200);
  assert.equal(result.data.quote.totalCents, 13599);
  const form = new URLSearchParams(f.calls[0].options.body);
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "13599");
  assert.equal(form.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), "0");
  assert.equal(form.get("shipping_address_collection[allowed_countries][0]"), "BR");
  assert.match(form.get("success_url"), /hype-elite\/pagamento.html/);
  assert.ok(!JSON.stringify(result.data).includes(f.env.STRIPE_SECRET_KEY));
});

test("cupom e total vêm do Stripe, sem criar descontos locais", async () => {
  const f = fixture({ discount: 2345 });
  const result = await f.call("/quote", { couponCode: " teste " });
  assert.equal(result.status, 200);
  assert.equal(result.data.quote.discountCents, 2345);
  assert.equal(result.data.quote.totalCents, 11254);
  const form = new URLSearchParams(f.calls[1].options.body);
  assert.equal(form.get("discounts[0][promotion_code]"), "promo_fixture");
  assert.equal(form.has("allow_promotion_codes"), false);
});

test("cupom inexistente não cria uma sessão de pagamento", async () => {
  const f = fixture({ couponExists: false });
  const result = await f.call("/quote", { couponCode: "TESTE" });
  assert.equal(result.status, 400); assert.equal(result.data.code, "invalid_coupon"); assert.equal(f.calls.length, 1);
});

test("preço atualizado exige revisar o total e não fornece redirecionamento", async () => {
  const f = fixture();
  const result = await f.call("/checkout", { expectedSubtotalCents: 13518, expectedTotalCents: 13518 });
  assert.equal(result.status, 409); assert.equal(result.data.code, "price_changed"); assert.equal(result.data.quote.totalCents, 13599); assert.equal(result.data.url, undefined);
});

test("tentativas repetidas usam a mesma chave de idempotência", async () => {
  const f = fixture();
  await f.call("/quote"); await f.call("/checkout", { expectedSubtotalCents: 13599, expectedTotalCents: 13599 });
  assert.equal(f.calls[0].options.headers["Idempotency-Key"], f.calls[1].options.headers["Idempotency-Key"]);
});

test("tamanhos indisponíveis, quantidades inválidas e itens duplicados não podem pagar", async () => {
  for (const items of [[], [{ ...item, quantity: -1 }], [{ ...item, quantity: 1.5 }], [{ ...item, quantity: 100 }], [item, item], [{ ...item, productId: "https://evil.example" }]]) assert.throws(() => validateItems(items));
  const f = fixture({ products: [{ ...product, variants: [{ size: "P", available: false, price: 135.99 }] }] });
  assert.equal((await f.call("/quote")).data.code, "item_unavailable"); assert.equal(f.calls.length, 0);
  const removed = fixture({ products: [] }); assert.equal((await removed.call("/quote")).status, 409);
});

test("tênis exigem confirmação para o pedido, tamanho e quantidade exatos", async () => {
  const shoe = { ...product, id: "aguiar-shoe-1", availabilityConfirmation: true, variants: [{ size: "39", available: true, price: 310.99 }] };
  const selected = { productId: shoe.id, size: "39", quantity: 2 };
  const f = fixture({ products: [shoe] });
  assert.equal((await f.call("/quote", { items: [selected] })).data.code, "confirmation_required"); assert.equal(f.calls.length, 0);
  const key = `stock:${requestId}:${shoe.id}:39`;
  f.values.set(key, JSON.stringify({ quantity: 1, expiresAt: new Date(now + 300000).toISOString() }));
  assert.equal((await f.call("/quote", { items: [selected] })).status, 409);
  f.values.set(key, JSON.stringify({ quantity: 2, expiresAt: new Date(now + 300000).toISOString() }));
  assert.equal((await f.call("/quote", { items: [selected] })).data.quote.totalCents, 62198);
  f.values.set(key, JSON.stringify({ quantity: 2, expiresAt: new Date(now - 1).toISOString() }));
  assert.equal((await f.call("/quote", { items: [selected] })).status, 409);
});

test("sem configuração completa ou origem autorizada o checkout permanece bloqueado", async () => {
  const f = fixture();
  const denied = await f.call("/quote", {}, "https://evil.example"); assert.equal(denied.status, 403); assert.equal(denied.response.headers.get("Access-Control-Allow-Origin"), null);
  f.env.CHECKOUT_ENABLED = "false"; assert.equal((await f.call("/quote")).data.code, "checkout_disabled"); assert.equal(f.calls.length, 0);
  f.env.CHECKOUT_ENABLED = "true"; delete f.env.STRIPE_WEBHOOK_SECRET; assert.equal((await f.call("/quote")).status, 503);
});

test("falha na fonte ou no registro do pedido bloqueia o redirecionamento", async () => {
  const f = fixture();
  const handler = createHandler({ loadProducts: async () => { throw new Error("falha interna privada"); } });
  const result = await handler.fetch(new Request("https://checkout.example/quote", { method: "POST", headers: { Origin: "https://hagar007.github.io", "Content-Type": "application/json" }, body: JSON.stringify({ requestId, items: [item] }) }), f.env);
  assert.equal(result.status, 503); assert.equal((await result.json()).code, "source_unavailable");
  f.env.ORDERS.put = async () => { throw new Error("KV indisponível"); };
  const blocked = await f.call("/checkout", { expectedTotalCents: 13599, expectedSubtotalCents: 13599 }); assert.equal(blocked.status, 503); assert.equal(blocked.data.url, undefined);
});

test("redirecionamentos externos e sessões de outro pedido são recusados", async () => {
  const f = fixture({ stripeUrl: "https://checkout.stripe.com.evil.example/pay" }); assert.equal((await f.call("/quote")).status, 503);
  const good = fixture({ paid: true });
  assert.equal((await good.call("/checkout/session", { sessionId })).data.paid, true);
  assert.equal((await good.call("/checkout/session", { sessionId, requestId: "20eacacf-60ad-4b19-8cbb-123456789abc" })).status, 404);
  assert.equal((await fixture().call("/checkout/session", { sessionId })).data.paid, false);
});

test("webhook verifica conteúdo original, assinatura e prazo de cinco minutos", async () => {
  const raw = JSON.stringify({ id: "evt_fixture", type: "checkout.session.completed", data: { object: { id: sessionId } } });
  const timestamp = Math.floor(now / 1000), secret = "whsec_fixture";
  const sign = body => `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  assert.equal(await verifyWebhook(raw, sign(raw), secret, now), true);
  assert.equal(await verifyWebhook(raw + " ", sign(raw), secret, now), false);
  assert.equal(await verifyWebhook(raw, sign(raw), secret, now + 301000), false);
  const f = fixture({ paid: true });
  const response = await f.handler.fetch(new Request("https://checkout.example/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": sign(raw) }, body: raw }), f.env);
  assert.equal(response.status, 200); assert.equal(JSON.parse(f.values.get(`session:${sessionId}`)).status, "paid");
});

test("consulta fresca usa a mesma regra do catálogo e cruza as duas fontes de estoque", async () => {
  const models = [{ id: "model-1", name: "Camisa Flamengo", team_id: "team-1", photos: ["https://cdn.shopify.com/test.jpg"], sizes: ["P"], shopify_product_id: "10" }];
  const sourceProduct = { id: 10, title: "Camisa Flamengo", options: [{ name: "Tamanho" }], variants: [{ option1: "P", available: true, price: "60.18" }] };
  const fetcher = async url => {
    if (url.includes("entities/Model")) return Response.json(models);
    if (url.includes("entities/Team")) return Response.json([{ id: "team-1", name: "Flamengo", country_id: "br" }]);
    if (url.includes("entities/Country")) return Response.json([{ id: "br", name: "Times Brasileiros" }]);
    if (url.startsWith("https://miccamisasdetime.com.br/products.json")) return Response.json({ products: [sourceProduct] });
    throw new Error("URL inesperada");
  };
  assert.equal((await loadFreshProducts([item], fetcher))[0].variants[0].price, 135.99);
  sourceProduct.variants[0].available = false;
  assert.equal((await loadFreshProducts([item], fetcher))[0].available, false);
});
