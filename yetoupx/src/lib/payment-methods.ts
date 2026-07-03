export const PAY_METHODS = [
  { name: "Airtel Money", logo: "", available: true },
  { name: "Moov Money", logo: "", available: true },
  { name: "Visa", logo: "/visa.svg", available: true },
  { name: "Mastercard", logo: "/mastercard.svg", available: true },
] as const;

export const CARD_METHODS = new Set(["Visa", "Mastercard"]);
export const MOBILE_METHODS = new Set(["Airtel Money", "Moov Money"]);

export function isCardMethod(method: string): boolean {
  return CARD_METHODS.has(method);
}

export function isMobileMethod(method: string): boolean {
  return MOBILE_METHODS.has(method);
}

export function logoForPayMethod(
  method: string,
  airtelLogoSrc: string,
  moovLogoSrc: string,
): string {
  if (method === "Airtel Money") return airtelLogoSrc;
  if (method === "Moov Money") return moovLogoSrc;
  if (method === "Visa") return "/visa.svg";
  return "/mastercard.svg";
}
