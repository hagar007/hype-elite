(function () {
  "use strict";

  const store = window.HYPE_ELITE_STORE;
  const shell = document.querySelector("[data-panel-shell]");
  const title = document.querySelector("[data-panel-title]");
  const subtitle = document.querySelector("[data-panel-subtitle]");
  const viewNames = {
    overview: ["Visão geral", "Acompanhe a estrutura e os principais números da loja."],
    orders: ["Pedidos", "Gerencie o caminho do pedido até a entrega."],
    products: ["Produtos", "Organize o catálogo e o status de cada item."],
    categories: ["Categorias", "Controle as áreas atuais e as próximas expansões."],
    inventory: ["Estoque", "Acompanhe disponibilidade e produtos sob encomenda."],
    finance: ["Financeiro", "Veja entradas, saídas, taxas e resultado da operação."],
    customers: ["Clientes", "Centralize histórico e informações de atendimento."],
    settings: ["Configurações", "Ajuste pagamentos, envios e dados da loja."],
  };

  function icon(name) {
    const paths = {
      dashboard: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
      orders: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
      products: '<path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7ZM12 11v10"/>',
      categories: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
      inventory: '<path d="M4 6h16v14H4zM8 6V3h8v3M4 10h16M10 14h4"/>',
      finance: '<path d="M4 18h16M6 15V9M10 15V5M14 15v-3M18 15V7"/>',
      customers: '<circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a4 4 0 0 1 0 8M17 15a6 6 0 0 1 4 6"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19 14a7 7 0 0 0 0-4l2-2-3-3-2 2a7 7 0 0 0-4-2V2H8v3a7 7 0 0 0-3 2L3 5 1 8l2 2a7 7 0 0 0 0 4l-2 2 2 3 2-2a7 7 0 0 0 3 2v3h4v-3a7 7 0 0 0 4-2l2 2 3-3-2-2Z"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      external: '<path d="M14 4h6v6M20 4l-9 9M18 13v7H4V6h7"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      bag: '<path d="M6 8h12l1 12H5L6 8ZM9 9V6a3 3 0 0 1 6 0v3"/>',
      arrow: '<path d="M5 12h14M14 6l6 6-6 6"/>',
      wallet: '<path d="M4 6h14v14H4zM18 10h3v6h-3a3 3 0 0 1 0-6ZM4 8l11-4 2 2"/>',
    };
    return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.dashboard}</svg>`;
  }

  document.querySelectorAll("[data-icon]").forEach((element) => { element.innerHTML = icon(element.dataset.icon); });

  const productsBody = document.querySelector("[data-panel-products]");
  if (productsBody) {
    productsBody.innerHTML = store.products.map((product) => {
      const category = store.categories.find((item) => item.id === product.category);
      return `<tr><td class="data-table__name">${product.name}</td><td>${category ? category.name : "—"}</td><td>${product.sizes.length} variações</td><td><span class="status-chip">Rascunho</span></td></tr>`;
    }).join("");
  }

  const categoriesBody = document.querySelector("[data-panel-categories]");
  if (categoriesBody) {
    categoriesBody.innerHTML = store.categories.map((category) => {
      const count = store.products.filter((product) => product.category === category.id).length;
      return `<tr><td class="data-table__name">${category.name}</td><td>${count} ${count === 1 ? "produto" : "produtos"}</td><td><span class="status-chip">${category.status === "planned" ? "Próxima fase" : "Estrutura pronta"}</span></td></tr>`;
    }).join("");
  }

  function setView(name) {
    const viewName = viewNames[name] ? name : "overview";
    document.querySelectorAll("[data-view]").forEach((view) => { view.hidden = view.dataset.view !== viewName; });
    document.querySelectorAll("[data-panel-nav]").forEach((button) => button.classList.toggle("is-active", button.dataset.panelNav === viewName));
    if (title) title.textContent = viewNames[viewName][0];
    if (subtitle) subtitle.textContent = viewNames[viewName][1];
    if (shell) shell.classList.remove("is-menu-open");
    window.location.hash = viewName === "overview" ? "" : viewName;
  }

  document.querySelectorAll("[data-panel-nav]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.panelNav)));
  document.querySelectorAll("[data-menu-panel-open]").forEach((button) => button.addEventListener("click", () => shell && shell.classList.add("is-menu-open")));
  document.querySelectorAll("[data-menu-panel-close]").forEach((button) => button.addEventListener("click", () => shell && shell.classList.remove("is-menu-open")));
  document.querySelectorAll("[data-future-action]").forEach((button) => button.addEventListener("click", () => window.alert("Esta ação será ativada quando o painel receber login e banco de dados.")));

  setView(window.location.hash.replace("#", "") || "overview");
})();
