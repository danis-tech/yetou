const SINGPAY_BASE_URL = process.env.SINGPAY_BASE_URL || "";
const SINGPAY_CLIENT_ID = process.env.SINGPAY_CLIENT_ID || "";
const SINGPAY_CLIENT_SECRET = process.env.SINGPAY_CLIENT_SECRET || "";
const SINGPAY_WALLET_ID = process.env.SINGPAY_WALLET_ID || "";

// Nettoie une référence : ne garde que [a-zA-Z0-9_-], max 100 caractères
export function sanitizeReference(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 100);
}

// Code pays Gabon : 241
// Airtel Gabon : 07X → 2417X  (ex: 077000000 → 24177000000)
// Moov Gabon  : 06X → 2416X  (ex: 062000000 → 24162000000)
function normalizeGabonPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Déjà au format international complet (241 + 8 chiffres = 11 chiffres)
  if (digits.startsWith("241") && digits.length === 11) return digits;

  // Format local 8 chiffres : 06X ou 07X
  if (digits.length === 8 && (digits.startsWith("06") || digits.startsWith("07"))) {
    return `241${digits}`;
  }

  // Format local 9 chiffres avec 0 devant : 006X ou 007X
  if (digits.length === 9 && digits.startsWith("0") && (digits[1] === "6" || digits[1] === "7")) {
    return `241${digits.slice(1)}`;
  }

  // Retourner tel quel — SingPay renverra une erreur explicite
  return digits;
}

const ENDPOINTS: Record<string, string> = {
  "Airtel Money": "/v1/74/paiement",
  "Moov Money": "/v1/62/paiement",
};

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
  transaction?: unknown;
  status?: unknown;
  debug?: string;
  simulated?: boolean;
}

export function isSimulated(): boolean {
  return !SINGPAY_BASE_URL || !SINGPAY_CLIENT_ID || !SINGPAY_CLIENT_SECRET || !SINGPAY_WALLET_ID;
}

