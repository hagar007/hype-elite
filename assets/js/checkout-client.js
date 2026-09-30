(function () {
  "use strict";
  const settings = window.HYPE_ELITE_STORE.settings;

  function endpoint() {
    if (settings.checkoutEnabled !== true || !settings.checkoutApiUrl) return null;
    try {
      const url = new URL(settings.checkoutApiUrl);
      const local = ["localhost", "127.0.0.1"].includes(location.hostname) && ["localhost", "127.0.0.1"].includes(url.hostname);
      if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash) return null;
      return url.href.replace(/\/$/, "");
    } catch { return null; }
  }

  function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function saveCoupon(code) { try { code ? localStorage.setItem("hypeEliteCoupon", code) : localStorage.removeItem("hypeEliteCoupon"); } catch {} }
  function coupon() { return (storageGet("hypeEliteCoupon") || "").slice(0, 64); }
  function normalizeCoupon(value) {
    const code = String(value).trim().toUpperCase();
    if (code && !/^[A-Z0-9_-]{1,64}$/.test(code)) throw new Error("Confira o código do cupom.");
    return code;
  }
  function cartKey(items, code) {
    return JSON.stringify({ items: items.map(({ productId, size, quantity }) => ({ productId, size, quantity })).sort((a, b) => `${a.productId}:${a.size}`.localeCompare(`${b.productId}:${b.size}`)), couponCode: code });
  }
  function requestId(items, code) {
    const fingerprint = cartKey(items, code);
    try {
      const previous = JSON.parse(sessionStorage.getItem("hypeEliteCheckoutRequest") || "null");
      if (previous?.fingerprint === fingerprint && previous.requestId && Date.now() - previous.createdAt < 1200000) return previous.requestId;
    } catch {}
    const id = crypto.randomUUID();
    try { sessionStorage.setItem("hypeEliteCheckoutRequest", JSON.stringify({ fingerprint, requestId: id, createdAt: Date.now() })); } catch {}
    return id;
  }
  function validQuote(quote) {
    return quote && [quote.subtotalCents, quote.discountCents, quote.totalCents].every(v => Number.isSafeInteger(v) && v >= 0)
      && quote.totalCents + quote.discountCents === quote.subtotalCents && Array.isArray(quote.lines)
      && quote.lines.every(line => typeof line.productId === "string" && typeof line.size === "string" && Number.isInteger(line.quantity) && line.quantity > 0 && Number.isInteger(line.unitAmount) && line.unitAmount > 0)
      && quote.lines.reduce((total, line) => total + line.unitAmount * line.quantity, 0) === quote.subtotalCents;
  }
  function stripeUrl(value) {
    try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "checkout.stripe.com" && !url.username && !url.password; } catch { return false; }
  }
  async function request(route, body) {
    const base = endpoint();
    if (!base) throw new Error("As compras online estarão disponíveis em breve. Sua seleção fica salva neste navegador.");
    let response, data;
    try {
      response = await fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000), credentials: "omit" });
      data = await response.json();
    } catch { throw new Error("Não foi possível conectar ao pagamento. Tente novamente em instantes."); }
    if (data.quote && !validQuote(data.quote)) throw new Error("Não foi possível conferir o valor. Tente novamente.");
    if (!response.ok) {
      const error = new Error(typeof data.message === "string" ? data.message : "Não foi possível concluir agora.");
      error.code = data.code; error.quote = data.quote; throw error;
    }
    if ((route === "/quote" || route === "/checkout") && !validQuote(data.quote)) throw new Error("Não foi possível conferir o valor. Tente novamente.");
    if (route === "/checkout" && !stripeUrl(data.url)) throw new Error("Não foi possível abrir o pagamento. Tente novamente.");
    return data;
  }
  function rememberOrder(id, items) {
    try { sessionStorage.setItem("hypeElitePendingOrder", JSON.stringify({ requestId: id, items })); } catch {}
  }
  function completeOrder(sessionId, id) {
    try {
      if (sessionStorage.getItem(`hypeElitePaid:${sessionId}`)) return;
      const pending = JSON.parse(sessionStorage.getItem("hypeElitePendingOrder") || "null");
      if (pending?.requestId !== id || !Array.isArray(pending.items)) return;
      const purchased = new Map(pending.items.map(item => [`${item.productId}:${item.size}`, item.quantity]));
      const remaining = window.HypeElite.getCart().map(item => ({ ...item, quantity: Math.max(0, item.quantity - (purchased.get(`${item.productId}:${item.size}`) || 0)) })).filter(item => item.quantity > 0);
      // Mark before changing the cart so a reload cannot subtract a second time.
      sessionStorage.setItem(`hypeElitePaid:${sessionId}`, "true");
      window.HypeElite.saveCart(remaining);
      sessionStorage.removeItem("hypeElitePendingOrder");
      saveCoupon("");
    } catch {}
  }
  window.HypeEliteCheckout = { isConfigured: () => Boolean(endpoint()), coupon, saveCoupon, normalizeCoupon, cartKey, requestId, request, stripeUrl, rememberOrder, completeOrder };
})();
