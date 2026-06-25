"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  preview?: boolean;
  autoPlay?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({ src, poster, preview, autoPlay }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(preview ? true : false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncMuted = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => { syncMuted(); }, [syncMuted]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || seeking) return;
    setCurrentTime(video.currentTime);
  }, [seeking]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    if (autoPlay && !preview) {
      video.play().catch(() => {});
    }
  }, [autoPlay, preview]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const progress = progressRef.current;
      if (!video || !progress || !duration) return;

      const rect = progress.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX === undefined) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      video.currentTime = ratio * duration;
      setCurrentTime(video.currentTime);
    },
    [duration]
  );

  const handleSeekStart = useCallback(() => {
    setSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setSeeking(false);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", () => setPlaying(true));
    video.addEventListener("pause", () => setPlaying(false));

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded]);

  // Autoplay for preview mode
  useEffect(() => {
    if (!preview || !autoPlay) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    const timer = setTimeout(() => {
      video.play().catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [preview, autoPlay, src]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", overflow: "hidden" }}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        playsInline
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload"
        disablePictureInPicture
      />

      {/* Top-right group: mute + duration */}
      <div style={{
        position: "absolute", top: "12px", right: "12px", zIndex: 20,
        display: "flex", gap: "6px", alignItems: "center",
      }}>
        {preview && (
          <div style={{
            background: "rgba(0,0,0,0.7)", color: "#fff",
            fontSize: "10px", fontWeight: 600, padding: "6px 10px", borderRadius: "8px",
            fontVariantNumeric: "tabular-nums",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {duration > 0 ? formatTime(duration) : ""}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          title={muted ? "Activer le son" : "Couper le son"}
          style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(200,55,26,0.75)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.65)"; }}
        >
          <i className={`ti ${muted ? "ti-volume-off" : "ti-volume"}`}></i>
        </button>
      </div>

      {/* PRÉVISUALISATION badge + quality */}
      {preview && (
        <div style={{
          position: "absolute", top: "12px", left: "12px", zIndex: 20,
          display: "flex", gap: "6px",
        }}>
          <div style={{
            background: "rgba(200,55,26,0.85)", color: "#fff",
            fontSize: "10px", fontWeight: 700, padding: "4px 12px", borderRadius: "8px",
            display: "flex", alignItems: "center", gap: "4px",
          }}>
            <i className="ti ti-eye" style={{ fontSize: "12px" }}></i> PRÉVISUALISATION
          </div>
          <div style={{
            background: "rgba(0,0,0,0.7)", color: "#fff",
            fontSize: "10px", fontWeight: 700, padding: "4px 10px", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            4K UHD
          </div>
        </div>
      )}

      {/* Big play button overlay */}
      {!playing && (
        <div
          onClick={togglePlay}
          style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 5,
          }}
        >
          <div style={{
            width: preview ? "70px" : "80px", height: preview ? "70px" : "80px", borderRadius: "50%",
            background: "rgba(200,55,26,0.9)", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 0 40px rgba(200,55,26,0.4)",
            cursor: "pointer",
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
            }}
          >
            <i className="ti ti-player-play" style={{ fontSize: "32px", color: "#fff", marginLeft: "4px" }}></i>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        padding: "40px 16px 14px",
        opacity: showControls ? 1 : 0,
        transition: "opacity 0.3s ease",
        zIndex: 10, pointerEvents: showControls ? "auto" : "none",
      }}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          onMouseDown={(e) => { handleSeekStart(); handleSeek(e); }}
          onMouseMove={(e) => { if (seeking) handleSeek(e); }}
          onMouseUp={handleSeekEnd}
          onMouseLeave={handleSeekEnd}
          onTouchStart={(e) => { handleSeekStart(); handleSeek(e); }}
          onTouchMove={(e) => { if (seeking) handleSeek(e); }}
          onTouchEnd={handleSeekEnd}
          style={{
            width: "100%", height: "6px", background: "rgba(255,255,255,0.2)",
            borderRadius: "3px", cursor: "pointer", marginBottom: "10px",
            position: "relative",
          }}
        >
          <div style={{
            height: "100%", width: `${progressPct}%`,
            background: preview ? "linear-gradient(90deg, #C8371A, #e04528)" : "#C8371A",
            borderRadius: "3px",
            transition: seeking ? "none" : "width 0.1s linear",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", right: "-6px", top: "-4px",
              width: "14px", height: "14px", borderRadius: "50%",
              background: "#C8371A", opacity: seeking ? 1 : 0,
              transition: "opacity 0.15s",
              boxShadow: "0 0 4px rgba(200,55,26,0.6)",
            }} />
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            style={{
              width: "36px", height: "36px", display: "flex", alignItems: "center",
              justifyContent: "center", background: "none", border: "none",
              color: "#fff", cursor: "pointer", fontSize: "18px",
            }}
          >
            <i className={`ti ${playing ? "ti-player-pause" : "ti-player-play"}`} style={{ fontSize: "22px" }}></i>
          </button>

          {/* Time */}
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums", minWidth: "85px" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Watermark */}
          <span style={{
            fontFamily: "Sora, sans-serif", fontSize: "10px", fontWeight: 700,
            color: "rgba(255,255,255,0.25)", letterSpacing: "2px",
            textTransform: "lowercase", userSelect: "none",
          }}>
            yétou
          </span>
        </div>
      </div>

      {/* Bottom protection bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "rgba(10,10,15,0.6)", backdropFilter: "blur(4px)",
        padding: "4px 12px", display: "flex", alignItems: "center", justifyContent: "center",
        gap: "8px", zIndex: 6, borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <i className="ti ti-shield-lock" style={{ fontSize: "10px", color: "#8A8A95" }}></i>
        <span style={{ fontSize: "9px", color: "#8A8A95" }}>
          Lecture autorisée · Téléchargement protégé par yétou
        </span>
      </div>
    </div>
  );
}
