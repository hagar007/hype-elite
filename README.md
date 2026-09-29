# Hype Elite — loja e catálogo

Base estática, responsiva e pronta para GitHub Pages. O projeto foi organizado para começar com camisas de time, tênis, meias e roupas de academia, mantendo páginas próprias para bonés, papetes e slides, sapatos, acessórios e novas expansões.

## O que já existe

- Home premium em preto, branco e cinza, usando o monograma oficial HE.
- Catálogo geral com ordenação e páginas separadas por categoria.
- Página de produto com tamanhos, informações e área de imagens.
- Busca global e sacola persistida no navegador.
- Páginas institucionais: marca, atendimento e políticas.
- Painel visual em `/painel/` com menu para pedidos, produtos, categorias, estoque, financeiro, clientes e configurações.
- Workflow pronto para publicação automática no GitHub Pages.
- Layout responsivo para computador, tablet e celular.

## Vitrine para celular

- Início com oito categorias visíveis, uma foto real por categoria e quatro destaques de camisas e tênis.
- As capas temáticas são locais, comprimidas e documentadas em `assets/img/categories/SOURCES.json`. Categorias sem produtos continuam sinalizadas como Em breve. Nenhum produto de outra aba do Catálogo Aguiar é importado.
- Fotos dos banners selecionadas nas galerias existentes do fornecedor; fontes registradas em `assets/img/campaign/SOURCES.json`. Apenas redução de resolução e compressão WebP foram aplicadas. Nenhuma imagem gerada por IA foi incluída nessa reforma.
- Cantos arredondados nas fotos, nas capas, nas miniaturas e na ampliação em um diálogo na própria página.
- Filtros avançados recolhidos, com pesquisa e público sempre acessíveis. Produtos demonstrativos ficam fora da vitrine.
- `assets/css/mobile.css` concentra os ajustes da experiência para celular. Imagens de campanha e logo leves são servidos pelo próprio site.
- `campaignProductIds` e a seleção de fotos em `store-data.js` controlam os destaques. Preço e disponibilidade continuam vindo da atualização de catálogo; produto indisponível sai dos destaques.

## Tipografia

A interface usa a pilha `Helvetica Now Text`, `Helvetica Neue`, Helvetica e Arial. Os destaques usam `NikeFuturaND-CnXBold` ou `Futura Condensed Extra Bold` quando essas fontes estão instaladas no aparelho; o fallback incluído é Anton, sob SIL Open Font License (`assets/fonts/OFL-Anton.txt`). As fontes proprietárias da Nike não são distribuídas pelo projeto. Para reproduzir as mesmas faces em todos os aparelhos, será necessário fornecer arquivos com licença para uso na web. O fallback Anton é servido pelo próprio site, sem depender de serviços externos.

## Estrutura principal

```text
hype-elite/
├── index.html
├── catalogo.html
├── produto.html
├── carrinho.html
├── sobre.html
├── atendimento.html
├── politicas.html
├── categorias/
├── painel/
├── assets/
│   ├── css/
│   ├── img/
│   └── js/
└── .github/workflows/static.yml
```

## Abrir no computador

O site não precisa de instalação. Para testar todas as rotas corretamente, abra um terminal na pasta e rode um servidor local:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Catálogo de camisas de time

Os modelos e todas as fotos vêm do catálogo público `https://catalogopro.app/?tab=models`. Produtos arquivados saem da vitrine. O importador cruza o ID Shopify ou o nome exato normalizado com o catálogo público da MIC; diferenças de nome revisadas ficam em `scripts/catalog-mappings.json`. Não há correspondência aproximada entre modelos parecidos.

**Regra vigente: preço normal de cada variação na MIC + R$75,00.** O acréscimo é fixo, inclusive para kits adultos e infantis (uma vez por kit). Não se usam preço comparativo, desconto de Pix, valores antigos de R$154,90/R$139,90 ou margem percentual. O cálculo é feito em centavos.

Um tamanho só pode entrar na sacola se estiver disponível tanto no catálogo quanto na MIC e tiver preço confirmado. As fontes públicas não informam a quantidade de unidades: a loja não inventa esses números. Modelos sem correspondência/preço atual continuam visíveis, com compra bloqueada. Todas as camisas e kits têm frete grátis.

