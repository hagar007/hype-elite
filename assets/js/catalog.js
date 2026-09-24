(function () {
  "use strict";

  const api = window.HypeElite;
  const store = api.store;
  const params = new URLSearchParams(window.location.search);
  const bodyCategory = document.body.dataset.category || "";
  let activeCategory = bodyCategory || params.get("categoria") || "all";
  let sortMode = "featured";

  function categoryCount(id) {
    return store.products.filter((product) => product.published && (id === "all" || product.category === id)).length;
  }

  function activeMeta() {
    if (activeCategory === "all") {
      return {
        name: "Todo o catálogo",
        description: "A estrutura completa para camisas de time, tênis, meias, academia e as próximas categorias da Hype Elite.",
      };
    }
    return api.getCategory(activeCategory) || { name: "Catálogo", description: "Explore os produtos Hype Elite." };
  }

  function renderPageHeading() {
    const meta = activeMeta();
    const title = document.querySelector("[data-catalog-title]");
    const description = document.querySelector("[data-catalog-description]");
    const breadcrumb = document.querySelector("[data-catalog-breadcrumb]");

    if (title) title.textContent = meta.name;
    if (description) description.textContent = meta.description;
    if (breadcrumb) {
      breadcrumb.innerHTML = `
        <a href="${api.path("index.html")}">Início</a>
        <span aria-hidden="true">/</span>
        <span>${api.escapeHtml(meta.name)}</span>`;
    }
    document.title = `${meta.name} — Hype Elite`;
  }

  function renderFilters() {
    const target = document.querySelector("[data-category-filters]");
    if (!target) return;

    const items = [
      { id: "all", name: "Todos os produtos", href: api.path("catalogo.html") },
      ...store.categories.map((category) => ({ ...category, href: api.categoryPath(category) })),
    ];

    target.innerHTML = items.map((item) => `
      <li>
        <a class="${item.id === activeCategory ? "is-active" : ""}" href="${item.href}" ${item.id === activeCategory ? 'aria-current="page"' : ""}>
          <span>${api.escapeHtml(item.name)}</span>
          <span>${String(categoryCount(item.id)).padStart(2, "0")}</span>
        </a>
      </li>`).join("");
  }

  function sortedProducts() {
    const products = store.products.filter((product) => product.published && (activeCategory === "all" || product.category === activeCategory));
    if (sortMode === "name") return products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (sortMode === "category") {
      return products.sort((a, b) => api.getCategory(a.category).name.localeCompare(api.getCategory(b.category).name, "pt-BR"));
    }
    return products.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  function renderProducts() {
    const target = document.querySelector("[data-catalog-products]");
    const count = document.querySelector("[data-catalog-count]");
    if (!target) return;

    const products = sortedProducts();
    if (count) count.textContent = `${products.length} ${products.length === 1 ? "produto preparado" : "produtos preparados"}`;

    target.innerHTML = products.length
      ? products.map(api.productCard).join("")
      : `<div class="catalog-empty"><div><h2>Categoria em preparação</h2><p>Este espaço já está pronto para receber os próximos produtos da Hype Elite.</p></div></div>`;
  }

  const sort = document.querySelector("[data-catalog-sort]");
  if (sort) {
    sort.addEventListener("change", (event) => {
      sortMode = event.target.value;
      renderProducts();
    });
  }

  const filterButton = document.querySelector("[data-filter-toggle]");
  const sidebar = document.querySelector("[data-catalog-sidebar]");
  if (filterButton && sidebar) {
    filterButton.addEventListener("click", () => {
      const open = sidebar.classList.toggle("is-open");
      filterButton.setAttribute("aria-expanded", String(open));
    });
  }

  renderPageHeading();
  renderFilters();
  renderProducts();
})();
