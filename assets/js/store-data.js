(function () {
  "use strict";

  window.HYPE_ELITE_STORE = {
    brand: {
      name: "Hype Elite",
      tagline: "Futebol, estilo e atitude.",
      businessModel: "Produtos selecionados sob encomenda",
      shipsTo: "Envios para todo o Brasil",
    },

    settings: {
      currency: "BRL",
      locale: "pt-BR",
      checkoutEnabled: false,
      catalogStatus: "draft",
    },

    categories: [
      {
        id: "camisas-de-time",
        name: "Camisas de time",
        eyebrow: "O jogo veste você",
        description: "Clubes, seleções e modelos especiais em uma seleção feita para quem vive futebol.",
        href: "categorias/camisas-de-time/",
        icon: "jersey",
        tone: "ink",
        status: "active",
      },
      {
        id: "tenis",
        name: "Tênis",
        eyebrow: "Movimento e presença",
        description: "Modelos casuais e esportivos para completar o visual dentro e fora da rotina.",
        href: "categorias/tenis/",
        icon: "sneaker",
        tone: "stone",
        status: "active",
      },
      {
        id: "meias",
        name: "Meias",
        eyebrow: "Essenciais do dia",
        description: "Opções esportivas e casuais pensadas para conforto e combinação fácil.",
        href: "categorias/meias/",
        icon: "socks",
        tone: "silver",
        status: "active",
      },
      {
        id: "academia",
        name: "Academia",
        eyebrow: "Performance no ritmo",
        description: "Roupas e conjuntos para treino com visual limpo, conforto e liberdade de movimento.",
        href: "categorias/academia/",
        icon: "dumbbell",
        tone: "graphite",
        status: "active",
      },
      {
        id: "bones",
        name: "Bonés",
        eyebrow: "Os detalhes importam",
        description: "Uma futura seleção de bonés para completar o visual Hype Elite.",
        href: "categorias/bones/",
        icon: "cap",
        tone: "paper",
        status: "planned",
      },
      {
        id: "papetes-e-slides",
        name: "Papetes & slides",
        eyebrow: "Conforto fora da curva",
        description: "Uma categoria reservada para modelos leves, casuais e fáceis de combinar.",
        href: "categorias/papetes-e-slides/",
        icon: "sneaker",
        tone: "stone",
        status: "planned",
      },
      {
        id: "sapatos",
        name: "Sapatos",
        eyebrow: "Novos passos",
        description: "Espaço preparado para ampliar o catálogo de calçados além dos tênis.",
        href: "categorias/sapatos/",
        icon: "sneaker",
        tone: "graphite",
        status: "planned",
      },
      {
        id: "acessorios",
        name: "Acessórios",
        eyebrow: "A escolha final",
        description: "Itens complementares para expandir a marca com organização e identidade.",
        href: "categorias/acessorios/",
        icon: "box",
        tone: "silver",
        status: "planned",
      },
    ],

    products: [
      {
        id: "camisa-001",
        slug: "camisa-de-time-modelo-01",
        name: "Camisa de time — modelo 01",
        category: "camisas-de-time",
        kind: "jersey",
        badge: "Em breve",
        shortDescription: "Espaço preparado para o primeiro lançamento da categoria.",
        description: "A página do produto já está estruturada para receber fotos, descrição, tamanhos, prazo e valor do modelo.",
        price: null,
        compareAtPrice: null,
        sizes: ["P", "M", "G", "GG", "XG"],
        featured: true,
        available: false,
        published: false,
        color: "#e7e5e4",
      },
      {
        id: "camisa-002",
        slug: "camisa-de-time-modelo-02",
        name: "Camisa de time — modelo 02",
        category: "camisas-de-time",
        kind: "jersey",
        badge: "Em breve",
        shortDescription: "Estrutura pronta para clubes, seleções ou edições especiais.",
        description: "Cadastre aqui todas as informações do segundo produto da coleção de camisas.",
        price: null,
        compareAtPrice: null,
        sizes: ["P", "M", "G", "GG", "XG"],
        featured: false,
        available: false,
        published: false,
        color: "#d6d3d1",
      },
      {
        id: "tenis-001",
        slug: "tenis-modelo-01",
        name: "Tênis — modelo 01",
        category: "tenis",
        kind: "sneaker",
        badge: "Em breve",
        shortDescription: "Primeiro espaço da curadoria de tênis Hype Elite.",
        description: "Página preparada para fotos, numeração, descrição, disponibilidade e valor.",
        price: null,
        compareAtPrice: null,
        sizes: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43"],
        featured: true,
        available: false,
        published: false,
        color: "#e5e7eb",
      },
      {
        id: "tenis-002",
        slug: "tenis-modelo-02",
        name: "Tênis — modelo 02",
        category: "tenis",
        kind: "sneaker",
        badge: "Em breve",
        shortDescription: "Um segundo espaço para ampliar o catálogo da categoria.",
        description: "Substitua este conteúdo quando o produto estiver pronto para venda.",
        price: null,
        compareAtPrice: null,
        sizes: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43"],
        featured: false,
        available: false,
        published: false,
        color: "#d1d5db",
      },
      {
        id: "meias-001",
        slug: "meias-modelo-01",
        name: "Meias — modelo 01",
        category: "meias",
        kind: "socks",
        badge: "Em breve",
        shortDescription: "Área pronta para kits, cores e variações de tamanho.",
        description: "Cadastre a composição do kit, as cores disponíveis e os cuidados com a peça.",
        price: null,
        compareAtPrice: null,
        sizes: ["34–38", "39–43"],
        featured: true,
        available: false,
        published: false,
        color: "#f1f5f9",
      },
      {
        id: "academia-001",
        slug: "conjunto-academia-modelo-01",
        name: "Conjunto academia — modelo 01",
        category: "academia",
        kind: "dumbbell",
        badge: "Em breve",
        shortDescription: "Espaço para o primeiro conjunto da linha fitness.",
        description: "A estrutura aceita variações de tamanho, cor, fotos e orientações de medida.",
        price: null,
        compareAtPrice: null,
        sizes: ["P", "M", "G", "GG"],
        featured: true,
        available: false,
        published: false,
        color: "#d4d4d4",
      },
      {
        id: "bones-001",
        slug: "bone-modelo-01",
        name: "Boné — futuro lançamento",
        category: "bones",
        kind: "cap",
        badge: "Próxima fase",
        shortDescription: "Categoria reservada para a expansão do catálogo.",
        description: "A página já existe para que a categoria possa ser ativada quando chegar o momento.",
        price: null,
        compareAtPrice: null,
        sizes: ["Ajustável"],
        featured: false,
        available: false,
        published: false,
        color: "#e7e5e4",
      },
    ],
  };

  if (Array.isArray(window.HYPE_ELITE_CATALOG_PRODUCTS)) {
    window.HYPE_ELITE_STORE.products = [
      ...window.HYPE_ELITE_CATALOG_PRODUCTS,
      ...window.HYPE_ELITE_STORE.products.filter(product => product.category !== "camisas-de-time"),
    ];
    window.HYPE_ELITE_STORE.catalog = window.HYPE_ELITE_CATALOG_META;
    window.HYPE_ELITE_STORE.settings.catalogStatus = "published";
  }
  if (Array.isArray(window.HYPE_ELITE_SNEAKER_PRODUCTS)) {
    window.HYPE_ELITE_STORE.products = [
      ...window.HYPE_ELITE_STORE.products.filter(product => product.category !== "tenis"),
      ...window.HYPE_ELITE_SNEAKER_PRODUCTS,
    ];
    window.HYPE_ELITE_STORE.sneakers = window.HYPE_ELITE_SNEAKER_META;
  }
  window.HYPE_ELITE_STORE.categories.forEach(category => {
    category.cover = `assets/img/categories/${category.id}.webp`;
    category.coverAlt = {
      "camisas-de-time": "Camisa de time do catálogo",
      "tenis": "Tênis importado do catálogo",
      "meias": "Par de meias",
      "academia": "Roupa esportiva para treino",
      "bones": "Boné",
      "papetes-e-slides": "Par de slides",
      "sapatos": "Sapatos de couro",
      "acessorios": "Óculos e relógio",
    }[category.id];
  });
  // Reviewed close-up photos from the existing supplier galleries.
  const campaignPhotos = {"mic-6ab416efee0db68cf42877ad": {"photo": "https://base44.app/api/apps/69386f6ce9fe29121d66f65f/files/mp/public/69386f6ce9fe29121d66f65f/15c05be35_shopify_1790251197201.jpg", "preview": "assets/img/campaign/madrid-640.webp"}, "mic-6ab6a089105ec3e5f46bd823": {"photo": "https://base44.app/api/apps/69386f6ce9fe29121d66f65f/files/mp/public/69386f6ce9fe29121d66f65f/21ea8573f_shopify_1790353540092.jpg", "preview": "assets/img/campaign/retro-640.webp"}, "mic-6ab7d3066a4e45d17b42bc65": {"photo": "https://base44.app/api/apps/69386f6ce9fe29121d66f65f/files/mp/public/69386f6ce9fe29121d66f65f/cacdbeb74_shopify_1790432003161.jpg", "preview": "assets/img/campaign/nacionais-640.webp"}, "mic-6aaa7d06da710689ca68299d": {"photo": "https://base44.app/api/apps/69386f6ce9fe29121d66f65f/files/mp/public/69386f6ce9fe29121d66f65f/edd896a8a_shopify_1790252389102.jpg", "preview": "assets/img/campaign/selecoes-640.webp"}};
  window.HYPE_ELITE_STORE.campaignProductIds = Object.keys(campaignPhotos);
  window.HYPE_ELITE_STORE.products.forEach(product => {
    const selected = campaignPhotos[product.id];
    if (selected && product.photos?.includes(selected.photo)) {
      product.photos = [selected.photo, ...product.photos.filter(photo => photo !== selected.photo)];
      product.photoPreview = selected.preview;
    }
  });
})();
