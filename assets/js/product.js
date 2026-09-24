(function () {
  "use strict";

  const api = window.HypeElite;
  const params = new URLSearchParams(window.location.search);
  const product = api.getProduct(params.get("id") || "camisa-001");
  const target = document.querySelector("[data-product-detail]");

  if (!target || !product) {
    if (target) {
      target.innerHTML = `<div class="catalog-empty"><div><h2>Produto não encontrado</h2><p>O item pode ter sido removido ou ainda não foi cadastrado.</p><a class="button" href="${api.path("catalogo.html")}">Voltar ao catálogo</a></div></div>`;
    }
    return;
  }

  const category = api.getCategory(product.category);
  let selectedSize = product.sizes[0] || "Único";
  document.title = `${product.name} — Hype Elite`;

  function render() {
    target.innerHTML = `
      <nav class="breadcrumb" aria-label="Navegação estrutural">
        <a href="${api.path("index.html")}">Início</a><span aria-hidden="true">/</span>
        <a href="${api.categoryPath(category)}">${api.escapeHtml(category.name)}</a><span aria-hidden="true">/</span>
        <span>${api.escapeHtml(product.name)}</span>
      </nav>
      <div class="product-detail">
        <div class="product-gallery" aria-label="Área de imagens do produto">
          ${api.productVisual(product)}
          ${api.productVisual({ ...product, color: "#f1f0ed" })}
          ${api.productVisual({ ...product, color: "#dad8d2" })}
        </div>
        <div class="product-info">
          <p class="product-info__category">${api.escapeHtml(category.name)}</p>
          <h1>${api.escapeHtml(product.name)}</h1>
          <p class="product-info__price">${api.formatPrice(product.price)}</p>
          <p class="product-info__description">${api.escapeHtml(product.description)}</p>
          <div class="product-options">
            <div class="product-options__label"><span>Escolha o tamanho</span><span data-size-value>${api.escapeHtml(selectedSize)}</span></div>
            <div class="size-grid" data-size-grid>
              ${product.sizes.map((size) => `<button class="size-option ${size === selectedSize ? "is-selected" : ""}" type="button" data-size="${api.escapeHtml(size)}">${api.escapeHtml(size)}</button>`).join("")}
            </div>
          </div>
          <p class="product-status">${product.available ? "Disponível para pedido" : "Cadastro e disponibilidade em preparação"}</p>
          <button class="button button--wide" type="button" data-add-product ${product.available ? "" : "disabled"}>
            ${product.available ? "Adicionar à sacola" : "Produto em preparação"} ${api.icon("bag")}
          </button>
          <div class="product-accordions">
            <details open><summary>Sobre o produto</summary><p>${api.escapeHtml(product.shortDescription)}</p></details>
            <details><summary>Prazo e envio</summary><p>Produto sob encomenda. O prazo específico será informado na página assim que o cadastro real for concluído.</p></details>
            <details><summary>Tamanhos e medidas</summary><p>Confira sempre a tabela de medidas do modelo antes de finalizar o pedido.</p></details>
          </div>
        </div>
      </div>`;

    target.querySelectorAll("[data-size]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSize = button.dataset.size;
        target.querySelectorAll("[data-size]").forEach((item) => item.classList.toggle("is-selected", item === button));
        const value = target.querySelector("[data-size-value]");
        if (value) value.textContent = selectedSize;
      });
    });

    const addButton = target.querySelector("[data-add-product]");
    if (addButton && !addButton.disabled) addButton.addEventListener("click", () => api.addToCart(product.id, selectedSize, 1));
  }

  const relatedTarget = document.querySelector("[data-related-products]");
  if (relatedTarget) {
    const related = api.store.products.filter((item) => item.published && item.category === product.category && item.id !== product.id).slice(0, 4);
    relatedTarget.innerHTML = related.length ? related.map(api.productCard).join("") : `<p class="catalog-toolbar__count">Novos itens serão adicionados em breve.</p>`;
  }

  render();
})();
