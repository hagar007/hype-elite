(function () {
  "use strict";
  const checkout = window.HypeEliteCheckout;
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id"), requestId = params.get("pedido");
  const card = document.querySelector("[data-payment-card]");
  const title = document.querySelector("[data-payment-title]");
  const message = document.querySelector("[data-payment-message]");
  const total = document.querySelector("[data-payment-total]");
  const retry = document.querySelector("[data-payment-retry]");
  async function verify() {
    card.setAttribute("aria-busy", "true"); retry.hidden = true;
    try {
      if (!sessionId || !requestId || !checkout.isConfigured()) throw new Error("Não foi possível conferir esse pagamento. Sua sacola permanece salva.");
      const data = await checkout.request("/checkout/session", { sessionId, requestId });
      if (data.paid === true && data.requestId === requestId && Number.isSafeInteger(data.totalCents) && data.totalCents >= 0) {
        title.textContent = "Pagamento confirmado";
        message.textContent = "Obrigado pela sua compra. Guarde a confirmação recebida no pagamento para acompanhar seu pedido.";
        total.textContent = `Total pago: ${window.HypeElite.formatPrice(data.totalCents / 100)}`; total.hidden = false;
        checkout.completeOrder(sessionId, requestId);
      } else {
        title.textContent = data.status === "expired" ? "Pagamento não concluído" : "Aguardando confirmação";
        message.textContent = data.status === "expired" ? "Esse pagamento expirou. Seus itens continuam na sacola para uma nova tentativa." : "Seu pagamento ainda está sendo conferido. Você pode consultar novamente em instantes.";
        retry.hidden = data.status === "expired";
      }
    } catch (error) {
      title.textContent = "Não foi possível conferir";
      message.textContent = error.message;
      retry.hidden = !sessionId || !requestId || !checkout.isConfigured();
    } finally { card.setAttribute("aria-busy", "false"); }
  }
  retry.addEventListener("click", verify);
  verify();
})();
