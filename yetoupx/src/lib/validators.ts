export interface ValidationResult {
  valid: boolean;
  errors: string[];
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
