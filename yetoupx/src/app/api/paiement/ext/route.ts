import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateExternalPayment } from "@/lib/validators";
import { externalizePayment, buildPaymentReference, sanitizeReference } from "@/services/payment";
import { ok, badRequest, tooManyRequests, badGateway, serverError } from "@/lib/response";

import { getServerDjangoApiUrl } from "@/lib/api-url";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "yetou-internal-secret-change-me";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function logToDjango(data: {
  amount: number;
  method: string;
  reference: string;
  phone: string;
  status: string;
  message: string;
  transaction_id: string;
}) {
  try {
    await fetch(`${getServerDjangoApiUrl()}/payments/log/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(data),
    });
  } catch {
    console.warn("Impossible d'enregistrer le paiement dans Django.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`paiement-ext:${ip}`, 10, 60000);

    if (!allowed) {
      return tooManyRequests("Trop de requêtes. Veuillez réessayer dans une minute.");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Corps de requête invalide.");
    }

    const validation = validateExternalPayment(body);
    if (!validation.valid) {
      return badRequest(validation.errors.join(" "));
    }

    const { amount, reference, method } = body as {
      amount: number; reference: string; method: string;
    };

    const cleanRef = sanitizeReference(reference || buildPaymentReference());
    const redirectSuccess = `${APP_URL}/paiement/retour?status=success&ref=${encodeURIComponent(cleanRef)}`;
    const redirectError = `${APP_URL}/paiement/retour?status=error&ref=${encodeURIComponent(cleanRef)}`;

    const result = await externalizePayment({
      amount: Number(amount),
      reference: cleanRef,
      redirectSuccess,
      redirectError,
    });

    logToDjango({
      amount: Number(amount),
      method,
      reference: cleanRef,
      phone: "",
      status: result.success ? "pending" : "failed",
      message: result.link || result.message || "",
      transaction_id: cleanRef,
    }).catch(() => {});

    if (!result.success) {
      return badGateway(result.message || "Erreur SingPay.", process.env.NODE_ENV === "development" ? result.debug : undefined);
    }

    return ok({ success: true, link: result.link, exp: result.exp, reference: cleanRef });
  } catch (error: unknown) {
    console.error("Erreur API paiement externalisé:", error);
    return serverError("Erreur lors du traitement du paiement.");
  }
}
