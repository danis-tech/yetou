import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité · Pixia" };

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="[date de mise en ligne]"
      intro={
        <p>
          Cette page explique quelles données Pixia collecte, pourquoi, avec qui elles sont partagées et comment
          exercer vos droits. Le responsable du traitement est Agenxia, [adresse], Libreville, Gabon ([adresse e-mail de contact]).
        </p>
      }
      sections={[
        {
          id: "donnees", title: "Les données que nous collectons",
          body: (
            <ul>
              <li><strong>Votre compte</strong> : nom, adresse e-mail, mot de passe (enregistré chiffré, jamais lisible), date d&apos;acceptation des conditions. Avec Google : nom et e-mail transmis par Google.</li>
              <li><strong>Vos achats</strong> : médias achetés, montants, dates, nombre de téléchargements, abonnement.</li>
              <li><strong>Vos paiements</strong> : numéro de téléphone saisi pour le paiement, moyen de paiement, référence et statut de la transaction. Nous ne recevons ni votre code PIN ni votre numéro de carte.</li>
              <li><strong>Si vous êtes contributeur</strong> : nom affiché, présentation, numéro Mobile Money de versement, médias envoyés, gains, demandes de retrait et preuves de paiement.</li>
              <li><strong>Votre activité</strong> : médias aimés et notifications.</li>
            </ul>
          ),
        },
        {
          id: "finalites", title: "Pourquoi nous les utilisons",
          body: (
            <ul>
              <li>Créer et sécuriser votre compte.</li>
              <li>Traiter vos paiements et vous donner accès aux médias achetés.</li>
              <li>Rémunérer les contributeurs et leur verser leurs gains.</li>
              <li>Vous informer de l&apos;état de vos achats, envois et retraits.</li>
              <li>Prévenir la fraude et respecter nos obligations comptables.</li>
            </ul>
          ),
        },
        {
          id: "partage", title: "Avec qui nous les partageons",
          body: (
            <>
              <p>Nous ne vendons pas vos données. Elles sont transmises uniquement à :</p>
              <ul>
                <li><strong>MyPVit</strong>, notre prestataire de paiement, et les opérateurs Airtel Money et Moov Money, pour exécuter vos paiements et les versements aux contributeurs ;</li>
                <li><strong>Cloudflare</strong>, qui stocke les fichiers des médias et des preuves de paiement ;</li>
                <li><strong>Google</strong>, si vous choisissez de vous connecter avec votre compte Google ;</li>
                <li>[hébergeur du site et de la base de données, pays] ;</li>
                <li>les autorités, lorsque la loi l&apos;exige.</li>
              </ul>
              <p>Certains de ces prestataires peuvent traiter les données hors du Gabon. [Préciser les garanties applicables.]</p>
            </>
          ),
        },
        {
          id: "conservation", title: "Combien de temps nous les gardons",
          body: (
            <p>Les données de compte sont conservées tant que le compte est actif, puis [durée] après sa suppression. Les données de paiement et de versement sont conservées [durée légale comptable] pour nos obligations comptables. [Durées à confirmer.]</p>
          ),
        },
        {
          id: "stockage-local", title: "Données enregistrées dans votre navigateur",
          body: (
            <p>Pixia enregistre dans votre navigateur (stockage local) vos jetons de connexion, pour vous garder connecté, et le paiement par carte en cours. Nous n&apos;utilisons pas de cookies publicitaires ni d&apos;outils de suivi tiers. [À mettre à jour si vous ajoutez un outil de mesure d&apos;audience.]</p>
          ),
        },
        {
          id: "securite", title: "Sécurité",
          body: (
            <p>Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme chiffrée et les liens de téléchargement et de preuve de paiement sont temporaires et réservés à leur destinataire.</p>
          ),
        },
        {
          id: "droits", title: "Vos droits",
          body: (
            <p>Conformément à la loi gabonaise n° 001/2011 relative à la protection des données à caractère personnel, vous pouvez accéder à vos données, les faire rectifier ou supprimer, et vous opposer à leur traitement, en écrivant à [adresse e-mail de contact]. Vous pouvez aussi saisir la Commission nationale pour la protection des données à caractère personnel (CNPDCP). [Références à faire vérifier.]</p>
          ),
        },
        {
          id: "modifications", title: "Modifications",
          body: <p>Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en haut de la page.</p>,
        },
      ]}
    />
  );
}
