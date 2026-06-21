# yétou — Médias aériens HD & 4K · Gabon

Plateforme de vente de photos et vidéos aériennes capturées par drone professionnel au Gabon. Développée par **Best Aero Drone · Libreville**.

## Stack technique

- **Framework** : [Next.js 16](https://nextjs.org) (App Router)
- **Langage** : TypeScript
- **UI** : React 19 + Tailwind CSS v4
- **Icônes** : Tabler Icons, Font Awesome
- **Polices** : Inter, Sora (Google Fonts)
- **Paiement** : SingPay (Airtel Money, Moov Money)

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

```env
SINGPAY_BASE_URL=https://gateway.singpay.ga
SINGPAY_CLIENT_ID=votre_client_id
SINGPAY_CLIENT_SECRET=votre_client_secret
SINGPAY_WALLET_ID=votre_wallet_id
```

Si les variables sont absentes, l'API tourne en **mode simulation** (pas d'appel réel à SingPay).

## Intégration SingPay

### Endpoints

| Méthode | Endpoint |
|---------|----------|
| Airtel Money | `POST /v1/74/paiement` |
| Moov Money | `POST /v1/62/paiement` |
| Transfert (retrait) | `POST /v1/transfer` |
| Statut transaction | `GET /v1/transaction/api/status/{id}` |

### Flux de paiement

```
1. Client choisit un média → Acheter
2. Sélectionne Airtel Money ou Moov Money
3. Entre son numéro de téléphone
4. POST /api/paiement → SingPay (USSD Push)
5. Client valide sur son mobile
6. Fonds transférés vers le wallet SingPay
```

### Prérequis SingPay

- Portefeuille SingPay **validé** (statut `active`, pas `pending`)
- Numéro marchand Airtel Money et/ou Moov Money configuré
- Support : [support@singpay.ga](mailto:support@singpay.ga)

## Structure du projet

```
yetoupx/
├── .env.local              # Variables sensibles (ignoré par git)
├── .env.example            # Template des variables d'env
├── src/
│   ├── app/
│   │   ├── page.tsx        # Page principale (catalogue, tarifs, modales)
│   │   ├── layout.tsx      # Layout racine + métadonnées
│   │   ├── globals.css     # Styles globaux
│   │   ├── data.ts         # Données mock (photos, vidéos)
│   │   └── api/
│   │       └── paiement/
│   │           └── route.ts # Endpoint API SingPay
│   └── logo/               # Logos partenaires
│       ├── airtel.png
│       ├── moov.png
│       └── google.jpg
├── public/
│   ├── visa.svg            # Logo Visa
│   └── mastercard.svg      # Logo Mastercard
└── package.json
```

## Fonctionnalités

- Catalogue photos (grille masonry) et vidéos (grille responsive)
- Filtres par catégorie, résolution, durée
- Recherche instantanée
- Lightbox photo avec watermark
- Prévisualisation vidéo avec verrouillage téléchargement
- Modale d'achat avec choix du moyen de paiement
- Section tarifs (unité, mensuel, professionnel)
- Authentification (email + Google)
- Animations d'entrée (stagger fadeUp)
- Design responsive (mobile, tablette, desktop)

## Scripts

```bash
npm run dev      # Serveur de développement
npm run build    # Build production
npm run start    # Démarrage production
npm run lint     # Linter
```

## Déploiement

Déployable sur [Vercel](https://vercel.com), [Netlify](https://netlify.com) ou tout hébergeur Node.js. Ne pas oublier de configurer les variables d'environnement sur la plateforme de déploiement.

---

© 2026 Best Aero Drone · Tous droits réservés · Gabon
