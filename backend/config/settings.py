import os
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only")
DEBUG = os.getenv("DEBUG", "True") == "True"
raw_allowed_hosts = os.getenv("ALLOWED_HOSTS", "*").split(",")
ALLOWED_HOSTS = [h.strip() for h in raw_allowed_hosts if h.strip()]
if "*" not in ALLOWED_HOSTS:
    for host in ["cliccot-testpilot-3.onrender.com", "cliccot-testpilot-backend.onrender.com", ".onrender.com", "localhost", "127.0.0.1"]:
        if host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(host)
INSTALLED_APPS = ["django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "rest_framework", "django_filters", "corsheaders", "core"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware"]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.template.context_processors.request",
    "django.contrib.auth.context_processors.auth", "django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "config.wsgi.application"

DEFAULT_RENDER_INTERNAL_DB = "postgresql://cliccot_testpilot_user:dSyB3sh9a58FzWI48QP99LRqv1ivxfpe@dpg-dbm0lmmc6qcc73fk2dc0-a/cliccot_testpilot"
DEFAULT_RENDER_EXTERNAL_DB = "postgresql://cliccot_testpilot_user:dSyB3sh9a58FzWI48QP99LRqv1ivxfpe@dpg-dbm0lmmc6qcc73fk2dc0-a.oregon-postgres.render.com/cliccot_testpilot"

is_on_render = os.getenv("RENDER") == "true" or os.getenv("RENDER_SERVICE_ID") is not None

database_url = os.getenv("DATABASE_URL")
if not database_url:
    if os.getenv("DB_HOST"):
        pass  # Uses explicit DB_HOST, DB_USER, etc.
    elif is_on_render:
        database_url = DEFAULT_RENDER_INTERNAL_DB
    elif os.getenv("DB_NAME") == "cliccot_testpilot":
        database_url = DEFAULT_RENDER_EXTERNAL_DB

if database_url:
    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip("/")
    db_user = parsed.username
    db_password = parsed.password
    db_host = parsed.hostname
    db_port = str(parsed.port or "5432")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": db_user,
            "PASSWORD": db_password,
            "HOST": db_host,
            "PORT": db_port,
        }
    }
    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", [None])[0] or os.getenv("DB_SSLMODE")
    if sslmode or (db_host and "render.com" in db_host):
        DATABASES["default"]["OPTIONS"] = {"sslmode": sslmode or "require"}
else:
    db_engine = os.getenv("DB_ENGINE", "django.db.backends.sqlite3" if not os.getenv("DB_NAME") or str(os.getenv("DB_NAME")).endswith(".sqlite3") else "django.db.backends.postgresql")
    if "sqlite" in db_engine:
        DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / (os.getenv("DB_NAME") or "db.sqlite3")}}
    else:
        db_host = os.getenv("DB_HOST", "localhost")
        DATABASES = {"default": {
            "ENGINE": db_engine,
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": db_host,
            "PORT": os.getenv("DB_PORT", "5432")
        }}
        db_sslmode = os.getenv("DB_SSLMODE")
        if db_sslmode or (db_host and "render.com" in db_host):
            DATABASES["default"]["OPTIONS"] = {"sslmode": db_sslmode or "require"}
AUTH_USER_MODEL = "core.User"
STATIC_URL = "static/"; STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"; MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ["*"]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://cliccot-testpilot-3.onrender.com,https://cliccot-testpilot-backend.onrender.com")
CORS_ALLOWED_ORIGINS = [orig.strip().rstrip("/") for orig in cors_env.split(",") if orig.strip()]
for orig in ["https://cliccot-testpilot-3.onrender.com", "https://cliccot-testpilot-backend.onrender.com"]:
    if orig not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(orig)

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.onrender\.com$",
    r"^http:\/\/localhost:[0-9]+$",
    r"^http:\/\/127\.0\.0\.1:[0-9]+$",
]

csrf_env = os.getenv("CSRF_TRUSTED_ORIGINS", "https://cliccot-testpilot-3.onrender.com,https://cliccot-testpilot-backend.onrender.com,https://*.onrender.com,http://localhost:5173,http://127.0.0.1:5173")
CSRF_TRUSTED_ORIGINS = [orig.strip().rstrip("/") for orig in csrf_env.split(",") if orig.strip()]
for orig in ["https://cliccot-testpilot-3.onrender.com", "https://cliccot-testpilot-backend.onrender.com"]:
    if orig not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(orig)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter", "rest_framework.filters.OrderingFilter"],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.CustomPagination", "PAGE_SIZE": 10,
}
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(minutes=60), "REFRESH_TOKEN_LIFETIME": timedelta(days=7)}
