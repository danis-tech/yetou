"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthTab } from "@/types";

interface AuthModalProps {
  open: boolean;
  authTab: AuthTab;
  onClose: () => void;
  onSwitchTab: (tab: AuthTab) => void;
  googleLogoSrc: string;
  showToast: (msg: string, isError?: boolean) => void;
}

export default function AuthModal({ open, authTab, onClose, onSwitchTab, googleLogoSrc, showToast }: AuthModalProps) {
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Veuillez remplir tous les champs.", true);
      return;
    }
    setIsSubmitting(true);
    const result = await login(email, password, rememberMe);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
      showToast("Connexion réussie ! Redirection...");
      setTimeout(() => router.push("/dashboard"), 800);
    } else {
      showToast(result.message, true);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showToast("Veuillez remplir tous les champs.", true);
      return;
    }
    if (password !== confirmPassword) {
      showToast("Les mots de passe ne correspondent pas.", true);
      return;
    }
    if (password.length < 6) {
      showToast("Le mot de passe doit contenir au moins 6 caractères.", true);
      return;
    }
    setIsSubmitting(true);
    const result = await register(name, email, password);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
      showToast("Compte créé avec succès ! Redirection...");
      setTimeout(() => router.push("/dashboard"), 800);
    } else {
      showToast(result.message, true);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      authTab === "login" ? handleLogin() : handleRegister();
    }
  };

  if (!open) return null;

  return (
    <div className={`modal-bg ${open ? "open" : ""}`} id="modal-auth">
      <div className="modal" onKeyDown={handleKeyDown}>
        <button className="modal-close" onClick={onClose}>
          <i className="ti ti-x"></i>
        </button>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${authTab === "login" ? "active" : ""}`}
            onClick={() => onSwitchTab("login")}
          >
            Connexion
          </button>
          <button
            className={`auth-tab ${authTab === "register" ? "active" : ""}`}
            onClick={() => onSwitchTab("register")}
          >
            Créer un compte
          </button>
        </div>

        {authTab === "login" && (
          <div>
            <div className="form-group">
              <label>Adresse email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <label
                onClick={() => setRememberMe(!rememberMe)}
                style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#8A8A95" }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                Se souvenir de moi
              </label>
              <a style={{ color: "#C8371A", fontSize: "12px", cursor: "pointer" }}>Mot de passe oublié ?</a>
            </div>
            <button className="btn-auth" onClick={handleLogin} disabled={isSubmitting}>
              {isSubmitting ? "Connexion en cours..." : "Se connecter"}
            </button>
            <div className="auth-sep">— ou —</div>
            <button
              onClick={handleGoogleLogin}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", padding: "10px", border: "1px solid #2A2A35",
                borderRadius: "8px", background: "transparent", color: "#F0EFEA",
                width: "100%", cursor: "pointer", fontSize: "13px",
              }}
            >
              <img src={googleLogoSrc} alt="Google" style={{ width: "18px", height: "18px" }} /> Continuer avec Google
            </button>
          </div>
        )}

        {authTab === "register" && (
          <div>
            <div className="form-group">
              <label>Nom complet</label>
              <input
                type="text"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Adresse email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="6 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#8A8A95", marginBottom: "16px" }}>
              <input type="checkbox" style={{ width: "16px", height: "16px", marginTop: "2px" }} />
              <span>
                J&apos;accepte les <a style={{ color: "#C8371A" }}>conditions d&apos;utilisation</a> et la{" "}
                <a style={{ color: "#C8371A" }}>politique de confidentialité</a>
              </span>
            </label>
            <button className="btn-auth" onClick={handleRegister} disabled={isSubmitting}>
              {isSubmitting ? "Création en cours..." : "Créer mon compte"}
            </button>
            <div className="auth-sep">— ou —</div>
            <button
              onClick={handleGoogleLogin}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", padding: "10px", border: "1px solid #2A2A35",
                borderRadius: "8px", background: "transparent", color: "#F0EFEA",
                width: "100%", cursor: "pointer", fontSize: "13px",
              }}
            >
              <img src={googleLogoSrc} alt="Google" style={{ width: "18px", height: "18px" }} /> S&apos;inscrire avec Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
