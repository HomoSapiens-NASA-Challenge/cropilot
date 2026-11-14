import os

# Settings are read at import time, so the test environment is set before `app` loads.
os.environ.update(
    DATABASE_URL="postgresql://test:test@localhost:5432/test",
    BETTER_AUTH_URL="http://auth.test",
    AUTH_JWKS_URL="http://auth.test/api/auth/jwks",
)
