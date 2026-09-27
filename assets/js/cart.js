(function () {
  "use strict";

  const api = window.HypeElite;
  const itemsTarget = document.querySelector("[data-cart-items]");
  const summaryTarget = document.querySelector("[data-cart-summary]");

  function validItems() {
    return api.getCart().map((item) => ({ ...item, product: api.getProduct(item.productId) })).filter((item) => item.product);
  }

  function total(items) {
    return items.reduce((sum, item) => sum + (api.isSizeAvailable(item.product, item.size) ? Math.round(api.getProductPrice(item.product, item.size) * 100) * item.quantity : 0), 0) / 100;
  }

  function changeQuantity(productId, size, delta) {
    const cart = api.getCart();
    const item = cart.find((entry) => entry.productId === productId && entry.size === size);
    if (!item) return;
    if (delta > 0 && !api.isSizeAvailable(api.getProduct(productId), size)) return;
    item.quantity = Math.min(99, Math.max(1, item.quantity + delta));
    api.saveCart(cart);
  }

  function removeItem(productId, size) {
    api.saveCart(api.getCart().filter((item) => !(item.productId === productId && item.size === size)));
  }

  function render() {
    if (!itemsTarget || !summaryTarget) return;
    const items = validItems();

    if (!items.length) {
      itemsTarget.innerHTML = `<div class="cart-empty"><div class="cart-empty__inner"><h2>Sua sacola está vazia.</h2><p>Explore as categorias e acompanhe os primeiros lançamentos da Hype Elite.</p><a class="button" href="${api.path("catalogo.html")}">Explorar catálogo</a></div></div>`;
      summaryTarget.innerHTML = `<h2>Resumo</h2><div class="summary-line"><span>Subtotal</span><span>—</span></div><div class="summary-line"><span>Frete das camisas e kits</span><span>Grátis</span></div><div class="summary-total"><span>Total</span><strong>—</strong></div><button class="button button--wide" type="button" disabled>Finalizar compra</button>`;
      return;
    }

    itemsTarget.innerHTML = items.map((item) => `
      <article class="cart-item">
        ${api.productVisual(item.product)}
        <div class="cart-item__details">
          <h2><a href="${api.productUrl(item.product)}">${api.escapeHtml(item.product.name)}</a></h2>
          <p>Tamanho: ${api.escapeHtml(item.size)}</p>
          ${api.isSizeAvailable(item.product, item.size) ? "" : '<p class="cart-item__unavailable">Tamanho indisponível. Remova este item para continuar.</p>'}
          <div class="cart-item__quantity" aria-label="Quantidade">
            <button type="button" data-decrease="${api.escapeHtml(item.product.id)}" data-size="${api.escapeHtml(item.size)}" aria-label="Diminuir quantidade">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-increase="${api.escapeHtml(item.product.id)}" data-size="${api.escapeHtml(item.size)}" aria-label="Aumentar quantidade" ${api.isSizeAvailable(item.product, item.size) ? "" : "disabled"}>+</button>
          </div>
        </div>
        <div class="cart-item__aside">
          <strong>${api.formatPrice(api.isSizeAvailable(item.product, item.size) ? Math.round(api.getProductPrice(item.product, item.size) * 100) * item.quantity / 100 : null)}</strong>
          <button class="cart-item__remove" type="button" data-remove="${api.escapeHtml(item.product.id)}" data-size="${api.escapeHtml(item.size)}">Remover</button>
        </div>
      </article>`).join("");

    const subtotal = total(items);
    const unavailable = items.some(item => !api.isSizeAvailable(item.product, item.size));
    const freeShipping = items.every(item => item.product.freeShipping);
    summaryTarget.innerHTML = `
      <h2>Resumo</h2>
      <div class="summary-line"><span>Subtotal</span><span>${api.formatPrice(subtotal)}</span></div>
      <div class="summary-line"><span>Frete</span><span>${freeShipping ? "Grátis" : "A confirmar"}</span></div>
      <div class="summary-total"><span>${unavailable ? "Total dos disponíveis" : "Total"}</span><strong>${api.formatPrice(subtotal)}</strong></div>
      <button class="button button--wide" type="button" data-checkout ${api.store.settings.checkoutEnabled && !unavailable ? "" : "disabled"}>Finalizar compra</button>
      <p class="cart-summary__note">${unavailable ? "Há itens indisponíveis na sacola. " : ""}As compras online estarão disponíveis em breve. Sua seleção fica salva neste navegador.</p>`;

    itemsTarget.querySelectorAll("[data-decrease]").forEach((button) => button.addEventListener("click", () => changeQuantity(button.dataset.decrease, button.dataset.size, -1)));
    itemsTarget.querySelectorAll("[data-increase]").forEach((button) => button.addEventListener("click", () => changeQuantity(button.dataset.increase, button.dataset.size, 1)));
    itemsTarget.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => removeItem(button.dataset.remove, button.dataset.size)));
    const checkout = summaryTarget.querySelector("[data-checkout]");
    if (checkout && !checkout.disabled) checkout.addEventListener("click", () => api.toast("Checkout em configuração."));
  }

  window.addEventListener("hypeelite:cart-updated", render);
  render();
})();
