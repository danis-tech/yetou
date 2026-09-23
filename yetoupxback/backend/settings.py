import environ
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

# DEBUG désactivé par défaut : il faut l'activer explicitement (DEBUG=True) en dev.
DEBUG = env("DEBUG", default=False, cast=bool)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY doit être défini dans .env en production.")
    SECRET_KEY = "django-insecure-dev-only-key-ne-pas-utiliser-en-production"

ALLOWED_HOSTS = env("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

# ─── Cloudflare R2 ───
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

AWS_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = env("R2_BUCKET_NAME")
AWS_S3_ENDPOINT_URL = f"https://{env('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com"
AWS_S3_REGION_NAME = "auto"
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = True
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600
# Domaine public R2 pour les aperçus catalogue (URLs non signées)
R2_PUBLIC_DOMAIN = env("R2_PUBLIC_DOMAIN", default="")

# ─── Applications ───
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",

    # Third-party
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "storages",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "dj_rest_auth",
    "dj_rest_auth.registration",

    # Local
    "users_app",
    "media_app",
    "contributors",
]

SITE_ID = 1

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# ─── Base de données ───
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
}

# ─── Custom User ───
AUTH_USER_MODEL = "users_app.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Libreville"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

# ─── MyPVit (docs.mypvit.pro) — Airtel Money, Moov Money, Visa/Mastercard ───
# Valeurs à récupérer sur mypvit.pro :
# - MYPVIT_ACCOUNT_CODE(_MOOV/_AIRTEL/_VISA_MASTERCARD) : comptes d'opération (menu Comptes)
# - MYPVIT_API_PASSWORD : mot de passe de l'API Renew Secret Key
# - MYPVIT_CODE_URL_* : « codes URL » de chaque API (menu APIs)
# - MYPVIT_CALLBACK_URL_CODE : code de l'URL de callback (menu Urls) pointant vers
#   https://<backend>/api/payments/webhook/mypvit/
# - MYPVIT_SUCCESS/FAILED_REDIRECTION_URL_CODE : URLs de redirection carte (menu Urls)
#   pointant vers https://<frontend>/paiement/retour?status=success|error
MYPVIT_BASE_URL = env("MYPVIT_BASE_URL", default="https://api.mypvit.pro/v2")
MYPVIT_ACCOUNT_CODE = env("MYPVIT_ACCOUNT_CODE", default="")
MYPVIT_ACCOUNT_CODE_MOOV = env("MYPVIT_ACCOUNT_CODE_MOOV", default="")
MYPVIT_ACCOUNT_CODE_AIRTEL = env("MYPVIT_ACCOUNT_CODE_AIRTEL", default="")
MYPVIT_ACCOUNT_CODE_VISA_MASTERCARD = env("MYPVIT_ACCOUNT_CODE_VISA_MASTERCARD", default="")
MYPVIT_API_PASSWORD = env("MYPVIT_API_PASSWORD", default="")
MYPVIT_CODE_URL_SECRET = env("MYPVIT_CODE_URL_SECRET", default="")
MYPVIT_CODE_URL_PAYMENT = env("MYPVIT_CODE_URL_PAYMENT", default="")
MYPVIT_CODE_URL_STATUS = env("MYPVIT_CODE_URL_STATUS", default="")
MYPVIT_CODE_URL_KYC = env("MYPVIT_CODE_URL_KYC", default="")
MYPVIT_CODE_URL_LINK = env("MYPVIT_CODE_URL_LINK", default="")
MYPVIT_CALLBACK_URL_CODE = env("MYPVIT_CALLBACK_URL_CODE", default="")
MYPVIT_SUCCESS_REDIRECTION_URL_CODE = env("MYPVIT_SUCCESS_REDIRECTION_URL_CODE", default="")
MYPVIT_FAILED_REDIRECTION_URL_CODE = env("MYPVIT_FAILED_REDIRECTION_URL_CODE", default="")
# IP/réseaux sortants de MyPVit (fournis par leur support), séparés par des
# virgules. Si défini, tout webhook venant d'une autre IP est rejeté.
MYPVIT_WEBHOOK_ALLOWED_IPS = [ip.strip() for ip in env("MYPVIT_WEBHOOK_ALLOWED_IPS", default="").split(",") if ip.strip()]
# True uniquement derrière un reverse proxy de confiance (nginx...) qui ajoute
# l'IP réelle du client dans X-Forwarded-For.
TRUST_X_FORWARDED_FOR = env("TRUST_X_FORWARDED_FOR", default=False, cast=bool)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── CORS ───
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS", default="http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = True

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# ─── Logging ───
# Sans cette config, les logger.info(...) de l'app (webhooks MyPVit...) sont
# silencieusement ignorés (seul le niveau WARNING+ remonte par défaut).
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "media_app": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "users_app": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# ─── REST Framework ───
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
    "DEFAULT_THROTTLE_RATES": {
        "payments": "10/min",
        "payment_status": "40/min",
        "contributions": "30/hour",
    },
}

# ─── Sécurité HTTP (production) ───
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS = "DENY"
    if TRUST_X_FORWARDED_FOR:
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # À activer une fois le site servi exclusivement en HTTPS.
    SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT", default=False, cast=bool)
    SECURE_HSTS_SECONDS = env("SECURE_HSTS_SECONDS", default=0, cast=int)

# ─── Simple JWT ───
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ─── Allauth / Google ───
# Credentials Google : uniquement via l'admin Django (Social applications)
# Ne pas définir "APP" ici — sinon conflit MultipleObjectsReturned avec la BDD
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "OAUTH_PKCE_ENABLED": True,
        "FETCH_USERINFO": True,
    }
}

SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
ACCOUNT_LOGOUT_ON_GET = True

ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "none"

# Email backend console (dev) - pas de SMTP
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
ACCOUNT_USER_MODEL_USERNAME_FIELD = None

# ─── dj-rest-auth ───
REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_HTTPONLY": False,
    "JWT_AUTH_COOKIE": "pixia-auth",
    "JWT_AUTH_REFRESH_COOKIE": "pixia-refresh",
    "JWT_AUTH_RETURN_EXPIRATION": True,
    "SESSION_LOGIN": False,
    "LOGIN_SERIALIZER": "users_app.serializers.CustomLoginSerializer",
    "REGISTER_SERIALIZER": "users_app.serializers.CustomRegisterSerializer",
}

REST_AUTH_TOKEN_MODEL = None
