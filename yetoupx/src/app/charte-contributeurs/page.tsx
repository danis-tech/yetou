"use client";

import { useEffect, useState } from "react";
import LegalPage from "@/components/legal/LegalPage";
import { fetchProgramConfig, type ProgramConfig } from "@/services/contributors";

const fcfa = (n: number | null | undefined) => (n == null ? "[montant]" : `${n.toLocaleString("fr-FR")} FCFA`);

export default function ChartePage() {
  // Les chiffres viennent des réglages de l'admin : la charte suit toujours les règles en vigueur.
  const [cfg, setCfg] = useState<ProgramConfig | null>(null);
  useEffect(() => { fetchProgramConfig().then(setCfg); }, []);
  const seconds = cfg?.max_video_seconds ?? 90;

  return (
    <LegalPage
      title="Charte des contributeurs"
      updatedAt="[date de mise en ligne]"
      intro={
        <p>
          Cette charte s&apos;applique aux photographes, vidéastes et pilotes de drone qui proposent leurs médias sur
          Pixia. Elle complète les conditions d&apos;utilisation. En créant votre profil contributeur, vous l&apos;acceptez.
        </p>
      }
      sections={[
        {
          id: "droits", title: "Vos droits sur les médias envoyés",
          body: (
            <>
              <p>Vous garantissez être l&apos;auteur des médias envoyés, ou disposer de tous les droits pour les vendre, et que leur diffusion ne porte atteinte à personne :</p>
              <ul>
                <li>autorisation des personnes reconnaissables à l&apos;image ;</li>
                <li>autorisation pour les lieux privés et les œuvres protégées visibles ;</li>
                <li>respect de la réglementation sur les vols de drone au Gabon (zones interdites, autorisations de vol).</li>
              </ul>
              <p>En cas de réclamation d&apos;un tiers, le média est retiré et vous en assumez la responsabilité.</p>
            </>
          ),
        },
        {
          id: "examen", title: "Examen avant publication",
          body: (
            <>
              <p>Chaque média est examiné par l&apos;équipe Pixia avant d&apos;être publié : netteté, exposition, cadrage, résolution réelle, intérêt pour le catalogue. La qualité que vous indiquez peut être revue lors de l&apos;examen ; c&apos;est la qualité retenue qui fixe le prix de vente et, en rachat direct, le montant versé.</p>
              <p>Un média refusé vous est signalé avec le motif. Tant qu&apos;il n&apos;est pas publié, vous pouvez le retirer depuis votre espace.</p>
              <p>Limites : photos de {cfg?.max_photo_size_mb ?? 25} Mo, vidéos de {cfg?.max_video_size_mb ?? 500} Mo et {Math.floor(seconds / 60)} min {String(seconds % 60).padStart(2, "0")} s au maximum.</p>
            </>
          ),
        },
        {
          id: "remuneration", title: "Rémunération",
          body: (
            <>
              <p>Pour chaque média, vous choisissez l&apos;un des deux modes suivants au moment de l&apos;envoi :</p>
              <ul>
                <li>
                  <strong>Partage des ventes</strong> : vous fixez le prix de vente, entre {fcfa(cfg?.min_price)} et {fcfa(cfg?.max_price)}.
                  À chaque vente confirmée, vous recevez {cfg?.contributor_percent ?? 70} % du prix ; Pixia conserve {cfg?.commission_percent ?? 30} %.
                  Le pourcentage appliqué est celui en vigueur au moment de la vente.
                </li>
                <li>
                  <strong>Rachat direct</strong> : vous êtes payé une seule fois, à la publication, selon la qualité retenue
                  (jusqu&apos;à {fcfa(cfg?.max_buyout.photo)} par photo et {fcfa(cfg?.max_buyout.video)} par vidéo en qualité maximale).
                  Pixia devient alors seul titulaire des droits d&apos;exploitation commerciale du média et fixe son prix ;
                  vous ne percevez plus rien sur ses ventes. [Étendue de la cession à faire préciser par un juriste.]
                </li>
              </ul>
              <p>En partage des ventes, vous accordez à Pixia une licence non exclusive pour exposer et vendre le média, que vous pouvez retirer en nous écrivant ; les licences déjà vendues restent valables.</p>
            </>
          ),
        },
        {
          id: "retraits", title: "Retraits",
          body: (
            <>
              <p>Vos gains s&apos;ajoutent à votre solde. Vous pouvez demander un retrait depuis votre espace dès {fcfa(cfg?.min_payout)}. L&apos;équipe vérifie la demande, envoie le montant sur le numéro Mobile Money de votre profil, puis joint la référence et la preuve du transfert, consultables dans votre espace.</p>
              <p>Vérifiez votre numéro : un versement envoyé sur un numéro erroné que vous avez saisi ne peut pas être refait. [Délai de traitement à préciser.]</p>
            </>
          ),
        },
        {
          id: "credit", title: "Crédit et présentation",
          body: <p>Vos médias publiés portent la mention « par [votre nom affiché], contributeur ». Ils ne sont pas présentés comme des productions de Pixia.</p>,
        },
        {
          id: "suspension", title: "Suspension",
          body: <p>Pixia peut suspendre un compte contributeur en cas de manquement à cette charte (média volé, fraude, contenu illicite). Les gains issus de médias litigieux peuvent être retenus le temps de l&apos;examen.</p>,
        },
        {
          id: "modifications", title: "Modification des règles",
          body: <p>Les pourcentages, tarifs de rachat et limites peuvent évoluer ; les chiffres affichés sur cette page sont toujours ceux en vigueur. Une modification ne s&apos;applique pas aux gains déjà acquis.</p>,
        },
      ]}
    />
  );
}
