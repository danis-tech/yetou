"use client";

import { useState } from "react";
import { probeVideo, submitContribution, type PayoutMode, type ProgramConfig } from "@/services/contributors";

interface SubmitFormProps {
  config: ProgramConfig;
  onSubmitted: () => void;
  showToast: (msg: string, isError?: boolean) => void;
}

const fcfa = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("fr-FR")} FCFA`);

export default function SubmitForm({ config, onSubmitted, showToast }: SubmitFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [kind, setKind] = useState<"photo" | "video" | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [thumb, setThumb] = useState<Blob | null>(null);
  const [fields, setFields] = useState({
    title: "", description: "", category: config.categories[0]?.slug || "", quality: config.qualities[0]?.slug || "",
    province: "", city: "", tags: "", price: String(Math.max(config.min_price, 1000)),
  });
  const [mode, setMode] = useState<PayoutMode>("revenue_share");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);

  const extOf = (name: string) => name.split(".").pop()?.toLowerCase() || "";
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields({ ...fields, [k]: e.target.value });

  const pickFile = async (f: File | null) => {
    setErrors({});
    setFile(null); setKind(null); setSeconds(0); setThumb(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    if (!f) return;
    const ext = extOf(f.name);
    const type = config.photo_extensions.includes(ext) ? "photo" : config.video_extensions.includes(ext) ? "video" : null;
    if (!type) {
      setErrors({ file: "Format non accepté. Photos : JPG, PNG, WebP. Vidéos : MP4, MOV, WebM." });
      return;
    }
    const limit = (type === "photo" ? config.max_photo_size_mb : config.max_video_size_mb) * 1024 * 1024;
    if (f.size > limit) {
      setErrors({ file: `Fichier trop lourd : ${type === "photo" ? config.max_photo_size_mb : config.max_video_size_mb} Mo maximum.` });
      return;
    }
    setFile(f); setKind(type);
    if (type === "photo") {
      setPreview(URL.createObjectURL(f));
    } else {
      const probe = await probeVideo(f);
      setSeconds(probe.seconds);
      setThumb(probe.thumbnail);
      if (probe.thumbnail) setPreview(URL.createObjectURL(probe.thumbnail));
      if (probe.seconds > config.max_video_seconds) {
        setErrors({ file: `Vidéo trop longue (${probe.seconds} s) : ${config.max_video_seconds} s maximum.` });
      }
    }
    if (!fields.title) setFields((prev) => ({ ...prev, title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }));
  };

  const buyoutFor = kind ? config.buyout_rates.find((r) => r.media_type === kind && r.quality === fields.quality)?.amount : undefined;
  const buyoutMax = kind ? config.max_buyout[kind] : null;
  const price = parseInt(fields.price, 10) || 0;
  const share = Math.floor((price * config.contributor_percent) / 100);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !kind) {
      setErrors({ file: "Choisissez une photo ou une vidéo." });
      return;
    }
    if (errors.file) return;
    const form = new FormData();
    form.append("file", file);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append("payout_mode", mode);
    if (kind === "video") {
      form.append("duration_seconds", String(seconds));
      if (thumb) form.append("thumbnail", thumb, "miniature.jpg");
    }
    setProgress(0);
    const r = await submitContribution(form, setProgress);
    setProgress(null);
    if (!r.ok) {
      setErrors(r.errors || {});
      showToast(r.error, true);
      return;
    }
    showToast("Média envoyé. Notre équipe l'examine avant publication.");
    onSubmitted();
  };

  return (
    <form className="ctb-form ctb-submit" onSubmit={submit} noValidate>
      <label className={`ctb-drop ${file ? "has-file" : ""}`}>
        <input type="file" accept={[...config.photo_extensions, ...config.video_extensions].map((x) => `.${x}`).join(",")}
          onChange={(e) => pickFile(e.target.files?.[0] || null)} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Aperçu du média choisi" />
        ) : (
          <span>
            <i className="ti ti-cloud-upload" aria-hidden="true"></i>
            <strong>Choisir une photo ou une vidéo</strong>
            <small>
              Photos jusqu&apos;à {config.max_photo_size_mb} Mo. Vidéos jusqu&apos;à {config.max_video_size_mb} Mo
              et {Math.floor(config.max_video_seconds / 60)} min {String(config.max_video_seconds % 60).padStart(2, "0")} s.
            </small>
          </span>
        )}
      </label>
      {file && (
        <p className="ctb-file-meta">
          {kind === "video" ? "Vidéo" : "Photo"}, {(file.size / 1048576).toFixed(1)} Mo
          {kind === "video" && seconds > 0 && `, ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
        </p>
      )}
      {errors.file && <small className="ctb-error">{errors.file}</small>}
      {errors.duration_seconds && <small className="ctb-error">{errors.duration_seconds}</small>}

      <label>
        Titre
        <input value={fields.title} onChange={set("title")} maxLength={255} placeholder="Embouchure de l'Ogooué au coucher du soleil" aria-invalid={!!errors.title} />
        {errors.title && <small className="ctb-error">{errors.title}</small>}
      </label>
      <label>
        Description <em>(facultatif)</em>
        <textarea rows={3} value={fields.description} onChange={set("description")} maxLength={2000} />
      </label>
      <div className="ctb-form-row">
        <label>
          Catégorie
          <select value={fields.category} onChange={set("category")}>
            {config.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label>
          Qualité proposée
          <select value={fields.quality} onChange={set("quality")}>
            {config.qualities.map((q) => <option key={q.slug} value={q.slug}>{q.name}</option>)}
          </select>
        </label>
      </div>
      <div className="ctb-form-row">
        <label>Province <em>(facultatif)</em><input value={fields.province} onChange={set("province")} placeholder="Ogooué-Maritime" /></label>
        <label>Ville ou lieu <em>(facultatif)</em><input value={fields.city} onChange={set("city")} placeholder="Port-Gentil" /></label>
      </div>
      <label>Mots-clés <em>(séparés par des virgules)</em><input value={fields.tags} onChange={set("tags")} placeholder="drone, plage, cap Lopez" /></label>

      <fieldset className="ctb-mode-pick">
        <legend>Comment voulez-vous être payé ?</legend>
        <label className={mode === "revenue_share" ? "is-selected" : ""}>
          <input type="radio" name="mode" checked={mode === "revenue_share"} onChange={() => setMode("revenue_share")} />
          <span>
            <strong>Partage des ventes</strong>
            <small>Vous fixez le prix et touchez {config.contributor_percent} % de chaque vente.</small>
          </span>
        </label>
        <label className={mode === "buyout" ? "is-selected" : ""}>
          <input type="radio" name="mode" checked={mode === "buyout"} onChange={() => setMode("buyout")} />
          <span>
            <strong>Rachat direct</strong>
            <small>Payé une fois à la validation, jusqu&apos;à {fcfa(kind ? buyoutMax : config.max_buyout.photo)}{kind ? "" : " par photo"}.</small>
          </span>
        </label>
      </fieldset>

      {mode === "revenue_share" ? (
        <label>
          Prix de vente (FCFA)
          <input type="number" inputMode="numeric" min={config.min_price} max={config.max_price} step={50}
            value={fields.price} onChange={set("price")} aria-invalid={!!errors.price} />
          <small className="ctb-hint">
            Entre {fcfa(config.min_price)} et {fcfa(config.max_price)}. Pour vous : <strong>{fcfa(share)}</strong> par vente,
            Pixia : {fcfa(price - share)}.
          </small>
          {errors.price && <small className="ctb-error">{errors.price}</small>}
        </label>
      ) : (
        <p className="ctb-hint ctb-hint-box">
          {buyoutFor
            ? <>Si l&apos;équipe retient la qualité {fields.quality}, vous recevrez <strong>{fcfa(buyoutFor)}</strong> à la validation.</>
            : <>Le montant sera fixé par l&apos;équipe selon la qualité retenue, dans la limite de {fcfa(buyoutMax ?? config.max_buyout.photo)}.</>}
          {" "}Le média appartiendra ensuite à Pixia.
        </p>
      )}

      {progress !== null && (
        <div className="ctb-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }}></span>
          <small>Envoi {progress} %</small>
        </div>
      )}
      <button className="btn-primary" type="submit" disabled={progress !== null || !config.accepting_submissions}>
        {progress !== null ? "Envoi en cours…" : "Envoyer pour validation"}
      </button>
      {!config.accepting_submissions && <small className="ctb-error">Les envois sont momentanément fermés.</small>}
    </form>
  );
}
