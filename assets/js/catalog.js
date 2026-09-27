(function () {
  "use strict";
  const api = window.HypeElite;
  const store = api.store;
  const params = new URLSearchParams(window.location.search);
  const activeCategory = document.body.dataset.category || params.get("categoria") || "all";
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
    ? { name: "Todo o catálogo", description: "Encontre seu próximo favorito. Explore clubes, seleções e peças para vestir o futebol no seu dia a dia." }
    : api.getCategory(activeCategory) || { name: "Catálogo", description: "Explore a seleção Hype Elite." };
  document.querySelector("[data-catalog-title]").textContent = meta.name;
  document.querySelector("[data-catalog-description]").textContent = activeCategory === "camisas-de-time"
    ? "A paixão pelo jogo, em todos os estilos. Modelos masculinos, femininos e infantis, dos novos uniformes aos clássicos retrô. Frete grátis para todo o Brasil."
    : meta.description;
  document.querySelector("[data-catalog-breadcrumb]").innerHTML = `<a href="${api.path("index.html")}">Início</a><span aria-hidden="true">/</span><span>${api.escapeHtml(meta.name)}</span>`;
  document.title = `${meta.name} — Hype Elite`;
  const categoryTarget = document.querySelector("[data-category-filters]");
  if (categoryTarget) categoryTarget.innerHTML = [
    { id: "all", name: "Todos os produtos", href: api.path("catalogo.html") },
    ...store.categories.map(category => ({ ...category, href: api.categoryPath(category) })),
  ].map(item => `<li><a class="${item.id === activeCategory ? "is-active" : ""}" href="${item.href}" ${item.id === activeCategory ? 'aria-current="page"' : ""}><span>${api.escapeHtml(item.name)}</span><span>${store.products.filter(product => product.published && (item.id === "all" || product.category === item.id)).length}</span></a></li>`).join("");

  const controls = document.createElement("div");
  controls.className = "catalog-controls";
  controls.innerHTML = `
    ${hasFootball ? `<div class="catalog-segments" role="group" aria-label="Público">${groups.map(([value, label]) => `<button type="button" data-audience="${value}" aria-pressed="${audience === value}">${label}</button>`).join("")}</div>
    <div class="catalog-collections" role="group" aria-label="Coleções">${collections.map(([value, label]) => `<button type="button" data-collection="${value}" aria-pressed="${collection === value}">${label}</button>`).join("")}</div>` : ""}
    <div class="catalog-refinements">
      <label class="catalog-search">${api.icon("search")}<span class="sr-only">Buscar por time ou modelo</span><input type="search" data-catalog-search placeholder="Busque seu time ou modelo" value="${api.escapeHtml(query)}"></label>
      ${hasFootball ? `<label class="catalog-type"><span class="sr-only">Tipo de modelo</span><select data-model-type>${types.map(([value, label]) => `<option value="${value}" ${type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>` : ""}
    </div>
    <div class="catalog-availability"><label><input type="checkbox" data-in-stock ${onlyAvailable ? "checked" : ""}> Somente disponíveis</label><button class="catalog-reset" type="button" data-reset-filters>Limpar filtros</button></div>`;
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
      return (!audience || product.gender === audience)
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
    count.textContent = `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
    count.setAttribute("aria-live", "polite");
    target.innerHTML = products.length ? products.slice(0, limit).map(api.productCard).join("")
      : '<div class="catalog-empty"><div><h2>Nenhum modelo por aqui.</h2><p>Tente outro time ou ajuste os filtros para explorar mais opções.</p><button class="text-link" type="button" data-empty-reset>Limpar filtros</button></div></div>';
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
    for (const [key, value] of Object.entries({ publico: audience, colecao: collection, modelo: type, q: query.trim(), disponivel: onlyAvailable ? "1" : "", ordem: sortMode === "featured" ? "" : sortMode })) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
    render();
  }

  function reset() {
    audience = collection = type = query = "";
    onlyAvailable = false;
    controls.querySelector("[data-catalog-search]").value = "";
    controls.querySelector("[data-in-stock]").checked = false;
    if (hasFootball) controls.querySelector("[data-model-type]").value = "";
    update();
  }

  controls.querySelectorAll("[data-audience]").forEach(button => button.addEventListener("click", () => { audience = button.dataset.audience; update(); }));
  controls.querySelectorAll("[data-collection]").forEach(button => button.addEventListener("click", () => { collection = button.dataset.collection; update(); }));
  controls.querySelector("[data-catalog-search]").addEventListener("input", event => { query = event.target.value; update(); });
  controls.querySelector("[data-in-stock]").addEventListener("change", event => { onlyAvailable = event.target.checked; update(); });
  controls.querySelector("[data-reset-filters]").addEventListener("click", reset);
  if (hasFootball) controls.querySelector("[data-model-type]").addEventListener("change", event => { type = event.target.value; update(); });
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
