"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { PurchasedItem, BuyItem, UserPlan } from "@/types";
import { PLANS } from "@/types";
import { getApiUrl, getDjangoUrl } from "@/lib/api-url";

interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
}

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  purchasedItems: PurchasedItem[];
  login: (email: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => void;
  completeSession: (access: string, refresh: string) => Promise<boolean>;
  logout: () => void;
  addPurchase: (item: BuyItem) => void;
  setPlan: (plan: UserPlan) => void;
  downloadMedia: (index: number) => boolean;
  remainingDownloads: (item: PurchasedItem) => number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "yetou_user";
const PURCHASES_KEY = "yetou_purchases";
const TOKEN_KEY = "yetou_token";
const REFRESH_KEY = "yetou_refresh";

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}

function saveUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

function loadPurchases(): PurchasedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    return raw ? (JSON.parse(raw) as PurchasedItem[]) : [];
  } catch { return []; }
}

function savePurchases(items: PurchasedItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(items));
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function fetchProfile(accessToken: string): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/users/profile/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { id: String(data.id), name: data.name || data.email, email: data.email, plan: data.plan || "none" };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      return fetch(`${getApiUrl()}${path}`, { ...options, headers });
    }
  }
  return res;
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  try {
    const res = await fetch(`${getApiUrl()}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      const data = await res.json();
      saveToken(data.access, data.refresh || refresh);
      return true;
    }
  } catch {}
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const completeSession = useCallback(async (access: string, refresh: string): Promise<boolean> => {
    saveToken(access, refresh);
    const profile = await fetchProfile(access);
    if (!profile) {
      clearToken();
      saveUser(null);
      setUser(null);
      return false;
    }
    setUser(profile);
    saveUser(profile);
    return true;
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const cached = loadUser();
      if (cached) {
        setUser(cached);
        setPurchasedItems(loadPurchases());
      }
      fetchProfile(token)
        .then((profile) => {
          if (profile) {
            setUser(profile);
            saveUser(profile);
          } else {
            clearToken();
            saveUser(null);
            setUser(null);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setPurchasedItems(loadPurchases());
    }
  }, []);

  const login = useCallback(async (email: string, password: string, _rememberMe: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${getApiUrl()}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.non_field_errors?.[0] || data.detail || data.email?.[0] || "Email ou mot de passe incorrect.";
        return { success: false, message: msg };
      }
      const ok = await completeSession(data.access, data.refresh);
      if (!ok) return { success: false, message: "Connexion réussie mais impossible de charger le profil." };
      return { success: true, message: "Connexion réussie !" };
    } catch {
      return { success: false, message: "Erreur réseau. Vérifiez que le serveur Django est lancé." };
    }
  }, [completeSession]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${getApiUrl()}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim().toLowerCase(),
          password1: password,
          password2: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data === "object"
          ? Object.values(data).flat().join(" ")
          : "Erreur lors de l'inscription.";
        return { success: false, message: msg };
      }
      const ok = await completeSession(data.access, data.refresh);
      if (!ok) return { success: false, message: "Compte créé mais impossible de charger le profil." };
      return { success: true, message: "Compte créé avec succès !" };
    } catch {
      return { success: false, message: "Erreur réseau. Vérifiez que le serveur Django est lancé." };
    }
  }, [completeSession]);

  const loginWithGoogle = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("yetou_return_url", window.location.href);
    }
    const djangoUrl = getDjangoUrl();
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const callback = `${djangoUrl}/api/auth/google/?frontend=${encodeURIComponent(frontendUrl)}`;
    window.location.href = `${djangoUrl}/accounts/google/login/?process=login&next=${encodeURIComponent(callback)}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
    clearToken();
  }, []);

  const addPurchase = useCallback((item: BuyItem) => {
    const plan = user?.plan || "none";
    const maxDownloads = PLANS[plan].maxDownloads;
    const purchased: PurchasedItem = {
      id: 0,
      mediaId: item.mediaId || 0,
      name: item.name,
      price: item.price,
      format: item.format,
      img: item.img,
      downloadUrl: item.img,
      date: new Date().toLocaleDateString("fr-FR"),
      purchasedAt: new Date().toISOString(),
      type: item._type || "photo",
      downloadCount: 0,
      maxDownloads: maxDownloads === -1 ? 999 : maxDownloads,
      paymentStatus: "success",
      canDownload: true,
    };
    setPurchasedItems((prev) => {
      const next = [purchased, ...prev];
      savePurchases(next);
      return next;
    });
  }, [user]);

  const setPlanHandler = useCallback((plan: UserPlan) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, plan };
      saveUser(updated);
      return updated;
    });
  }, []);

  const remainingDownloads = useCallback((item: PurchasedItem) => {
    return Math.max(0, item.maxDownloads - item.downloadCount);
  }, []);

  const downloadMedia = useCallback((index: number): boolean => {
    let allowed = false;
    setPurchasedItems((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        const item = next[index];
        if (item.downloadCount < item.maxDownloads) {
          next[index] = { ...item, downloadCount: item.downloadCount + 1 };
          allowed = true;
        }
      }
      if (allowed) savePurchases(next);
      return next;
    });
    return allowed;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn: !!user, isLoading,
      purchasedItems, login, register, loginWithGoogle, completeSession, logout,
      addPurchase, setPlan: setPlanHandler, downloadMedia, remainingDownloads,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
