# Build context: the repository root.
FROM python:3.14-slim

COPY --from=astral/uv:0.13 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"
WORKDIR /app

COPY apps/backend/pyproject.toml apps/backend/uv.lock apps/backend/.python-version ./
# Path dependency of the lock file: the vendored rotation simulator and its parameter tables.
COPY apps/backend/vendor vendor
RUN uv sync --locked --no-dev

COPY apps/backend/app app
COPY apps/backend/migrations migrations

USER nobody
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
