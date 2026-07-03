const SINGPAY_BASE_URL = process.env.SINGPAY_BASE_URL || "";
const SINGPAY_CLIENT_ID = process.env.SINGPAY_CLIENT_ID || "";
const SINGPAY_CLIENT_SECRET = process.env.SINGPAY_CLIENT_SECRET || "";
const SINGPAY_WALLET_ID = process.env.SINGPAY_WALLET_ID || "";
const SINGPAY_DISBURSEMENT = process.env.SINGPAY_DISBURSEMENT || "";
const SINGPAY_TIMEOUT_MS = Number(process.env.SINGPAY_TIMEOUT_MS || 45000);

const ENDPOINTS: Record<string, string> = {
  "Airtel Money": "/v1/74/paiement",
  "Moov Money": "/v1/62/paiement",
};

export function buildPaymentReference(): string {
  return `YETOU-${Date.now()}`;
}

export function sanitizeReference(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 100);
}

function assertSingPayConfigured(): string | null {
  if (!SINGPAY_BASE_URL || !SINGPAY_CLIENT_ID || !SINGPAY_CLIENT_SECRET || !SINGPAY_WALLET_ID) {
    return "SingPay n'est pas configuré. Vérifiez SINGPAY_BASE_URL, SINGPAY_CLIENT_ID, SINGPAY_CLIENT_SECRET et SINGPAY_WALLET_ID dans .env.local.";
  }
  return null;
}

function singPayHeaders() {
  return {
    "Content-Type": "application/json",
    "x-client-id": SINGPAY_CLIENT_ID,
    "x-client-secret": SINGPAY_CLIENT_SECRET,
    "x-wallet": SINGPAY_WALLET_ID,
  };
}

function normalizeGabonPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("241") && digits.length === 11) return digits;
  if (digits.length === 8 && (digits.startsWith("06") || digits.startsWith("07"))) {
    return `241${digits}`;
  }
  if (digits.length === 9 && digits.startsWith("0") && (digits[1] === "6" || digits[1] === "7")) {
    return `241${digits.slice(1)}`;
  }
  return digits;
}

function extractSingPayError(data: unknown, rawText: string, httpStatus: number): string {
  if (typeof data === "object" && data) {
    const obj = data as Record<string, unknown>;
    const status = obj.status as { message?: string; code?: string } | undefined;
    if (status?.message) return status.message;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error === "string" && obj.error) return obj.error;
  }
  if (rawText.trim()) return rawText.trim().slice(0, 280);
  return `Erreur SingPay (HTTP ${httpStatus}).`;
}

/** Détermine si SingPay confirme le paiement ou seulement l'initiation USSD. */
export function isSingPayPaymentConfirmed(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  const status = obj.status as { code?: string | number; message?: string } | undefined;
  const transaction = obj.transaction as { status?: string } | undefined;

  const code = String(status?.code ?? "").toUpperCase();
  const txStatus = String(transaction?.status ?? "").toUpperCase();
  const msg = String(status?.message ?? "").toLowerCase();

  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "200"].includes(txStatus)) return true;
  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "200"].includes(code)) return true;
  if (msg.includes("succès") || msg.includes("success") || msg.includes("réussi")) return true;
  return false;
}

