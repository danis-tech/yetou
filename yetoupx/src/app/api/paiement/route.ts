import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validatePayment } from "@/lib/validators";
import { processPayment } from "@/services/payment";
import { buildPaymentReference, sanitizeReference } from "@/services/payment";
import { ok, badRequest, tooManyRequests, badGateway, serverError } from "@/lib/response";

import { getServerDjangoApiUrl } from "@/lib/api-url";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "yetou-internal-secret-change-me";

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
    const { allowed } = rateLimit(`paiement:${ip}`, 10, 60000);

    if (!allowed) {
      return tooManyRequests("Trop de requêtes. Veuillez réessayer dans une minute.");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Corps de requête invalide.");
    }

    const validation = validatePayment(body);
    if (!validation.valid) {
      return badRequest(validation.errors.join(" "));
    }

    const { amount, reference, client_msisdn, method } = body as {
      amount: number; reference: string; client_msisdn: string; method: string;
    };

    const cleanRef = sanitizeReference(reference || buildPaymentReference());

    const result = await processPayment({
      amount,
      reference: cleanRef,
      client_msisdn,
      method,
    });

    const txId = result.transaction && typeof result.transaction === "object"
      ? String((result.transaction as Record<string, unknown>).reference || cleanRef)
      : cleanRef;

    logToDjango({
      amount,
      method,
      reference: cleanRef,
      phone: client_msisdn || "",
      status: result.confirmed ? "success" : (result.success ? "pending" : "failed"),
      message: result.message,
      transaction_id: txId,
    }).catch(() => {});

    if (!result.success) {
      return badGateway(result.message, process.env.NODE_ENV === "development" ? result.debug : undefined);
    }

    return ok({
      success: true,
      confirmed: !!result.confirmed,
      message: result.message,
      reference: cleanRef,
    });
  } catch (error: unknown) {
    console.error("Erreur API paiement:", error);
    const err = error as Error & { cause?: { code?: string } };
    if (err?.cause?.code === "ENOTFOUND") {
      return badGateway("L'API SingPay est inaccessible. Vérifiez SINGPAY_BASE_URL.");
    }
    if (err?.name === "AbortError") {
      return badGateway("L'API SingPay ne répond pas (timeout).");
    }
    return serverError("Erreur lors du traitement du paiement.");
  }
}
