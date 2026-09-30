(function () {
  "use strict";
  const api = window.HypeElite, payment = window.HypeEliteCheckout;
  const itemsTarget = document.querySelector("[data-cart-items]");
  const summaryTarget = document.querySelector("[data-cart-summary]");
  let code = payment.coupon(), quote = null, quoteKey = "", busy = false, message = "", errorMessage = false, couponOpen = Boolean(code);
  if (new URLSearchParams(location.search).get("pagamento") === "cancelado") message = "Pagamento não concluído. Seus itens continuam na sacola.";

  function items() { return api.getCart().map(item => ({ ...item, product: api.getProduct(item.productId) })); }
  function subtotal(cart) { return cart.reduce((sum, item) => sum + (api.isSizeAvailable(item.product, item.size) ? Math.round(api.getProductPrice(item.product, item.size) * 100) * item.quantity : 0), 0); }
  function hasUnavailable(cart) { return cart.some(item => !api.isSizeAvailable(item.product, item.size)); }
  function currentKey() { return payment.cartKey(api.getCart(), code); }
  function notice(text, isError = false) { message = text; errorMessage = isError; }
  function payload() { const cart = api.getCart(); return { items: cart, couponCode: code, requestId: payment.requestId(cart, code) }; }
  function useQuote(value) { quote = value; quoteKey = currentKey(); }
  function editQuantity(productId, size, delta) {
    if (busy) return;
    const cart = api.getCart(), item = cart.find(entry => entry.productId === productId && entry.size === size);
    if (!item || (delta > 0 && !api.isSizeAvailable(api.getProduct(productId), size))) return;
    item.quantity = Math.min(99, Math.max(1, item.quantity + delta)); api.saveCart(cart);
  }
  function remove(productId, size) { if (!busy) api.saveCart(api.getCart().filter(item => !(item.productId === productId && item.size === size))); }

  async function applyCoupon(event) {
    event.preventDefault(); if (busy) return;
    const input = summaryTarget.querySelector("[data-coupon-input]");
    try { code = payment.normalizeCoupon(input.value); } catch (error) { notice(error.message, true); render(); return; }
    payment.saveCoupon(code); quote = null; quoteKey = ""; couponOpen = true;
    if (!code) { notice("Digite um código de cupom."); render(); return; }
    if (!payment.isConfigured()) { notice("Cupom salvo. O desconto será conferido quando as compras online forem liberadas."); render(); return; }
    busy = true; notice("Conferindo cupom e disponibilidade…"); render();
    const expectedKey = currentKey();
    try {
      const data = await payment.request("/quote", payload());
      if (expectedKey !== currentKey()) return;
      useQuote(data.quote); notice(data.quote.discountCents > 0 ? "Cupom aplicado ao resumo da compra." : "Cupom conferido. Não há desconto para estes itens.");
    } catch (error) { if (expectedKey === currentKey()) notice(error.message, true); }
    finally { busy = false; render(); }
  }

  async function checkout() {
    if (busy || hasUnavailable(items()) || !payment.isConfigured()) return;
    const expectedKey = currentKey(), body = payload();
    const displayedSubtotal = quote && quoteKey === expectedKey ? quote.subtotalCents : subtotal(items());
    busy = true; notice("Conferindo sua compra…"); render();
    try {
      const data = await payment.request("/quote", body);
      if (expectedKey !== currentKey()) return;
      const changed = data.quote.subtotalCents !== displayedSubtotal || (quote && quoteKey === expectedKey && quote.totalCents !== data.quote.totalCents);
      useQuote(data.quote);
      if (changed) { notice("O valor foi atualizado. Confira o resumo e finalize novamente."); return; }
      const result = await payment.request("/checkout", { ...body, expectedSubtotalCents: data.quote.subtotalCents, expectedTotalCents: data.quote.totalCents });
      if (expectedKey !== currentKey()) return;
      payment.rememberOrder(body.requestId, body.items);
      location.assign(result.url);
    } catch (error) {
      if (expectedKey === currentKey()) { if (error.quote) useQuote(error.quote); notice(error.message, true); }
    } finally { busy = false; render(); }
  }

  function render() {
    if (!itemsTarget || !summaryTarget) return;
    const cart = items(), unavailable = hasUnavailable(cart), ready = payment.isConfigured();
    const activeQuote = quote && quoteKey === currentKey() ? quote : null;
    const subtotalCents = activeQuote ? activeQuote.subtotalCents : subtotal(cart);
    const freeShipping = cart.every(item => item.product?.freeShipping);
    if (!cart.length) {
      itemsTarget.innerHTML = `<div class="cart-empty"><div class="cart-empty__inner"><h2>Sua sacola está vazia.</h2><p>Encontre seu próximo favorito no catálogo.</p><a class="button" href="${api.path("catalogo.html")}">Explorar catálogo</a></div></div>`;
      summaryTarget.innerHTML = `<h2>Resumo</h2><div class="summary-line"><span>Subtotal</span><span>—</span></div><div class="summary-line"><span>Frete dos produtos</span><span>Grátis</span></div><div class="summary-total"><span>Total</span><strong>—</strong></div><button class="button button--wide" type="button" disabled>Finalizar compra</button>`;
      return;
    }
    itemsTarget.innerHTML = cart.map(item => {
      const available = api.isSizeAvailable(item.product, item.size);
      const currentPrice = activeQuote?.lines.find(line => line.productId === item.productId && line.size === item.size)?.unitAmount;
      const price = available ? (currentPrice ?? Math.round(api.getProductPrice(item.product, item.size) * 100)) * item.quantity / 100 : null;
      return `<article class="cart-item">
        ${item.product ? api.productVisual(item.product) : '<div class="cart-item__missing">Produto indisponível</div>'}
        <div class="cart-item__details">
          <h2>${item.product ? `<a href="${api.productUrl(item.product)}">${api.escapeHtml(item.product.name)}</a>` : "Produto indisponível"}</h2>
          <p>Tamanho: ${api.escapeHtml(item.size)}</p>
          ${item.product?.availabilityConfirmation ? '<p class="cart-item__availability">Sob encomenda · disponibilidade a confirmar</p>' : ""}
          ${available ? "" : '<p class="cart-item__unavailable">Item indisponível. Remova-o para continuar.</p>'}
          <div class="cart-item__quantity" aria-label="Quantidade">
            <button type="button" data-decrease="${api.escapeHtml(item.productId)}" data-size="${api.escapeHtml(item.size)}" aria-label="Diminuir quantidade" ${busy ? "disabled" : ""}>−</button>
            <span>${item.quantity}</span>
            <button type="button" data-increase="${api.escapeHtml(item.productId)}" data-size="${api.escapeHtml(item.size)}" aria-label="Aumentar quantidade" ${available && !busy ? "" : "disabled"}>+</button>
          </div>
        </div>
        <div class="cart-item__aside"><strong>${api.formatPrice(price)}</strong><button class="cart-item__remove" type="button" data-remove="${api.escapeHtml(item.productId)}" data-size="${api.escapeHtml(item.size)}" ${busy ? "disabled" : ""}>Remover</button></div>
      </article>`;
    }).join("");
    summaryTarget.setAttribute("aria-busy", String(busy));
    summaryTarget.innerHTML = `<h2>Resumo</h2>
      <div class="summary-line"><span>Subtotal</span><span>${api.formatPrice(subtotalCents / 100)}</span></div>
      <div class="summary-line"><span>Frete</span><span>${freeShipping ? "Grátis" : "A confirmar"}</span></div>
      <details class="coupon-box" ${couponOpen ? "open" : ""}>
        <summary>Tem um cupom?</summary>
        <form data-coupon-form>
          <label for="coupon-code">Código do cupom</label>
          <div class="coupon-box__row"><input id="coupon-code" data-coupon-input type="text" value="${api.escapeHtml(code)}" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Digite seu cupom" ${busy ? "disabled" : ""}><button class="button button--outline" type="submit" ${busy || unavailable ? "disabled" : ""}>Aplicar</button></div>
        </form>
        ${code ? `<button class="coupon-box__remove" data-remove-coupon type="button" ${busy ? "disabled" : ""}>Remover cupom</button>` : ""}
      </details>
      ${activeQuote?.discountCents ? `<div class="summary-line summary-line--discount"><span>Desconto</span><span>− ${api.formatPrice(activeQuote.discountCents / 100)}</span></div>` : ""}
      <div class="summary-total"><span>${unavailable ? "Total dos disponíveis" : "Total"}</span><strong>${api.formatPrice((activeQuote ? activeQuote.totalCents : subtotalCents) / 100)}</strong></div>
      <button class="button button--wide" type="button" data-checkout ${ready && !unavailable && !busy ? "" : "disabled"}>${busy ? "Conferindo…" : "Finalizar compra"}</button>
      <p class="cart-summary__note">${unavailable ? "Remova os itens indisponíveis para continuar." : ready ? "Pagamento seguro. Preço e disponibilidade conferidos ao finalizar." : "As compras online estarão disponíveis em breve. Sua seleção fica salva neste navegador."}</p>
      <p class="checkout-message ${errorMessage ? "checkout-message--error" : ""}" role="status" aria-live="polite" data-checkout-message>${api.escapeHtml(message || (code && !activeQuote ? "Cupom salvo, desconto ainda não confirmado." : ""))}</p>`;
    itemsTarget.querySelectorAll("[data-decrease]").forEach(button => button.addEventListener("click", () => editQuantity(button.dataset.decrease, button.dataset.size, -1)));
    itemsTarget.querySelectorAll("[data-increase]").forEach(button => button.addEventListener("click", () => editQuantity(button.dataset.increase, button.dataset.size, 1)));
    itemsTarget.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => remove(button.dataset.remove, button.dataset.size)));
    summaryTarget.querySelector("details").addEventListener("toggle", event => { couponOpen = event.target.open; });
    summaryTarget.querySelector("[data-coupon-form]").addEventListener("submit", applyCoupon);
    summaryTarget.querySelector("[data-remove-coupon]")?.addEventListener("click", () => { code = ""; quote = null; quoteKey = ""; payment.saveCoupon(""); notice("Cupom removido."); render(); });
    summaryTarget.querySelector("[data-checkout]").addEventListener("click", checkout);
  }
  window.addEventListener("hypeelite:cart-updated", () => { quote = null; quoteKey = ""; notice(code ? "Confira o cupom novamente para atualizar o desconto." : ""); render(); });
  window.addEventListener("storage", event => { if (event.key === "hypeEliteCart") { quote = null; quoteKey = ""; render(); } });
  render();
})();