export async function processPayment(params: PaymentRequest): Promise<PaymentResult> {
  const { amount, reference, client_msisdn, method } = params;

  if (isSimulated()) {
    console.warn("SingPay: variables d'environnement manquantes. Mode simulation activé.");
    return {
      success: true,
      message:
        "Paiement simulé (mode développement). Configurez les variables SINGPAY_* dans .env.local pour activer SingPay.",
      transaction: {
        status: "SIMULATED",
        amount: amount.toString(),
        reference: reference || `YETOU-${Date.now()}`,
        client_msisdn: client_msisdn || "000000000",
        portefeuille: SINGPAY_WALLET_ID,
      },
      simulated: true,
    };
  }

  const endpoint = ENDPOINTS[method] || ENDPOINTS["Airtel Money"];

  // Normaliser au format international gabonais (241XXXXXXXX)
  const normalizedPhone = normalizeGabonPhone(client_msisdn);

    const cleanRef = sanitizeReference(reference || `YETOU-${Date.now()}`);

    const singpayBody: Record<string, unknown> = {
      amount: Number(amount),
      reference: cleanRef,
    client_msisdn: normalizedPhone,
    // portefeuille = wallet ID du marchand (pas du client)
    portefeuille: SINGPAY_WALLET_ID,
    // disbursement : vide pour portefeuille de test, requis en production
    disbursement: "",
    // isTransfer: false sauf si une distribution est configurée dans SingPay
    isTransfer: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const url = `${SINGPAY_BASE_URL}${endpoint}`;
  console.log(`SingPay → ${url} (${method})`);
  console.log("SingPay body:", JSON.stringify({ ...singpayBody, portefeuille: "[WALLET_ID]" }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": SINGPAY_CLIENT_ID,
      "x-client-secret": SINGPAY_CLIENT_SECRET,
      "x-wallet": SINGPAY_WALLET_ID,
    },
    body: JSON.stringify(singpayBody),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let data: Record<string, unknown> | string = rawText;

  if (contentType.includes("application/json")) {
    try { data = JSON.parse(rawText) as Record<string, unknown>; } catch { data = rawText; }
  }

  if (!response.ok) {
    console.error(`SingPay erreur (status ${response.status}):`, rawText.slice(0, 500));
    let errMsg: string | undefined;
    if (typeof data === "object" && data && "status" in data) {
      errMsg = (data as { status?: { message?: string } }).status?.message;
    }
    if (!errMsg && typeof data === "string" && data.trim()) {
      errMsg = data.trim();
    }
    return {
      success: false,
      message: errMsg || `Erreur SingPay (${response.status}). Vérifiez vos informations.`,
      debug: rawText.slice(0, 300),
    };
  }

  if (typeof data === "string") {
    console.warn(`SingPay réponse 2xx non-JSON (status ${response.status}):`, rawText.slice(0, 300));
  }

  console.log("SingPay succès:", typeof data === "object" ? (data as Record<string, unknown>).status : data);

  return {
    success: true,
    message: `Paiement ${method} initié. Veuillez confirmer sur votre téléphone.`,
    transaction: typeof data === "object" ? (data as Record<string, unknown>).transaction : undefined,
    status: typeof data === "object" ? (data as Record<string, unknown>).status : undefined,
  };
}

// ─── Externalisation (lien de paiement) ────────────────────────────────

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
  simulated?: boolean;
}

export async function externalizePayment(params: ExternalizeRequest): Promise<ExternalizeResult> {
  const { amount, reference, redirectSuccess, redirectError } = params;

  if (isSimulated()) {
    return {
      success: true,
      link: `http://localhost:3000/paiement/test?ref=${encodeURIComponent(reference)}`,
      exp: new Date(Date.now() + 3600000).toISOString(),
      simulated: true,
    };
  }

  const cleanRef = sanitizeReference(reference || `YETOU-${Date.now()}`);

  const body: Record<string, unknown> = {
    portefeuille: SINGPAY_WALLET_ID,
    reference: cleanRef,
    redirect_success: redirectSuccess,
    redirect_error: redirectError,
    amount: Number(amount),
    disbursement: "",
    isTransfer: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const url = `${SINGPAY_BASE_URL}/v1/ext`;
  console.log(`SingPay ext → ${url}`);
  console.log("SingPay ext body:", JSON.stringify({ ...body, portefeuille: "[WALLET_ID]" }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": SINGPAY_CLIENT_ID,
        "x-client-secret": SINGPAY_CLIENT_SECRET,
        "x-wallet": SINGPAY_WALLET_ID,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();
    let data: Record<string, unknown> | string = rawText;

    if (contentType.includes("application/json")) {
      try { data = JSON.parse(rawText) as Record<string, unknown>; } catch { data = rawText; }
    }

    if (!response.ok) {
      console.error(`SingPay ext erreur (status ${response.status}):`, rawText.slice(0, 500));
      let errMsg: string | undefined;
      if (typeof data === "object" && data && "status" in data) {
        errMsg = (data as { status?: { message?: string } }).status?.message;
      }
      if (!errMsg && typeof data === "string" && data.trim()) {
        errMsg = data.trim();
      }
      return {
        success: false,
        message: errMsg || `Erreur SingPay (${response.status}).`,
        debug: rawText.slice(0, 300),
      };
    }

    if (typeof data === "object" && data) {
      return {
        success: true,
        link: (data as Record<string, unknown>).link as string,
        exp: (data as Record<string, unknown>).exp as string,
      };
    }

    return { success: false, message: "Réponse SingPay invalide.", debug: rawText.slice(0, 300) };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const error = err as Error;
    if (error.name === "AbortError") {
      return { success: false, message: "L'API SingPay ne répond pas (timeout 15s)." };
    }
    return { success: false, message: "Erreur réseau SingPay." };
  }
}
