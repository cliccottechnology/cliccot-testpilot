import os
import sys
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

# ====================================================================
# ENVIRONMENT-BASED DATABASE CONFIGURATION (Local vs Render)
# ====================================================================
DEFAULT_RENDER_INTERNAL_DB = "postgresql://cliccot_testpilot_user:dSyB3sh9a58FzWI48QP99LRqv1ivxfpe@dpg-dbm0lmmc6qcc73fk2dc0-a/cliccot_testpilot"
DEFAULT_RENDER_EXTERNAL_DB = "postgresql://cliccot_testpilot_user:dSyB3sh9a58FzWI48QP99LRqv1ivxfpe@dpg-dbm0lmmc6qcc73fk2dc0-a.oregon-postgres.render.com/cliccot_testpilot"
DEFAULT_LOCAL_DB = "postgresql://postgres:root@127.0.0.1:5432/cliccot_testflow"

is_on_render = (
    os.getenv("RENDER") is not None
    or os.getenv("RENDER_SERVICE_ID") is not None
    or os.getenv("RENDER_EXTERNAL_URL") is not None
    or os.getenv("PORT") is not None
)

# Active environment switch: 'local' (development) | 'render' (cloud testing)
env_flag = os.getenv("ACTIVE_ENV") or os.getenv("ENVIRONMENT")

# Read raw environment variables from .env
raw_database_url = os.getenv("DATABASE_URL")
raw_db_host = os.getenv("DB_HOST")
raw_db_name = os.getenv("DB_NAME")
raw_db_user = os.getenv("DB_USER")
raw_db_password = os.getenv("DB_PASSWORD")
raw_db_port = os.getenv("DB_PORT", "5432")
raw_db_engine = os.getenv("DB_ENGINE")
raw_db_sslmode = os.getenv("DB_SSLMODE")

# Determine active_env
if env_flag:
    active_env = env_flag.lower().strip()
elif is_on_render:
    active_env = "render"
elif (raw_db_host and "render.com" in raw_db_host) or (raw_database_url and "render.com" in raw_database_url) or raw_db_name == "cliccot_testpilot":
    active_env = "render"
else:
    active_env = "local"

# Database resolution
database_url = None
db_engine = raw_db_engine
db_name = raw_db_name
db_user = raw_db_user
db_password = raw_db_password
db_host = raw_db_host
db_port = raw_db_port
db_sslmode = raw_db_sslmode

if active_env in ["render", "production", "prod", "test"]:
    if raw_database_url and ("render.com" in raw_database_url or "dpg-" in raw_database_url):
        database_url = raw_database_url
    elif raw_db_host and ("render.com" in raw_db_host or "dpg-" in raw_db_host):
        database_url = None
        db_sslmode = raw_db_sslmode or "require"
    else:
        database_url = DEFAULT_RENDER_INTERNAL_DB if is_on_render else DEFAULT_RENDER_EXTERNAL_DB
        db_sslmode = "require"

elif active_env in ["local", "development", "dev"]:
    if os.getenv("USE_SQLITE") == "True":
        db_engine = "django.db.backends.sqlite3"
        db_name = "db.sqlite3"
        database_url = None
    elif raw_database_url and "render.com" not in raw_database_url and "dpg-" not in raw_database_url:
        database_url = raw_database_url
    elif raw_db_host and "render.com" not in raw_db_host and "dpg-" not in raw_db_host:
        database_url = None
        db_sslmode = raw_db_sslmode or "disable"
    else:
        database_url = DEFAULT_LOCAL_DB
        db_sslmode = "disable"

if database_url:
    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip("/")
    db_user = parsed.username
    db_password = parsed.password
    db_host = parsed.hostname
    db_port = str(parsed.port or "5432")
    db_engine = "django.db.backends.postgresql"
    query = parse_qs(parsed.query)
    ssl_query = query.get("sslmode", [None])[0]
    if ssl_query:
        db_sslmode = ssl_query
    elif not db_sslmode and db_host and "render.com" in db_host:
        db_sslmode = "require"

if not db_engine:
    if os.getenv("USE_SQLITE") == "True" or (db_name and str(db_name).endswith(".sqlite3")):
        db_engine = "django.db.backends.sqlite3"
    else:
        db_engine = "django.db.backends.postgresql"

if "sqlite" in db_engine:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / (str(db_name) if db_name else "db.sqlite3"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name or ("cliccot_testflow" if active_env == "local" else "cliccot_testpilot"),
            "USER": db_user or ("postgres" if active_env == "local" else "cliccot_testpilot_user"),
            "PASSWORD": db_password or ("root" if active_env == "local" else "dSyB3sh9a58FzWI48QP99LRqv1ivxfpe"),
            "HOST": db_host or ("127.0.0.1" if active_env == "local" else "dpg-dbm0lmmc6qcc73fk2dc0-a.oregon-postgres.render.com"),
            "PORT": str(db_port or "5432"),
        }
    }
    if db_sslmode and db_sslmode != "disable":
        DATABASES["default"]["OPTIONS"] = {"sslmode": db_sslmode}

if any(cmd in sys.argv for cmd in ["runserver", "shell", "check"]):
    curr_db = DATABASES["default"]
    print(f"--> [BugFlow Environment: {active_env.upper()}] Connected to: {curr_db.get('NAME')} on {curr_db.get('HOST') or 'localhost'}")

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
