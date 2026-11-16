import os

# Settings are read at import time, so the test environment is set before `app` loads.
os.environ.update(
    DATABASE_URL="postgresql://test:test@localhost:5432/test",
    PUBLIC_URL="http://app.test",
)
