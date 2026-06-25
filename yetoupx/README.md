# yétou — Médias aériens HD & 4K · Gabon

Plateforme de vente de photos et vidéos aériennes capturées par drone professionnel.
Développée par **Best Aero Drone · Libreville, Gabon**.

## Architecture

```
yetou/
├── yetoupx/         → Frontend Next.js 16 + React 19
└── yetoupxback/     → Backend Django 6 + DRF + PostgreSQL
```

## Stack

| Frontend | Backend |
|---|---|
| Next.js 16 (App Router) | Django 6 + Django REST Framework |
| React 19 + TypeScript | SimpleJWT (auth) |
| Tailwind CSS v4 | django-allauth (Google OAuth) |
| Tabler Icons | Cloudflare R2 (stockage S3) |
| SingPay (paiement) | SingPay (paiement) |

## Démarrage

### Backend (Django)

```bash
cd yetoupxback
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
# → http://localhost:8000
```

### Frontend (Next.js)

```bash
cd yetoupx
npm install
npm run dev
# → http://localhost:3000
```

## Variables d'environnement

### Backend (`yetoupxback/.env`)

```env
DJANGO_SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

DB_NAME=yetou
DB_USER=postgres
DB_PASSWORD=...
DB_HOST=localhost
DB_PORT=5432

R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=monprojet-media-yetou
CF_ACCOUNT_ID=...
R2_PUBLIC_DOMAIN=pub-xxx.r2.dev

GOOGLE_ID_CLIENT=...
GOOGLE_SECRET_CLIENT=...
```

### Frontend (`yetoupx/.env.local`)

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
SINGPAY_BASE_URL=...
SINGPAY_CLIENT_ID=...
SINGPAY_CLIENT_SECRET=...
SINGPAY_WALLET_ID=...
```

## API

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login/` | Connexion email/mdp |
| `POST` | `/api/auth/register/` | Inscription |
| `POST` | `/api/auth/token/refresh/` | Rafraîchir JWT |
| `GET/PATCH` | `/api/users/profile/` | Profil |
| `GET` | `/api/media/` | Liste médias |
| `GET` | `/api/media/{id}/` | Détail média |
| `GET/POST` | `/api/purchases/` | Achats |
| `POST` | `/api/purchases/{id}/download/` | Télécharger |

## Scripts

```bash
# Frontend
npm run dev      # Serveur dev
npm run build    # Build production
npm run test     # Tests Jest

# Backend
python manage.py runserver     # Serveur dev
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

## Cloudflare R2

Les fichiers sont stockés sur Cloudflare R2 dans le bucket `monprojet-media-yetou` :
- `photo/` pour les images
- `video/` pour les vidéos

Configuration CORS requise sur le bucket pour autoriser le frontend.

## Licence

© 2026 Best Aero Drone · Tous droits réservés · Gabon
