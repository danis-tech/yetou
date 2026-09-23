import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Conditions d'utilisation · Pixia" };

export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      updatedAt="[date de mise en ligne]"
      intro={
        <p>
          Ces conditions encadrent l&apos;utilisation de Pixia, plateforme de vente de photos et de vidéos aériennes
          du Gabon. En créant un compte ou en achetant un média, vous les acceptez.
        </p>
      }
      sections={[
        {
          id: "editeur", title: "Qui édite Pixia",
          body: (
            <>
              <p>Pixia est édité par Agenxia, [forme juridique] au capital de [montant] FCFA, immatriculée au RCCM de [ville] sous le numéro [numéro], dont le siège est situé [adresse], Libreville, Gabon.</p>
              <p>Contact : [adresse e-mail de contact]. Directeur de la publication : [nom].</p>
            </>
          ),
        },
        {
          id: "compte", title: "Votre compte",
          body: (
            <>
              <p>La création d&apos;un compte est gratuite. Vous devez fournir une adresse e-mail valide et un mot de passe d&apos;au moins 8 caractères, ou utiliser votre compte Google.</p>
              <p>Vous êtes responsable de la confidentialité de votre mot de passe et des actions faites depuis votre compte. Prévenez-nous sans délai en cas d&apos;utilisation non autorisée.</p>
              <p>Nous pouvons suspendre un compte utilisé en violation de ces conditions (fraude au paiement, partage illicite de médias, usurpation d&apos;identité).</p>
            </>
          ),
        },
        {
          id: "achats", title: "Achats et paiement",
          body: (
            <>
              <p>Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises [à confirmer selon votre régime fiscal]. Le prix affiché au moment du paiement est celui qui s&apos;applique.</p>
              <p>Le paiement se fait par Airtel Money, Moov Money ou carte Visa / Mastercard, via notre prestataire de paiement MyPVit. Les frais de transaction de l&apos;opérateur sont à la charge du client. Pixia ne voit ni ne conserve vos codes PIN ni vos numéros de carte.</p>
              <p>Un achat n&apos;est accordé qu&apos;une fois le paiement confirmé par le prestataire. Vous en êtes informé dans votre espace client.</p>
            </>
          ),
        },
        {
          id: "telechargement", title: "Téléchargement des médias",
          body: (
            <>
              <p>Un média acheté se télécharge depuis votre espace client, dans la limite du nombre de téléchargements prévu par votre formule (1 par achat à l&apos;unité, davantage avec un abonnement). Chaque lien de téléchargement est temporaire.</p>
              <p>Les aperçus affichés sur le site portent un filigrane et ne peuvent pas être utilisés.</p>
            </>
          ),
        },
        {
          id: "licence", title: "Licence d'utilisation",
          body: (
            <>
              <p>L&apos;achat d&apos;un média vous donne un droit d&apos;utilisation, non un droit de propriété. Son étendue dépend de la licence indiquée sur la fiche du média :</p>
              <ul>
                <li><strong>Commerciale, illimitée</strong> : web, impression, publicité, sans limite de durée ni de tirage.</li>
                <li><strong>Usage web uniquement</strong> : sites internet, réseaux sociaux, lettres d&apos;information.</li>
                <li><strong>Usage éditorial</strong> : presse et information, sans usage commercial.</li>
                <li><strong>Usage personnel</strong> : usage privé, sans revente ni exploitation commerciale.</li>
                <li><strong>Exclusive</strong> : droits exclusifs ; le média est retiré du catalogue après l&apos;achat.</li>
              </ul>
              <p>Dans tous les cas, il est interdit de revendre ou de redistribuer le fichier tel quel, de le proposer sur une autre banque d&apos;images, ou de l&apos;utiliser de façon diffamatoire, trompeuse ou contraire à la loi gabonaise.</p>
            </>
          ),
        },
        {
          id: "abonnements", title: "Abonnements",
          body: (
            <p>Les abonnements Mensuel et Pro sont valables 30 jours à compter du paiement confirmé et ne se renouvellent pas automatiquement. Un nouveau paiement du même abonnement prolonge la période en cours de 30 jours.</p>
          ),
        },
        {
          id: "remboursement", title: "Remboursement",
          body: (
            <p>Un média est un contenu numérique fourni immédiatement : un achat n&apos;est pas remboursable une fois le média téléchargé. Si le fichier est défectueux ou ne correspond pas à sa description, contactez-nous à [adresse e-mail de contact] dans les [nombre] jours : nous le remplacerons ou vous rembourserons. [Politique à confirmer.]</p>
          ),
        },
        {
          id: "contributeurs", title: "Médias proposés par des contributeurs",
          body: (
            <p>Certains médias sont proposés par des photographes et vidéastes indépendants et portent leur nom. Chaque média est examiné par l&apos;équipe Pixia avant publication. Les règles propres aux contributeurs figurent dans la <Link href="/charte-contributeurs">charte des contributeurs</Link>.</p>
          ),
        },
        {
          id: "responsabilite", title: "Responsabilité",
          body: (
            <p>Nous faisons notre possible pour que Pixia soit disponible et que les médias soient conformes à leur description, sans pouvoir garantir une disponibilité continue. Nous ne sommes pas responsables de l&apos;usage que vous faites d&apos;un média en dehors de la licence achetée.</p>
          ),
        },
        {
          id: "donnees", title: "Données personnelles",
          body: <p>Le traitement de vos données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>.</p>,
        },
        {
          id: "droit", title: "Droit applicable et litiges",
          body: (
            <p>Ces conditions sont régies par le droit gabonais. En cas de différend, nous chercherons d&apos;abord une solution amiable ; à défaut, les tribunaux de Libreville seront compétents. Nous pouvons modifier ces conditions ; la version applicable est celle en ligne au moment de votre achat.</p>
          ),
        },
      ]}
    />
  );
}
