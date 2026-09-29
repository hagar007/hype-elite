(function () {
  "use strict";
  const api = window.HypeElite;
  const store = api.store;
  const params = new URLSearchParams(window.location.search);
  const activeCategory = document.body.dataset.category || params.get("categoria") || "all";
  const hasSneakers = activeCategory === "tenis";
  const brands = [...new Set(store.products.filter(product => product.published && product.kind === "sneaker").map(product => product.brand))].sort();
  let brand = hasSneakers && brands.includes(params.get("marca")) ? params.get("marca") : "";
  const hasFootball = activeCategory === "all" || activeCategory === "camisas-de-time";
  const groups = [["", "Todos"], ["masculino", "Masculino"], ["feminino", "Feminino"], ["infantil", "Infantil"]];
  const collections = [["", "Todas as coleções"], ["nacionais", "Nacionais"], ["internacionais", "Internacionais"], ["selecoes", "Seleções"], ["retro", "Retrô"]];
  const types = [["", "Todos os modelos"], ["camisa", "Camisas"], ["kit-adulto", "Kits adultos"], ["kit-infantil", "Kits infantis"]];
  const allowed = (list, value) => list.some(item => item[0] === value) ? value : "";
  let audience = hasFootball ? allowed(groups, params.get("publico")) : "";
  let collection = hasFootball ? allowed(collections, params.get("colecao")) : "";
  let type = hasFootball ? allowed(types, params.get("modelo")) : "";
  let query = params.get("q") || "";
  let onlyAvailable = params.get("disponivel") === "1";
  let sortMode = ["featured", "name", "price-asc", "price-desc"].includes(params.get("ordem")) ? params.get("ordem") : "featured";
  let limit = 24;
  const target = document.querySelector("[data-catalog-products]");
  const count = document.querySelector("[data-catalog-count]");
  const main = document.querySelector(".catalog-main");
  if (!target || !main) return;

  const baseProducts = store.products.filter(product => product.published && (activeCategory === "all" || product.category === activeCategory));
  const meta = activeCategory === "all"
    ? { name: "Todo o catálogo", description: "Encontre seu próximo favorito. Explore camisas de time e tênis importados." }
    : api.getCategory(activeCategory) || { name: "Catálogo", description: "Explore a seleção Hype Elite." };
  const cover = document.querySelector(".page-hero");
  if (cover) cover.innerHTML = `<div class="shell catalog-cover__inner">
    <div><nav class="breadcrumb" aria-label="Navegação estrutural"><a href="${api.path("index.html")}">Início</a><span aria-hidden="true">/</span><span>Catálogo</span></nav><h1>${api.escapeHtml(meta.name)}</h1>${hasSneakers ? '<p class="catalog-cover__note">Importados · Frete grátis<br>Sob encomenda</p>' : ""}</div>
    ${meta.cover ? `<img src="${api.path(meta.cover)}" alt="${api.escapeHtml(meta.coverAlt)}" width="124" height="140" decoding="async" data-catalog-cover>` : ""}
  </div>`;
  document.title = `${meta.name} — Hype Elite`;
  const categoryTarget = document.querySelector("[data-category-filters]");
  if (categoryTarget) categoryTarget.innerHTML = [
    { id: "all", name: "Todos os produtos", href: api.path("catalogo.html") },
    ...store.categories.map(category => ({ ...category, href: api.categoryPath(category) })),
  ].map(item => `<li><a class="${item.id === activeCategory ? "is-active" : ""}" href="${item.href}" ${item.id === activeCategory ? 'aria-current="page"' : ""}><span>${api.escapeHtml(item.name)}</span><span>${store.products.filter(product => product.published && (item.id === "all" || product.category === item.id)).length}</span></a></li>`).join("");

  const controls = document.createElement("div");
  controls.className = "catalog-controls";
  controls.innerHTML = `
    <div class="catalog-search-row">
      <label class="catalog-search">${api.icon("search")}<span class="sr-only">Buscar por marca, time ou modelo</span><input type="search" data-catalog-search placeholder="${hasSneakers ? "Marca ou modelo" : "Seu time ou modelo"}" value="${api.escapeHtml(query)}"></label>
      <button class="catalog-filter-toggle" type="button" data-advanced-toggle aria-expanded="false" aria-controls="catalog-filter-panel">Filtros <span class="catalog-filter-count" data-filter-count></span></button>
    </div>
    <div class="catalog-filter-panel" id="catalog-filter-panel" hidden>
      ${hasFootball ? `<div class="catalog-collections" role="group" aria-label="Coleções">${collections.map(([value, label]) => `<button type="button" data-collection="${value}" aria-pressed="${collection === value}">${label}</button>`).join("")}</div>` : ""}
      <div class="catalog-refinements">
        ${hasSneakers ? `<label class="catalog-type"><span>Marca</span><select data-sneaker-brand><option value="">Todas as marcas</option>${brands.map(value => `<option value="${api.escapeHtml(value)}" ${brand === value ? "selected" : ""}>${api.escapeHtml(value)}</option>`).join("")}</select></label>` : ""}
        <label class="catalog-type catalog-category-select"><span>Categoria</span><select data-mobile-category><option value="all">Todo o catálogo</option>${store.categories.map(category => `<option value="${api.escapeHtml(category.id)}" ${category.id === activeCategory ? "selected" : ""}>${api.escapeHtml(category.name)}</option>`).join("")}</select></label>
        ${hasFootball ? `<label class="catalog-type"><span>Modelo</span><select data-model-type>${types.map(([value, label]) => `<option value="${value}" ${type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}
      </div>
      <div class="catalog-availability"><label><input type="checkbox" data-in-stock ${onlyAvailable ? "checked" : ""}> Somente disponíveis</label><button class="catalog-reset" type="button" data-reset-filters>Limpar filtros</button></div>
    </div>
    ${hasFootball ? `<div class="catalog-segments" role="group" aria-label="Público">${groups.map(([value, label]) => `<button type="button" data-audience="${value}" aria-pressed="${audience === value}">${label}</button>`).join("")}</div>` : ""}`;
  main.prepend(controls);
  target.insertAdjacentHTML("afterend", '<div class="catalog-pagination"><p data-page-progress></p><button class="button button--outline" type="button" data-load-more>Ver mais produtos</button></div>');
  const more = main.querySelector("[data-load-more]");
  const progress = main.querySelector("[data-page-progress]");
  const sort = document.querySelector("[data-catalog-sort]");
  if (sort) {
    sort.innerHTML = '<option value="featured">Novidades primeiro</option><option value="name">Nome: A–Z</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option>';
    sort.value = sortMode;
  }

  function filteredProducts() {
    const terms = api.normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    return baseProducts.filter(product => {
      const haystack = api.normalizeSearch(`${product.name} ${product.shortDescription} ${product.team || ""}`);
      return (!brand || product.brand === brand)
        && (!audience || product.gender === audience)
        && (!collection || (collection === "retro" ? product.retro : product.collection === collection))
        && (!type || product.type === type)
        && (!onlyAvailable || product.available)
        && terms.every(term => haystack.includes(term));
    }).sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sortMode.startsWith("price")) {
        if (a.price === null) return b.price === null ? 0 : 1;
        if (b.price === null) return -1;
        return sortMode === "price-asc" ? a.price - b.price : b.price - a.price;
      }
      return Number(b.available) - Number(a.available) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function render() {
    const products = filteredProducts();
    const refinements = [brand, collection, type, onlyAvailable].filter(Boolean).length;
    controls.querySelector("[data-filter-count]").textContent = refinements ? `(${refinements})` : "";
    const coverPhoto = document.querySelector("[data-catalog-cover]");
    if (coverPhoto && activeCategory === "camisas-de-time") {
      const image = { nacionais: "nacionais", internacionais: "madrid", selecoes: "selecoes", retro: "retro" }[collection] || "madrid";
      coverPhoto.src = api.path(`assets/img/campaign/${image}-640.webp`);
    }
    count.textContent = `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
    count.setAttribute("aria-live", "polite");
    target.innerHTML = products.length ? products.slice(0, limit).map(api.productCard).join("")
      : !baseProducts.length
        ? `<div class="catalog-empty"><div><h2>Novidades em breve.</h2><p>Enquanto isso, encontre seu próximo manto.</p><a class="button" href="${api.path("categorias/camisas-de-time/")}">Explorar camisas</a></div></div>`
        : '<div class="catalog-empty"><div><h2>Nenhum modelo encontrado.</h2><p>Tente outra busca ou ajuste os filtros.</p><button class="text-link" type="button" data-empty-reset>Limpar filtros</button></div></div>';
    progress.textContent = products.length ? `Exibindo ${Math.min(limit, products.length)} de ${products.length} produtos` : "";
    more.hidden = products.length <= limit;
    controls.querySelectorAll("[data-audience]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.audience === audience)));
    controls.querySelectorAll("[data-collection]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.collection === collection)));
    const emptyReset = target.querySelector("[data-empty-reset]");
    if (emptyReset) emptyReset.addEventListener("click", reset);
  }

  function update() {
    limit = 24;
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries({ marca: brand, publico: audience, colecao: collection, modelo: type, q: query.trim(), disponivel: onlyAvailable ? "1" : "", ordem: sortMode === "featured" ? "" : sortMode })) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
    render();
  }

  function reset() {
    brand = audience = collection = type = query = "";
    if (hasSneakers) controls.querySelector("[data-sneaker-brand]").value = "";
    onlyAvailable = false;
    sortMode = "featured";
    if (sort) sort.value = sortMode;
    controls.querySelector("[data-catalog-search]").value = "";
    controls.querySelector("[data-in-stock]").checked = false;
    if (hasFootball) controls.querySelector("[data-model-type]").value = "";
    update();
  }

  const filterPanel = controls.querySelector("#catalog-filter-panel");
  controls.querySelector("[data-advanced-toggle]").addEventListener("click", event => {
    filterPanel.hidden = !filterPanel.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!filterPanel.hidden));
  });
  controls.querySelector("[data-mobile-category]").addEventListener("change", event => {
    const category = api.getCategory(event.target.value);
    window.location.href = category ? api.categoryPath(category) : api.path("catalogo.html");
  });
  controls.querySelectorAll("[data-audience]").forEach(button => button.addEventListener("click", () => { audience = button.dataset.audience; update(); }));
  controls.querySelectorAll("[data-collection]").forEach(button => button.addEventListener("click", () => { collection = button.dataset.collection; update(); }));
  controls.querySelector("[data-catalog-search]").addEventListener("input", event => { query = event.target.value; update(); });
  controls.querySelector("[data-in-stock]").addEventListener("change", event => { onlyAvailable = event.target.checked; update(); });
  controls.querySelector("[data-reset-filters]").addEventListener("click", reset);
  if (hasFootball) controls.querySelector("[data-model-type]").addEventListener("change", event => { type = event.target.value; update(); });
  if (hasSneakers) controls.querySelector("[data-sneaker-brand]").addEventListener("change", event => { brand = event.target.value; update(); });
  if (sort) sort.addEventListener("change", event => { sortMode = event.target.value; update(); });
  more.addEventListener("click", () => {
    const oldLimit = limit;
    limit += 24;
    render();
    target.querySelectorAll(".product-card__media")[oldLimit]?.focus({ preventScroll: true });
  });
  const filterButton = document.querySelector("[data-filter-toggle]");
  const sidebar = document.querySelector("[data-catalog-sidebar]");
  if (filterButton && sidebar) filterButton.addEventListener("click", () => filterButton.setAttribute("aria-expanded", String(sidebar.classList.toggle("is-open"))));
  render();
})();
