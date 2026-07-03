import { ok } from "@/lib/response";

/** Vérifie que SingPay est configuré (pas de mode simulation). */
export async function GET() {
  const configured = !!(
    process.env.SINGPAY_BASE_URL &&
    process.env.SINGPAY_CLIENT_ID &&
    process.env.SINGPAY_CLIENT_SECRET &&
    process.env.SINGPAY_WALLET_ID
  );
  return ok({ configured, mode: configured ? "singpay" : "unconfigured" });
}
