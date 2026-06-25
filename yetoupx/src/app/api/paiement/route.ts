import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validatePayment } from "@/lib/validators";
import { processPayment, isSimulated } from "@/services/payment";
import { ok, badRequest, tooManyRequests, badGateway, serverError } from "@/lib/response";

const DJANGO_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
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
    await fetch(`${DJANGO_URL}/payments/log/`, {
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
    const { allowed, remaining } = rateLimit(`paiement:${ip}`, 10, 60000);

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

    const { amount, reference, client_msisdn, portefeuille, method } = body as {
      amount: number; reference: string; client_msisdn: string; portefeuille?: string; method: string;
    };

    const isCard = method === "Visa" || method === "Mastercard";
    if (isCard) {
      return badRequest("Paiement par carte bancaire pas encore disponible. Utilisez Airtel Money ou Moov Money.");
    }

    const result = await processPayment({ amount, reference, client_msisdn, portefeuille, method });

    // Log payment to Django admin
    const txId = result.transaction && typeof result.transaction === "object"
      ? String((result.transaction as Record<string, unknown>).reference || reference)
      : reference;
    logToDjango({
      amount,
      method,
      reference: reference || "",
      phone: client_msisdn || "",
      status: isSimulated() ? "simulated" : (result.success ? "success" : "failed"),
      message: result.message,
      transaction_id: txId,
    }).catch(() => {});

    if (!result.success) {
      return badGateway(result.message);
    }

    return ok(result);
  } catch (error: unknown) {
    console.error("Erreur API paiement:", error);
    const err = error as Error & { cause?: { code?: string } };
    if (err?.cause?.code === "ENOTFOUND") {
      return badGateway("L'API SingPay est inaccessible. Vérifiez SINGPAY_BASE_URL.");
    }
    if (err?.name === "AbortError") {
      return badGateway("L'API SingPay ne répond pas (timeout 15s).");
    }
    return serverError("Erreur lors du traitement du paiement.");
  }
}