function extractPaymentLink(data: Record<string, unknown>): string | undefined {
  const candidates = [
    data.link,
    data.url,
    data.payment_url,
    (data.data as Record<string, unknown> | undefined)?.link,
    (data.data as Record<string, unknown> | undefined)?.url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return undefined;
}

export interface PaymentRequest {
  amount: number;
  reference: string;
  client_msisdn: string;
  portefeuille?: string;
  method: string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  confirmed?: boolean;
  transaction?: unknown;
  status?: unknown;
  debug?: string;
}

export async function processPayment(params: PaymentRequest): Promise<PaymentResult> {
  const configError = assertSingPayConfigured();
  if (configError) {
    return { success: false, message: configError };
  }

  const { amount, reference, client_msisdn, method } = params;
  const endpoint = ENDPOINTS[method] || ENDPOINTS["Airtel Money"];
  const cleanRef = sanitizeReference(reference || buildPaymentReference());
  const normalizedPhone = normalizeGabonPhone(client_msisdn);

  const singpayBody: Record<string, unknown> = {
    amount: Number(amount),
    reference: cleanRef,
    client_msisdn: normalizedPhone,
    portefeuille: SINGPAY_WALLET_ID,
    disbursement: SINGPAY_DISBURSEMENT,
    isTransfer: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SINGPAY_TIMEOUT_MS);
  const url = `${SINGPAY_BASE_URL}${endpoint}`;

  console.log(`SingPay → ${url} (${method})`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: singPayHeaders(),
      body: JSON.stringify(singpayBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawText = await response.text();
    let data: Record<string, unknown> | string = rawText;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = rawText;
    }

    if (!response.ok) {
      console.error(`SingPay erreur (${response.status}):`, rawText.slice(0, 500));
      return {
        success: false,
        message: extractSingPayError(data, rawText, response.status),
        debug: rawText.slice(0, 400),
      };
    }

    const confirmed = typeof data === "object" && isSingPayPaymentConfirmed(data);
    console.log("SingPay réponse OK, confirmé:", confirmed);

    return {
      success: true,
      confirmed,
      message: confirmed
        ? "Paiement confirmé avec succès."
        : "Demande envoyée. Validez le paiement sur votre téléphone.",
      transaction: typeof data === "object" ? data.transaction : undefined,
      status: typeof data === "object" ? data.status : undefined,
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const error = err as Error;
    if (error.name === "AbortError") {
      return { success: false, message: `SingPay ne répond pas (${SINGPAY_TIMEOUT_MS / 1000}s). Réessayez.` };
    }
    return { success: false, message: "Impossible de joindre SingPay. Vérifiez votre connexion." };
  }
}

export interface ExternalizeRequest {
  amount: number;
  reference: string;
  redirectSuccess: string;
  redirectError: string;
}

export interface ExternalizeResult {
  success: boolean;
  link?: string;
  exp?: string;
  message?: string;
  debug?: string;
}

export async function externalizePayment(params: ExternalizeRequest): Promise<ExternalizeResult> {
  const configError = assertSingPayConfigured();
  if (configError) {
    return { success: false, message: configError };
  }

  const { amount, reference, redirectSuccess, redirectError } = params;
  const cleanRef = sanitizeReference(reference || buildPaymentReference());

  const body: Record<string, unknown> = {
    portefeuille: SINGPAY_WALLET_ID,
    reference: cleanRef,
    redirect_success: redirectSuccess,
    redirect_error: redirectError,
    amount: Number(amount),
    disbursement: SINGPAY_DISBURSEMENT,
    isTransfer: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SINGPAY_TIMEOUT_MS);
  const url = `${SINGPAY_BASE_URL}/v1/ext`;

  console.log(`SingPay ext → ${url}`);
  console.log("SingPay ext body:", JSON.stringify(body));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: singPayHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawText = await response.text();
    let data: Record<string, unknown> | string = rawText;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = rawText;
    }

    if (!response.ok) {
      console.error(`SingPay ext erreur (${response.status}):`, rawText.slice(0, 500));
      return {
        success: false,
        message: extractSingPayError(data, rawText, response.status),
        debug: rawText.slice(0, 400),
      };
    }

    if (typeof data === "object" && data) {
      const link = extractPaymentLink(data);
      if (!link) {
        return {
          success: false,
          message: "SingPay n'a pas renvoyé de lien de paiement.",
          debug: rawText.slice(0, 400),
        };
      }
      return {
        success: true,
        link,
        exp: typeof data.exp === "string" ? data.exp : undefined,
      };
    }

    return { success: false, message: "Réponse SingPay invalide.", debug: rawText.slice(0, 400) };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const error = err as Error;
    if (error.name === "AbortError") {
      return { success: false, message: `SingPay ne répond pas (${SINGPAY_TIMEOUT_MS / 1000}s). Réessayez.` };
    }
    return { success: false, message: "Impossible de joindre SingPay." };
  }
}