O arquivo gerado é `assets/js/catalog-products.js`; não edite preços nele manualmente. Para atualizar e testar:

```bash
node --test tests/catalog.test.mjs
node scripts/sync-catalog.mjs
```

Node 22 ou superior, sem dependências npm. O script precisa acessar `base44.app` e `miccamisasdetime.com.br`. O workflow `.github/workflows/static.yml` atualiza o catálogo antes de publicar em pushes para `main`, no comando manual **Run workflow** e aproximadamente a cada seis horas (GitHub Actions pode atrasar execuções agendadas). Os dados atualizados entram diretamente no artefato do Pages; o agendamento não cria commits.

Se uma fonte falhar ou retornar uma estrutura inválida, o workflow falha antes da publicação e o último site publicado é preservado. O resumo da execução mostra contagens, preços ausentes e modelos que precisam de conferência. Fontes sem correspondência atual não reutilizam preço/estoque antigos.

A vitrine tem busca por time/modelo, filtros combináveis de público, nacionais, internacionais, seleções, retrô, kits e disponibilidade, além de ordenação por preço. As fotos são exibidas sem recorte em molduras padronizadas; a galeria permite ver todas e ampliar a original.

## Tênis importados

O importador `scripts/sync-sneakers.mjs` lê exclusivamente os links de modelos presentes em `https://catalogoaguiar.netlify.app/cat-importado`. As fotos e identificadores permanecem vinculados a cada modelo. O preço público associado ao ID recebe **R$150,00 por par**, calculados em centavos. Todos os tênis têm frete grátis. Preços ausentes bloqueiam o modelo.

A fonte divulga intervalos de numeração, não estoque unitário em tempo real. A vitrine e a sacola sinalizam **sob encomenda, disponibilidade a confirmar**. A seleção de tamanho não afirma reserva de estoque. Antes de ligar pagamentos automáticos, será necessário confirmar a disponibilidade com o fornecedor.

O arquivo `assets/js/sneaker-products.js` é gerado e atualizado pelo workflow antes de cada publicação, junto com o catálogo de camisas. Se a fonte retornar dados incompletos, a publicação é interrompida para preservar o site anterior. Filtros por marca, busca e ordenação estão disponíveis na categoria Tênis.

```bash
node --test tests/*.test.mjs
node scripts/sync-sneakers.mjs
```

## Outras categorias

As outras categorias mantêm rascunhos em `assets/js/store-data.js`, com `published: false`. Eles não aparecem na loja, na busca nem no catálogo; as categorias vazias mostram uma mensagem curta de novidades em breve. Cada produto aceita:

- nome, categoria e descrição;
- valor e valor comparativo;
- tamanhos ou numerações;
- destaque na home;
- disponibilidade e publicação;
- cor do espaço visual.

Para publicar um produto real, cadastre fotos e preço, confirme tamanhos/disponibilidade e defina `published: true`. O checkout continua dependente da integração segura descrita abaixo.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie esta pasta para a branch `main`.
2. Abra **Settings → Pages** no repositório.
3. Em **Build and deployment**, selecione **GitHub Actions**.
4. O workflow em `.github/workflows/static.yml` publicará o site automaticamente.

## Checkout e segurança

O checkout está intencionalmente desligado. O GitHub Pages é estático e não pode guardar segredos com segurança.

- Nunca coloque uma chave secreta do Stripe em HTML ou JavaScript público.
- A futura integração deve criar a sessão de pagamento em uma função segura no servidor.
- O painel atual é visual; autenticação e banco de dados ainda precisam ser conectados.
- O arquivo `robots.txt` pede aos buscadores que não indexem `/painel/`, mas isso não substitui login.

## Próximas etapas recomendadas

1. Confirmar modelos sem preço de origem e adicionar tabelas de medidas específicas.
2. Definir WhatsApp, e-mail e horários oficiais de atendimento.
3. Conectar banco de dados e login do painel.
4. Integrar Stripe, frete e acompanhamento de pedidos.
5. Revisar dados empresariais e políticas antes da abertura pública.
