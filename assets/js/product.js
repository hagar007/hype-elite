(function () {
  "use strict";
  const api = window.HypeElite;
  const params = new URLSearchParams(window.location.search);
  const product = api.getProduct(params.get("id") || api.store.products[0]?.id);
  const target = document.querySelector("[data-product-detail]");
  if (!target || !product) {
    if (target) target.innerHTML = `<div class="catalog-empty"><div><h2>Produto não encontrado</h2><p>Este modelo pode ter saído do catálogo.</p><a class="button" href="${api.path("categorias/camisas-de-time/")}">Explorar camisas</a></div></div>`;
    return;
  }
  const category = api.getCategory(product.category);
  let selectedSize = product.sizes.find(size => api.isSizeAvailable(product, size)) || "";
  const photos = product.photos || [];
  document.title = `${product.name} — Hype Elite`;
  const e = api.escapeHtml;
  const status = !product.available ? "Indisponível no momento" : "Disponível para pedido";
  const gallery = photos.length ? `
    <div class="product-gallery product-gallery--photos" aria-label="Fotos de ${e(product.name)}">
      <a class="product-visual product-visual--photo product-gallery__main" data-gallery-link href="${e(photos[0])}" target="_blank" rel="noopener" aria-label="Abrir foto ampliada">
        <img data-gallery-main src="${e(photos[0])}" alt="${e(product.name)} — foto 1" width="800" height="1000" fetchpriority="high">
      </a>
      <div class="product-gallery__caption"><span>Clique na foto para ampliar</span><span data-gallery-count>1 / ${photos.length}</span></div>
      <div class="product-gallery__thumbs" role="group" aria-label="Escolha uma foto">${photos.map((photo, index) => `<button type="button" class="gallery-thumb" data-photo-index="${index}" aria-label="Ver foto ${index + 1}" aria-pressed="${index === 0}"><img src="${e(photo)}" alt="" width="80" height="100" loading="lazy" decoding="async"></button>`).join("")}</div>
    </div>` : `<div class="product-gallery">${api.productVisual(product)}</div>`;
  target.innerHTML = `
    <nav class="breadcrumb" aria-label="Navegação estrutural"><a href="${api.path("index.html")}">Início</a><span aria-hidden="true">/</span><a href="${api.categoryPath(category)}">${e(category.name)}</a><span aria-hidden="true">/</span><span>${e(product.team || product.name)}</span></nav>
    <div class="product-detail">${gallery}
      <div class="product-info">
        <p class="product-info__category">${e(product.shortDescription || category.name)}</p>
        <h1>${e(product.name)}</h1>
        <p class="product-info__price" data-product-price>${api.formatPrice(api.getProductPrice(product, selectedSize))}</p>
        ${product.freeShipping ? `<p class="product-free-shipping">${api.icon("truck")} Frete grátis para todo o Brasil</p>` : ""}
        <p class="product-info__description">${e(product.description)}</p>
        <div class="product-options"><div class="product-options__label"><span>Escolha o tamanho</span><span data-size-value>${e(selectedSize || "Indisponível")}</span></div>
          <div class="size-grid" role="group" aria-label="Tamanhos disponíveis">${product.sizes.map(size => {
            const available = api.isSizeAvailable(product, size);
            const label = product.variants?.find(item => item.size === size)?.label || size;
            return `<button class="size-option ${size === selectedSize ? "is-selected" : ""}" type="button" data-size="${e(size)}" aria-pressed="${size === selectedSize}" aria-label="${e(label)}${available ? "" : " — indisponível"}" title="${e(label)}" ${available ? "" : "disabled"}>${e(size)}</button>`;
          }).join("")}</div>
          <p class="size-note" data-size-note></p>
        </div>
        <p class="product-status ${product.available ? "is-available" : ""}">${status}</p>
        <button class="button button--wide" type="button" data-add-product ${selectedSize ? "" : "disabled"}>${selectedSize ? "Adicionar à sacola" : "Produto indisponível"} ${api.icon("bag")}</button>
        <div class="product-accordions">
          <details open><summary>Detalhes do modelo</summary><p>${e(product.shortDescription)}</p><p>Veja todas as fotos na galeria. Os tamanhos habilitados estão disponíveis para pedido.</p></details>
          <details><summary>Prazo e envio</summary><p>${product.freeShipping ? "Frete grátis para todo o Brasil. " : ""}Produto sob encomenda. O prazo de entrega precisa ser confirmado antes da conclusão do pedido.</p></details>
          <details><summary>Tamanhos e medidas</summary><p>Escolha entre os tamanhos disponíveis acima. As medidas podem variar entre modelos; consulte o atendimento para confirmar o caimento antes de comprar.</p><a class="text-link" href="${api.path("atendimento.html")}">Atendimento</a></details>
        </div>
      </div>
    </div>`;

  function updateSize() {
    target.querySelector("[data-size-value]").textContent = selectedSize || "Indisponível";
    target.querySelector("[data-product-price]").textContent = api.formatPrice(api.getProductPrice(product, selectedSize));
    const variant = product.variants?.find(item => item.size === selectedSize);
    target.querySelector("[data-size-note]").textContent = variant && variant.label !== variant.size ? variant.label : "";
    target.querySelectorAll("[data-size]").forEach(button => {
      const selected = button.dataset.size === selectedSize;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  target.querySelectorAll("[data-size]").forEach(button => button.addEventListener("click", () => { selectedSize = button.dataset.size; updateSize(); }));
  target.querySelector("[data-add-product]").addEventListener("click", () => api.addToCart(product.id, selectedSize, 1));
  target.querySelectorAll("[data-photo-index]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.photoIndex);
    const img = target.querySelector("[data-gallery-main]");
    img.src = photos[index];
    img.alt = `${product.name} — foto ${index + 1}`;
    img.hidden = false;
    target.querySelector(".photo-fallback")?.remove();
    target.querySelector("[data-gallery-link]").href = photos[index];
    target.querySelector("[data-gallery-count]").textContent = `${index + 1} / ${photos.length}`;
    target.querySelectorAll("[data-photo-index]").forEach(thumb => thumb.setAttribute("aria-pressed", String(thumb === button)));
  }));
  const relatedTarget = document.querySelector("[data-related-products]");
  if (relatedTarget) {
    const related = api.store.products.filter(item => item.published && item.category === product.category && item.id !== product.id)
      .sort((a, b) => Number(b.team === product.team) - Number(a.team === product.team) || Number(b.available) - Number(a.available)).slice(0, 4);
    relatedTarget.innerHTML = related.map(api.productCard).join("");
  }
  updateSize();
})();
