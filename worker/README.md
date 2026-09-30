# Checkout Hype Elite

O código conecta a sacola ao Stripe Checkout através de um Cloudflare Worker. A loja continua com pagamentos desligados até a configuração da conta. Nenhuma chave secreta fica no GitHub ou no navegador.

## O fluxo

- `/quote` consulta novamente os fornecedores, confere cada tamanho/preço e cria uma sessão Stripe sem cobrar. A sessão fornece o desconto e o total exatos, inclusive as condições do cupom. Nenhum cupom ou percentual foi inventado ou criado.
- `/checkout` repete a conferência e exige que o valor corresponda ao resumo aceito. Mudanças de preço pedem uma nova revisão. Tentativas iguais reutilizam a sessão por idempotência.
- `/checkout/session` verifica o pagamento diretamente no Stripe. A página de retorno só remove as quantidades compradas após essa confirmação; uma URL de sucesso não comprova pagamento.
- `/stripe/webhook` valida a assinatura no corpo original e registra o status no KV, inclusive quando o comprador não volta à loja. O registro não depende do navegador. Endereço e detalhes dos itens ficam disponíveis na sessão do Stripe para atendimento manual.

O servidor utiliza os mesmos módulos de preços e catálogo da vitrine: MIC + R$75; Aguiar Importados + R$150; depois ajusta o final para 99 centavos no mesmo real. Frete grátis, moeda BRL e endereço de entrega no Brasil.

## Configurar no Cloudflare

Use Node 22 ou superior. O Wrangler pode ser executado com `npx wrangler` na raiz do repositório.

1. Publique inicialmente com `CHECKOUT_ENABLED: "false"`:
   ```bash
   npx wrangler deploy --config worker/wrangler.jsonc
   ```
2. Crie um namespace KV com `npx wrangler kv namespace create ORDERS --config worker/wrangler.jsonc`. Adicione ao arquivo de configuração o binding real retornado:
   ```json
   "kv_namespaces": [{ "binding": "ORDERS", "id": "ID_REAL_DO_NAMESPACE" }]
   ```
3. Configure `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` como **Secrets**, usando o painel do Cloudflare ou `npx wrangler secret put NOME --config worker/wrangler.jsonc`. Use primeiro uma conta/chave de teste. Não cole chaves em arquivos ou no chat.
4. No Stripe, cadastre o endereço real do Worker seguido de `/stripe/webhook`, com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`. A versão usada nas requisições é `2026-08-26.dahlia`.
5. Confira `STORE_URL`, ative `CHECKOUT_ENABLED: "true"` e publique o Worker. Na loja, preencha `checkoutApiUrl` com o endereço real (HTTPS, sem barra final) e ative `checkoutEnabled` em `assets/js/store-data.js`. Atualize a versão desse script na sacola e na página de pagamento e publique o Pages.

Teste o fluxo completo no modo de teste antes de usar a chave de produção. O conector Stripe do ChatGPT não instala automaticamente uma chave no Worker.

## Cupons

Use códigos promocionais cadastrados na conta Stripe. O código é salvo na sacola; sem backend configurado, aparece como aguardando conferência e não altera o total. Códigos inválidos, expirados ou que não atendem às condições são recusados pelo Stripe. Produtos criados por `price_data` não correspondem aos IDs de produtos existentes na conta: use cupons gerais para essa vitrine; cupons restritos a produtos específicos exigem um mapeamento de IDs.

## Disponibilidade dos tênis

A aba Importados informa numerações possíveis, sem estoque por tamanho. O Worker recusa o pagamento de tênis sem confirmação do fornecedor para o pedido específico. O KV recebe `confirmation:ID_DO_PEDIDO` com os modelos, tamanhos e quantidades a conferir. Após confirmar com o fornecedor, o responsável pode registrar `stock:ID_DO_PEDIDO:ID_DO_PRODUTO:TAMANHO` com:

```json
{ "quantity": 1, "expiresAt": "DATA_ISO_DA_EXPIRACAO" }
```

A confirmação vale para aquele pedido e tamanho, precisa cobrir a quantidade e deve expirar em até uma hora. Esse procedimento não reserva estoque no fornecedor. A integração de reserva/estoque real e o painel de pedidos permanecem pendentes; não há baixa de estoque automática nem envio automático ao fornecedor.

## Verificar

```bash
node --test tests/*.test.mjs
npx wrangler deploy --dry-run --config worker/wrangler.jsonc
```

Referências: [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [webhooks](https://docs.stripe.com/webhooks/signature), [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
