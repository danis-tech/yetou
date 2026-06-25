export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePayment(body: Record<string, unknown>): ValidationResult {
  return validatePaymentInternal(body, true);
}

export function validateExternalPayment(body: Record<string, unknown>): ValidationResult {
  return validatePaymentInternal(body, false);
}

function validatePaymentInternal(body: Record<string, unknown>, requirePhone: boolean): ValidationResult {
  const errors: string[] = [];
  const { amount, method, client_msisdn } = body;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    errors.push("Le montant est requis et doit être positif.");
  }
  if (typeof amount === "number" && amount > 1_000_000) {
    errors.push("Le montant maximum est de 1 000 000 FCFA.");
  }

  const validMethods = ["Airtel Money", "Moov Money"];
  if (!method || typeof method !== "string" || !validMethods.includes(method)) {
    errors.push("Méthode de paiement invalide. Utilisez Airtel Money ou Moov Money.");
  }

  if (requirePhone) {
    const isMobile = method === "Airtel Money" || method === "Moov Money";
    if (isMobile) {
      if (!client_msisdn || typeof client_msisdn !== "string" || !client_msisdn.trim()) {
        errors.push("Le numéro de téléphone est requis.");
      } else {
        const digits = (client_msisdn as string).replace(/\D/g, "");
        const valid =
          (digits.length === 8 && (digits.startsWith("06") || digits.startsWith("07"))) ||
          (digits.length === 9 && digits.startsWith("0") && (digits[1] === "6" || digits[1] === "7")) ||
          (digits.length === 11 && digits.startsWith("241"));
        if (!valid) {
          errors.push("Numéro invalide. Format attendu : 077 000 000 ou 24177000000.");
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpload(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const { title, type, category, format, price } = body;

  if (!title || typeof title !== "string" || title.length < 2) {
    errors.push("Le titre est requis (min 2 caractères).");
  }
  if (!type || !["photo", "video"].includes(type as string)) {
    errors.push("Le type doit être 'photo' ou 'video'.");
  }
  if (!category || typeof category !== "string") {
    errors.push("La catégorie est requise.");
  }
  if (price !== undefined && (typeof price !== "number" || price < 0)) {
    errors.push("Le prix doit être un nombre positif.");
  }

  return { valid: errors.length === 0, errors };
}

const ALLOWED_MIME: Record<string, string[]> = {
  photo: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};

export function validateFileType(type: string, mimeType: string): ValidationResult {
  const allowed = ALLOWED_MIME[type];
  if (!allowed) {
    return { valid: false, errors: ["Type de média invalide."] };
  }
  if (!allowed.includes(mimeType)) {
    return { valid: false, errors: [`Format non supporté. Acceptés : ${allowed.join(", ")}`] };
  }
  return { valid: true, errors: [] };
}

const MAX_SIZES: Record<string, number> = {
  photo: 25 * 1024 * 1024,
  video: 500 * 1024 * 1024,
};

export function validateFileSize(type: string, size: number): ValidationResult {
  const max = MAX_SIZES[type];
  if (!max) return { valid: false, errors: ["Type de média invalide."] };
  if (size > max) {
    const mb = (max / (1024 * 1024)).toFixed(0);
    return { valid: false, errors: [`Fichier trop volumineux. Maximum : ${mb} Mo.`] };
  }
  return { valid: true, errors: [] };
}
