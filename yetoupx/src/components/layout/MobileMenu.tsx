"use client";

interface MobileMenuProps {
  open: boolean;
  onSwitchTab: (tab: "photos" | "videos" | "tarifs") => void;
  onOpenAuth: (tab: "login" | "register") => void;
}

export default function MobileMenu({ open, onSwitchTab, onOpenAuth }: MobileMenuProps) {
  return (
    <div id="mobileMenu" className={open ? "open" : ""}>
      <a onClick={() => onSwitchTab("photos")}>Photos</a>
      <a onClick={() => onSwitchTab("videos")}>Vidéos</a>
      <a onClick={() => onSwitchTab("tarifs")}>Tarifs</a>
      <a onClick={() => { onSwitchTab("photos"); onOpenAuth("login"); }}>Connexion</a>
      <a onClick={() => { onSwitchTab("photos"); onOpenAuth("register"); }}>Créer un compte</a>
    </div>
  );
}
