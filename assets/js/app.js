(function () {
  "use strict";

  const store = window.HYPE_ELITE_STORE;
  const body = document.body;
  const root = body.dataset.root || "";
  const currentPage = body.dataset.page || "home";

  const icons = {
    arrow: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M14 6l6 6-6 6"/></svg>',
    bag: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
    search: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
    menu: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    chevron: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    truck: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    lock: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    headset: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2ZM20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2ZM17 19c-1 2-3 2-5 2"/></svg>',
  };

  function icon(name) {
    return icons[name] || "";
  }

  function categoryIcon(kind, extraClass) {
    const cls = extraClass ? ` ${extraClass}` : "";
    const common = `class="category-line-art${cls}" aria-hidden="true" viewBox="0 0 180 140"`;

    if (kind === "jersey") {
      return `<svg ${common}><path d="M55 28 73 18h34l18 10 28 21-19 25-17-11v58H63V63L46 74 27 49l28-21Z"/><path d="M73 18c2 13 32 13 34 0M63 89h54"/></svg>`;
    }
    if (kind === "sneaker") {
      return `<svg ${common}><path d="M29 91c18-4 34-16 44-39l22 18c17 14 34 19 56 20v20H30c-10 0-13-15-1-19Z"/><path d="m65 67 17 8M59 78l17 7M106 78l-8 11M30 99h121"/></svg>`;
    }
    if (kind === "socks") {
      return `<svg ${common}><path d="M56 21h34v54c0 13-8 28-24 39-9 6-23 3-27-7-3-8 1-16 9-20l8-4V21ZM99 21h27v47c0 10 6 19 15 25 8 5 10 15 5 22-6 8-18 9-26 3-15-12-21-27-21-43V21Z"/><path d="M56 38h34M99 38h27"/></svg>`;
    }
    if (kind === "dumbbell") {
      return `<svg ${common}><path d="M54 58v24M41 51v38M126 58v24M139 51v38M54 70h72M30 62v16M150 62v16"/></svg>`;
    }
    if (kind === "cap") {
      return `<svg ${common}><path d="M45 83c0-34 18-56 48-56 27 0 44 20 43 52-32 0-63 2-91 4Z"/><path d="M46 83c-12 7-16 19-7 25 12 8 36-4 55-22 14-4 29-6 42-7M93 27v59"/></svg>`;
    }
    return `<svg ${common}><rect x="42" y="28" width="96" height="84" rx="5"/><path d="M42 51h96M67 28v84"/></svg>`;
  }

  function path(pathname) {
    return `${root}${pathname}`;
  }

  function categoryPath(category) {
    return path(category.href);
  }

  function formatPrice(value) {
    if (typeof value !== "number") return "Preço a definir";
    return new Intl.NumberFormat(store.settings.locale, {
      style: "currency",
      currency: store.settings.currency,
    }).format(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCategory(id) {
    return store.categories.find((category) => category.id === id);
  }

  function getProduct(id) {
    return store.products.find((product) => product.id === id || product.slug === id);
  }

  function productUrl(product) {
    return `${path("produto.html")}?id=${encodeURIComponent(product.id)}`;
  }

  function productVisual(product, className) {
    const category = getCategory(product.category);
    const label = category ? category.name : "Hype Elite";
    return `
      <div class="product-visual ${className || ""}" style="--product-tone: ${escapeHtml(product.color || "#e7e5e4")}">
        <span class="product-visual__index">HE / ${escapeHtml(product.id.toUpperCase())}</span>
        ${categoryIcon(product.kind)}
        <span class="product-visual__label">${escapeHtml(label)}</span>
      </div>`;
  }

  function productCard(product) {
    const category = getCategory(product.category);
    return `
      <article class="product-card">
        <a class="product-card__media" href="${productUrl(product)}" aria-label="Ver ${escapeHtml(product.name)}">
          ${product.badge ? `<span class="product-card__badge">${escapeHtml(product.badge)}</span>` : ""}
          ${productVisual(product)}
        </a>
        <div class="product-card__body">
          <p class="product-card__category">${escapeHtml(category ? category.name : "Hype Elite")}</p>
          <h3 class="product-card__title"><a href="${productUrl(product)}">${escapeHtml(product.name)}</a></h3>
          <div class="product-card__footer">
            <p class="product-card__price">${formatPrice(product.price)}</p>
            <a class="icon-link" href="${productUrl(product)}" aria-label="Abrir produto">${icon("arrow")}</a>
          </div>
        </div>
      </article>`;
  }

  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem("hypeEliteCart") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem("hypeEliteCart", JSON.stringify(cart));
    updateCartCount();
    window.dispatchEvent(new CustomEvent("hypeelite:cart-updated"));
  }

  function addToCart(productId, size, quantity) {
    const product = getProduct(productId);
    if (!product || !product.available || typeof product.price !== "number") {
      toast("Este produto ainda está em preparação.");
      return false;
    }

    const cart = getCart();
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const existing = cart.find((item) => item.productId === product.id && item.size === size);

    if (existing) existing.quantity += safeQuantity;
    else cart.push({ productId: product.id, size: size || "Único", quantity: safeQuantity });

    saveCart(cart);
    toast(`${product.name} adicionado à sacola.`);
    return true;
  }

  function updateCartCount() {
    const count = getCart().reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach((element) => {
      element.textContent = String(count);
      element.hidden = count === 0;
    });
  }

  function toast(message) {
    let element = document.querySelector(".toast");
    if (!element) {
      element = document.createElement("div");
      element.className = "toast";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.classList.add("is-visible");
    clearTimeout(window.__hypeEliteToastTimer);
    window.__hypeEliteToastTimer = setTimeout(() => element.classList.remove("is-visible"), 3200);
  }

  function renderHeader() {
    const target = document.querySelector("[data-site-header]");
    if (!target) return;

    target.innerHTML = `
      <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <div class="announcement">
        <div class="shell announcement__inner">
          <span>Produtos selecionados sob encomenda</span>
          <span class="announcement__separator" aria-hidden="true"></span>
          <span>Envios para todo o Brasil</span>
        </div>
      </div>
      <header class="site-header" data-sticky-header>
        <div class="shell site-header__inner">
          <button class="header-action mobile-only" type="button" data-menu-open aria-label="Abrir menu">
            ${icon("menu")}
          </button>
          <a class="brand" href="${path("index.html")}" aria-label="Hype Elite — início">
            <img src="${path("assets/img/logo-he.png")}" alt="" width="48" height="48">
            <span class="brand__wordmark">Hype Elite</span>
          </a>
          <nav class="desktop-nav" aria-label="Navegação principal">
            <a ${currentPage === "home" ? 'aria-current="page"' : ""} href="${path("index.html")}">Início</a>
            <a ${currentPage === "catalog" ? 'aria-current="page"' : ""} href="${path("catalogo.html")}">Catálogo</a>
            <a href="${path("categorias/camisas-de-time/")}">Camisas</a>
            <a href="${path("categorias/tenis/")}">Tênis</a>
            <a ${currentPage === "about" ? 'aria-current="page"' : ""} href="${path("sobre.html")}">A marca</a>
          </nav>
          <div class="header-tools">
            <button class="header-action" type="button" data-search-open aria-label="Buscar produtos">
              ${icon("search")}
            </button>
            <a class="header-action bag-button" href="${path("carrinho.html")}" aria-label="Abrir sacola">
              ${icon("bag")}
              <span class="bag-count" data-cart-count hidden>0</span>
            </a>
          </div>
        </div>
      </header>
      <div class="mobile-drawer" data-mobile-drawer aria-hidden="true">
        <button class="drawer-backdrop" type="button" data-menu-close tabindex="-1" aria-label="Fechar menu"></button>
        <div class="mobile-drawer__panel">
          <div class="mobile-drawer__head">
            <span class="eyebrow">Menu</span>
            <button class="header-action" type="button" data-menu-close aria-label="Fechar menu">${icon("close")}</button>
          </div>
          <nav class="mobile-nav" aria-label="Navegação móvel">
            <a href="${path("index.html")}"><span>Início</span>${icon("chevron")}</a>
            <a href="${path("catalogo.html")}"><span>Todo o catálogo</span>${icon("chevron")}</a>
            ${store.categories.map((category) => `<a href="${categoryPath(category)}"><span>${escapeHtml(category.name)}</span>${icon("chevron")}</a>`).join("")}
            <a href="${path("sobre.html")}"><span>A Hype Elite</span>${icon("chevron")}</a>
            <a href="${path("atendimento.html")}"><span>Atendimento</span>${icon("chevron")}</a>
          </nav>
          <p class="mobile-drawer__tagline">${escapeHtml(store.brand.tagline)}</p>
        </div>
      </div>
      <div class="search-drawer" data-search-drawer aria-hidden="true">
        <button class="drawer-backdrop" type="button" data-search-close tabindex="-1" aria-label="Fechar busca"></button>
        <div class="search-drawer__panel">
          <div class="search-drawer__head shell">
            <label class="search-field">
              <span class="sr-only">Buscar no catálogo</span>
              ${icon("search")}
              <input type="search" placeholder="O que você procura?" autocomplete="off" data-global-search>
            </label>
            <button class="header-action" type="button" data-search-close aria-label="Fechar busca">${icon("close")}</button>
          </div>
          <div class="shell search-results" data-search-results>
            <p class="search-results__hint">Digite o nome ou a categoria de um produto.</p>
          </div>
        </div>
      </div>`;
  }

  function renderFooter() {
    const target = document.querySelector("[data-site-footer]");
    if (!target) return;

    target.innerHTML = `
      <footer class="site-footer">
        <div class="shell footer-grid">
          <div class="footer-brand">
            <a class="brand brand--footer" href="${path("index.html")}">
              <img src="${path("assets/img/logo-he.png")}" alt="" width="52" height="52">
              <span class="brand__wordmark">Hype Elite</span>
            </a>
            <p>${escapeHtml(store.brand.tagline)} Uma marca brasileira em construção, com curadoria e atendimento próximo.</p>
          </div>
          <div class="footer-column">
            <h2>Comprar</h2>
            <a href="${path("catalogo.html")}">Catálogo</a>
            <a href="${path("categorias/camisas-de-time/")}">Camisas de time</a>
            <a href="${path("categorias/tenis/")}">Tênis</a>
            <a href="${path("categorias/academia/")}">Academia</a>
          </div>
          <div class="footer-column">
            <h2>Informações</h2>
            <a href="${path("sobre.html")}">Sobre a marca</a>
            <a href="${path("atendimento.html")}">Atendimento</a>
            <a href="${path("politicas.html#envio")}">Envio e prazos</a>
            <a href="${path("politicas.html#trocas")}">Trocas e devoluções</a>
          </div>
          <div class="footer-column footer-column--wide">
            <h2>Novidades da Hype</h2>
            <p>Deixe seu e-mail para receber lançamentos quando o catálogo entrar no ar.</p>
            <form class="newsletter" data-newsletter-form>
              <label class="sr-only" for="newsletter-email">Seu melhor e-mail</label>
              <input id="newsletter-email" type="email" required placeholder="Seu melhor e-mail">
              <button type="submit" aria-label="Cadastrar e-mail">${icon("arrow")}</button>
            </form>
          </div>
        </div>
        <div class="shell footer-bottom">
          <p>© ${new Date().getFullYear()} Hype Elite. Todos os direitos reservados.</p>
          <p>Loja em estruturação.</p>
        </div>
      </footer>`;
  }

  function handleSearch(query) {
    const target = document.querySelector("[data-search-results]");
    if (!target) return;
    const normalized = query.trim().toLocaleLowerCase("pt-BR");

    if (!normalized) {
      target.innerHTML = '<p class="search-results__hint">Digite o nome ou a categoria de um produto.</p>';
      return;
    }

    const matches = store.products.filter((product) => {
      const category = getCategory(product.category);
      const haystack = `${product.name} ${product.shortDescription} ${category ? category.name : ""}`.toLocaleLowerCase("pt-BR");
      return product.published && haystack.includes(normalized);
    }).slice(0, 6);

    target.innerHTML = matches.length
      ? `<p class="search-results__count">${matches.length} ${matches.length === 1 ? "resultado" : "resultados"}</p>
         <div class="search-results__grid">${matches.map((product) => `
           <a class="search-result" href="${productUrl(product)}">
             ${productVisual(product, "product-visual--search")}
             <span><small>${escapeHtml(getCategory(product.category).name)}</small><strong>${escapeHtml(product.name)}</strong></span>
             ${icon("arrow")}
           </a>`).join("")}</div>`
      : '<p class="search-results__hint">Nenhum produto encontrado. Tente outro termo.</p>';
  }

  function setDrawer(drawer, open) {
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    body.classList.toggle("has-drawer", open);
  }

  function bindGlobalEvents() {
    const mobileDrawer = document.querySelector("[data-mobile-drawer]");
    const searchDrawer = document.querySelector("[data-search-drawer]");
    const searchInput = document.querySelector("[data-global-search]");

    document.querySelectorAll("[data-menu-open]").forEach((button) => button.addEventListener("click", () => setDrawer(mobileDrawer, true)));
    document.querySelectorAll("[data-menu-close]").forEach((button) => button.addEventListener("click", () => setDrawer(mobileDrawer, false)));
    document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", () => {
      setDrawer(searchDrawer, true);
      setTimeout(() => searchInput && searchInput.focus(), 180);
    }));
    document.querySelectorAll("[data-search-close]").forEach((button) => button.addEventListener("click", () => setDrawer(searchDrawer, false)));
    if (searchInput) searchInput.addEventListener("input", (event) => handleSearch(event.target.value));

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      setDrawer(mobileDrawer, false);
      setDrawer(searchDrawer, false);
    });

    document.querySelectorAll("[data-newsletter-form]").forEach((form) => form.addEventListener("submit", (event) => {
      event.preventDefault();
      form.reset();
      toast("Cadastro preparado. A integração de e-mail será ativada na próxima etapa.");
    }));

    let previousY = window.scrollY;
    const header = document.querySelector("[data-sticky-header]");
    window.addEventListener("scroll", () => {
      if (!header) return;
      const currentY = window.scrollY;
      header.classList.toggle("is-compact", currentY > 24);
      header.classList.toggle("is-hidden", currentY > 180 && currentY > previousY);
      previousY = currentY;
    }, { passive: true });
  }

  renderHeader();
  renderFooter();
  bindGlobalEvents();
  updateCartCount();

  window.HypeElite = {
    root,
    store,
    icon,
    categoryIcon,
    path,
    categoryPath,
    productUrl,
    productCard,
    productVisual,
    formatPrice,
    escapeHtml,
    getCategory,
    getProduct,
    getCart,
    saveCart,
    addToCart,
    updateCartCount,
    toast,
  };
})();
