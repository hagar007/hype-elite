(function () {
  "use strict";

  const api = window.HypeElite;
  const store = api.store;

  const categoryTarget = document.querySelector("[data-category-grid]");
  if (categoryTarget) {
    categoryTarget.innerHTML = store.categories.map((category, index) => `
      <a class="category-card category-card--${api.escapeHtml(category.tone)}" href="${api.categoryPath(category)}">
        <div class="category-card__top">
          <span class="category-card__index">0${index + 1}</span>
          <span class="category-card__status">${category.status === "planned" ? "Próxima fase" : "Explorar"}</span>
        </div>
        ${api.categoryIcon(category.icon)}
        <div class="category-card__bottom">
          <p>${api.escapeHtml(category.eyebrow)}</p>
          <h3>${api.escapeHtml(category.name)}</h3>
          <span>${api.escapeHtml(category.description)}</span>
        </div>
        <span class="category-card__arrow">${api.icon("arrow")}</span>
      </a>`).join("");
  }

  const productsTarget = document.querySelector("[data-featured-products]");
  if (productsTarget) {
    const featured = store.products.filter((product) => product.published && product.featured).slice(0, 4);
    productsTarget.innerHTML = featured.map(api.productCard).join("");
  }

  const trustTarget = document.querySelector("[data-trust-strip]");
  if (trustTarget) {
    trustTarget.innerHTML = `
      <div class="trust-item">
        <span class="trust-item__icon">${api.icon("lock")}</span>
        <div><strong>Estrutura segura</strong><span>Checkout será conectado sem expor dados sensíveis.</span></div>
      </div>
      <div class="trust-item">
        <span class="trust-item__icon">${api.icon("truck")}</span>
        <div><strong>Envio nacional</strong><span>Pedidos preparados para entrega em todo o Brasil.</span></div>
      </div>
      <div class="trust-item">
        <span class="trust-item__icon">${api.icon("headset")}</span>
        <div><strong>Atendimento próximo</strong><span>Clareza antes, durante e depois de cada pedido.</span></div>
      </div>`;
  }
})();
