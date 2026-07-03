import environ
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-b01vz_l!97axu*afie1(=x6un%3*@e!060_4g8!m-))jd!j6=!")

DEBUG = env("DEBUG", default=True, cast=bool)

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
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 6}},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Libreville"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

INTERNAL_API_SECRET = env("INTERNAL_API_SECRET", default="yetou-internal-secret-change-me")

# Secret pour vérifier les webhooks SingPay (HMAC-SHA256)
# À récupérer dans le dashboard SingPay et à définir dans .env
SINGPAY_WEBHOOK_SECRET = env("SINGPAY_WEBHOOK_SECRET", default="")

# FedaPay — carte Visa/Mastercard (optionnel, désactivé si clé vide)
FEDAPAY_SECRET_KEY = env("FEDAPAY_SECRET_KEY", default="")
FEDAPAY_ENVIRONMENT = env("FEDAPAY_ENVIRONMENT", default="sandbox")
FEDAPAY_CURRENCY = env("FEDAPAY_CURRENCY", default="XOF")
FEDAPAY_CHECKOUT_MODE = env("FEDAPAY_CHECKOUT_MODE", default="card")
FCFA_PER_USD = env("FCFA_PER_USD", default=650, cast=float)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── CORS ───
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS", default="http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = True

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

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
}

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
    "JWT_AUTH_COOKIE": "yetou-auth",
    "JWT_AUTH_REFRESH_COOKIE": "yetou-refresh",
    "JWT_AUTH_RETURN_EXPIRATION": True,
    "SESSION_LOGIN": False,
    "LOGIN_SERIALIZER": "users_app.serializers.CustomLoginSerializer",
    "REGISTER_SERIALIZER": "users_app.serializers.CustomRegisterSerializer",
}

REST_AUTH_TOKEN_MODEL = None
