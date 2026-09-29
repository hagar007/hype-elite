// Shared by catalog updates and the server checkout. All calculations use cents.
export const MARKUP_CENTS = 7500;
export const SNEAKER_MARKUP_CENTS = 15000;

export function supplierCents(value) {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function ending99Cents(cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  const result = Math.floor(cents / 100) * 100 + 99;
  return Number.isSafeInteger(result) ? result : null;
}

export function priceWithMarkup(value, markupCents) {
  const cost = supplierCents(value);
  if (cost === null || !Number.isSafeInteger(markupCents) || markupCents < 0) return null;
  const price = ending99Cents(cost + markupCents);
  return price === null ? null : price / 100;
}

export const retailPrice = value => priceWithMarkup(value, MARKUP_CENTS);
export const sneakerPrice = value => priceWithMarkup(value, SNEAKER_MARKUP_CENTS);
