(function () {
  "use strict";
  const api = window.HypeElite;
  const products = api.store.products.filter(product => product.published && product.available);
  const selected = (api.store.campaignProductIds || []).map(id => products.find(product => product.id === id)).filter(Boolean);
  const featured = [...selected, ...products.filter(product => !selected.includes(product))].slice(0, 4);
  const target = document.querySelector("[data-featured-products]");
  if (target) target.innerHTML = featured.map(api.productCard).join("");
  const categories = document.querySelector("[data-more-categories]");
  if (categories) categories.innerHTML = api.store.categories.filter(category => category.id !== "camisas-de-time").map(category => {
    const hasProducts = api.store.products.some(product => product.published && product.category === category.id);
    return `<a href="${api.categoryPath(category)}"><span>${api.escapeHtml(category.name)}</span>${hasProducts ? api.icon("arrow") : "<small>Em breve</small>"}</a>`;
  }).join("");
})();
