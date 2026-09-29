(function () {
  "use strict";
  const api = window.HypeElite;
  const products = api.store.products.filter(product => product.published && product.available);
  const shirts = (api.store.campaignProductIds || []).map(id => products.find(product => product.id === id)).filter(Boolean).slice(0, 2);
  const sneakers = products.filter(product => product.kind === "sneaker");
  const picks = [sneakers.find(product => product.line === "Adidas Adizero"), sneakers.find(product => product.line === "New Balance")].filter(Boolean);
  const featured = [...shirts, ...picks, ...products.filter(product => !shirts.includes(product) && !picks.includes(product))].slice(0, 4);
  const target = document.querySelector("[data-featured-products]");
  if (target) target.innerHTML = featured.map(api.productCard).join("");
  const categories = document.querySelector("[data-photo-categories]");
  if (categories) categories.innerHTML = api.store.categories.map((category, index) => {
    const hasProducts = products.some(product => product.category === category.id);
    return `<a class="photo-category" href="${api.categoryPath(category)}">
      <div class="photo-category__image"><img src="${api.path(category.cover)}" alt="${api.escapeHtml(category.coverAlt)}" width="600" height="600" ${index < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>
      <span class="photo-category__label"><strong>${api.escapeHtml(category.name)}</strong>${hasProducts ? '<span aria-hidden="true">↗</span>' : '<small>Em breve</small>'}</span>
    </a>`;
  }).join("");
})();
