"use client";

import type { Tab } from "@/types";

interface SectionTabsProps {
  activeTab: Tab;
  onSwitchTab: (tab: Tab) => void;
  photoCount: number;
  videoCount: number;
}

export default function SectionTabs({ activeTab, onSwitchTab, photoCount, videoCount }: SectionTabsProps) {
  return (
    <div className="section-tabs">
      <div className={`stab ${activeTab === "photos" ? "active" : ""}`} onClick={() => onSwitchTab("photos")}>
        <i className="ti ti-photo"></i> Photos <span className="badge">{photoCount}</span>
      </div>
      <div className={`stab ${activeTab === "videos" ? "active" : ""}`} onClick={() => onSwitchTab("videos")}>
        <i className="ti ti-video"></i> Vidéos <span className="badge">{videoCount}</span>
      </div>
      <div className={`stab ${activeTab === "tarifs" ? "active" : ""}`} onClick={() => onSwitchTab("tarifs")}>
        <i className="ti ti-tag"></i> Tarifs &amp; abonnements
      </div>
    </div>
  );
}
