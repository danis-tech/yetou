export interface Photo {
  id: number;
  title: string;
  details: string;
  format: string;
  price: string;
  img: string;
  pcat: string;
  pres: string;
  downloads: number;
}

export interface Video {
  id: number;
  title: string;
  details: string;
  format: string;
  duration: string;
  price: string;
  img: string;
  videoUrl: string;
  vcat: string;
  vdur: string;
  downloads: number;
}

export type Tab = "photos" | "videos" | "tarifs";
export type AuthTab = "login" | "register";
export type UserPlan = "none" | "monthly" | "pro";

export interface BuyItem {
  name: string;
  price: string;
  format: string;
  img: string;
  _type?: "photo" | "video";
}

export interface PurchasedItem extends BuyItem {
  downloadUrl: string;
  date: string;
  type: "photo" | "video";
  downloadCount: number;
  maxDownloads: number;
}

export interface PlanLimits {
  name: string;
  price: string;
  color: string;
  description: string;
  maxDownloads: number;
  photosHd: boolean;
  photos4k: boolean;
  videos4k: boolean;
  rawIncluded: boolean;
  invoice: boolean;
  supportPriority: boolean;
}

export const PLANS: Record<UserPlan, PlanLimits> = {
  none: {
    name: "Achat à l'unité",
    price: "—",
    color: "#8A8A95",
    description: "Payez par média, sans engagement",
    maxDownloads: 1,
    photosHd: true,
    photos4k: true,
    videos4k: true,
    rawIncluded: false,
    invoice: false,
    supportPriority: false,
  },
  monthly: {
    name: "Abonnement Mensuel",
    price: "15 000 FCFA/mois",
    color: "#C8371A",
    description: "Photos illimitées HD & 4K",
    maxDownloads: 10,
    photosHd: true,
    photos4k: true,
    videos4k: false,
    rawIncluded: false,
    invoice: false,
    supportPriority: false,
  },
  pro: {
    name: "Abonnement Pro",
    price: "50 000 FCFA/mois",
    color: "#C8371A",
    description: "Photos + Vidéos illimitées",
    maxDownloads: -1,
    photosHd: true,
    photos4k: true,
    videos4k: true,
    rawIncluded: true,
    invoice: true,
    supportPriority: true,
  },
};
