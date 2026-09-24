# Hype Elite — estrutura inicial da loja

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
└── .github/workflows/pages.yml
```

## Abrir no computador

O site não precisa de instalação. Para testar todas as rotas corretamente, abra um terminal na pasta e rode um servidor local:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Cadastrar produtos

Os dados atuais são demonstrativos e ficam em `assets/js/store-data.js`. Cada produto aceita:

- nome, categoria e descrição;
- valor e valor comparativo;
- tamanhos ou numerações;
- destaque na home;
- disponibilidade e publicação;
- cor do espaço visual.

Para ativar uma venda, defina um preço numérico e altere `available` para `true`. Fotos reais serão adicionadas na próxima etapa.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie esta pasta para a branch `main`.
2. Abra **Settings → Pages** no repositório.
3. Em **Build and deployment**, selecione **GitHub Actions**.
4. O workflow em `.github/workflows/pages.yml` publicará o site automaticamente.

## Checkout e segurança

O checkout está intencionalmente desligado. O GitHub Pages é estático e não pode guardar segredos com segurança.

- Nunca coloque uma chave secreta do Stripe em HTML ou JavaScript público.
- A futura integração deve criar a sessão de pagamento em uma função segura no servidor.
- O painel atual é visual; autenticação e banco de dados ainda precisam ser conectados.
- O arquivo `robots.txt` pede aos buscadores que não indexem `/painel/`, mas isso não substitui login.

## Próximas etapas recomendadas

1. Inserir produtos reais, fotos, preços e tabelas de medidas.
2. Definir WhatsApp, e-mail e horários oficiais de atendimento.
3. Conectar banco de dados e login do painel.
4. Integrar Stripe, frete e acompanhamento de pedidos.
5. Revisar dados empresariais e políticas antes da abertura pública.
