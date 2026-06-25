"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { PurchasedItem, BuyItem, UserPlan } from "@/types";
import { PLANS } from "@/types";

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
  logout: () => void;
  addPurchase: (item: BuyItem) => void;
  setPlan: (plan: UserPlan) => void;
  downloadMedia: (index: number) => boolean;
  remainingDownloads: (item: PurchasedItem) => number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      return fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }
  return res;
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const cached = loadUser();
      if (cached) {
        setUser(cached);
        setPurchasedItems(loadPurchases());
        setIsLoading(false);
      }
      apiFetch("/users/profile/")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const u: User = { id: data.id, name: data.name, email: data.email, plan: data.plan };
            setUser(u);
            saveUser(u);
          } else {
            clearToken();
            saveUser(null);
            setUser(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoading(false);
          setHydrated(true);
        });
    } else {
      setIsLoading(false);
      setHydrated(true);
    }
    if (!token) setPurchasedItems(loadPurchases());
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || data.non_field_errors?.[0] || "Email ou mot de passe incorrect." };
      }
      saveToken(data.access, data.refresh);
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, data.access);
        localStorage.setItem(REFRESH_KEY, data.refresh);
      }
      const profileRes = await apiFetch("/users/profile/");
      const profile = await profileRes.json();
      const u: User = { id: profile.id, name: profile.name, email: profile.email, plan: profile.plan };
      setUser(u);
      saveUser(u);
      return { success: true, message: "Connexion réussie !" };
    } catch {
      return { success: false, message: "Erreur réseau. Vérifiez que le serveur Django est lancé." };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password1: password, password2: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data === "object"
          ? Object.values(data).flat().join(" ")
          : "Erreur lors de l'inscription.";
        return { success: false, message: msg };
      }
      saveToken(data.access, data.refresh);
      const u: User = { id: data.user?.id || "new", name, email, plan: "none" };
      setUser(u);
      saveUser(u);
      return { success: true, message: "Compte créé avec succès !" };
    } catch {
      return { success: false, message: "Erreur réseau. Vérifiez que le serveur Django est lancé." };
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    // Mémoriser la page actuelle pour y revenir après le callback Google
    if (typeof window !== "undefined") {
      localStorage.setItem("yetou_return_url", window.location.href);
    }
    const djangoUrl = API_URL.replace("/api", "");
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${frontendUrl}/auth/callback`;
    window.location.href = `${djangoUrl}/accounts/google/login/?process=login&next=/api/auth/google/?frontend=${encodeURIComponent(callbackUrl)}`;
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
      name: item.name,
      price: item.price,
      format: item.format,
      img: item.img,
      downloadUrl: item.img,
      date: new Date().toLocaleDateString("fr-FR"),
      type: item._type || "photo",
      downloadCount: 0,
      maxDownloads: maxDownloads === -1 ? 999 : maxDownloads,
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
      purchasedItems, login, register, loginWithGoogle, logout,
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
