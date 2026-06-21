import { NextRequest, NextResponse } from "next/server";

const SINGPAY_BASE_URL = process.env.SINGPAY_BASE_URL || "";
const SINGPAY_CLIENT_ID = process.env.SINGPAY_CLIENT_ID || "";
const SINGPAY_CLIENT_SECRET = process.env.SINGPAY_CLIENT_SECRET || "";
const SINGPAY_WALLET_ID = process.env.SINGPAY_WALLET_ID || "";

const ENDPOINTS: Record<string, string> = {
  "Airtel Money": "/v1/74/paiement",
  "Moov Money": "/v1/62/paiement",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, reference, client_msisdn, portefeuille, method } = body;

    if (!amount) {
      return NextResponse.json(
        { success: false, message: "Le montant est requis." },
        { status: 400 }
      );
    }

    const isMobile = method === "Airtel Money" || method === "Moov Money";
    const isCard = method === "Visa" || method === "Mastercard";

    if (isMobile && !client_msisdn) {
      return NextResponse.json(
        { success: false, message: "Le numéro de téléphone est requis pour le paiement mobile." },
        { status: 400 }
      );
    }

    if (isCard) {
      return NextResponse.json(
        { success: false, message: "Paiement par carte bancaire pas encore disponible. Utilisez Airtel Money ou Moov Money." },
        { status: 400 }
      );
    }

    if (!SINGPAY_BASE_URL || !SINGPAY_CLIENT_ID || !SINGPAY_CLIENT_SECRET || !SINGPAY_WALLET_ID) {
      console.warn("SingPay: variables d'environnement manquantes. Mode simulation activé.");
      return NextResponse.json({
        success: true,
        message: "Paiement simulé (mode développement). Configurez SINGPAY_BASE_URL, SINGPAY_CLIENT_ID, SINGPAY_CLIENT_SECRET et SINGPAY_WALLET_ID dans .env.local pour activer SingPay.",
        transaction: {
          status: "SIMULATED",
          amount: amount.toString(),
          reference: reference || `YETOU-${Date.now()}`,
          client_msisdn: client_msisdn || "000000000",
          portefeuille: portefeuille || SINGPAY_WALLET_ID,
        },
      });
    }

    const endpoint = ENDPOINTS[method] || ENDPOINTS["Airtel Money"];

    const singpayBody: Record<string, unknown> = {
      amount: Number(amount),
      reference: reference || `YETOU-${Date.now()}`,
      client_msisdn,
      portefeuille: portefeuille || SINGPAY_WALLET_ID,
      disbursement: "",
      isTransfer: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const url = `${SINGPAY_BASE_URL}${endpoint}`;
    console.log(`SingPay → ${url} (${method})`);

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
    let data: any;
    if (contentType.includes("application/json")) {
      try { data = JSON.parse(rawText); } catch { data = rawText; }
    } else {
      console.error(`SingPay réponse inattendue (status ${response.status}, non-JSON):`, rawText.slice(0, 500));
      return NextResponse.json({
        success: false,
        message: `L'API SingPay a répondu de manière inattendue (status ${response.status}). Vérifie l'URL (${url}) et les credentials.`,
        debug: rawText.slice(0, 300),
      }, { status: 502 });
    }

    if (!response.ok) {
      console.error("SingPay error:", data);
      return NextResponse.json(
        { success: false, message: data?.status?.message || "Erreur lors du paiement SingPay." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Paiement ${method} initié. Veuillez confirmer sur votre téléphone.`,
      transaction: data.transaction,
      status: data.status,
    });
  } catch (error: any) {
    console.error("Erreur API paiement:", error);
    const isDnsError = error?.cause?.code === "ENOTFOUND";
    const isTimeout = error?.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: isDnsError
          ? `L'API SingPay est inaccessible (${SINGPAY_BASE_URL}). Vérifie SINGPAY_BASE_URL dans .env.local.`
          : isTimeout
            ? "L'API SingPay ne répond pas (timeout 15s)."
            : "Erreur serveur lors du traitement du paiement.",
      },
      { status: 502 }
    );
  }
}
