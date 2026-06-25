export const APP = {
  name: "yétou",
  version: "1.0.0",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

export const MEDIA = {
  MAX_PHOTO_SIZE: 25 * 1024 * 1024,
  MAX_VIDEO_SIZE: 500 * 1024 * 1024,
  ALLOWED_PHOTO_TYPES: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
} as const;

export const RATE_LIMITS = {
  PAYMENT: { maxRequests: 10, windowMs: 60_000 },
  UPLOAD: { maxRequests: 5, windowMs: 60_000 },
  API: { maxRequests: 60, windowMs: 60_000 },
} as const;

export const CATEGORIES = [
  "paysages", "nature", "culture", "events", "archi",
] as const;
