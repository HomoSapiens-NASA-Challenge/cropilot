# Build context: the repository root.
FROM node:24-slim AS mcp-view
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/webapp/package.json apps/webapp/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @cropilot/webapp...
COPY apps/webapp apps/webapp
COPY packages/api packages/api
RUN pnpm --filter @cropilot/webapp build:mcp

FROM python:3.14-slim

# Bounded local audio decoding before paid voice transcription.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

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
COPY --from=mcp-view /repo/apps/backend/app/modules/mcp/ui app/modules/mcp/ui
COPY apps/backend/migrations migrations

USER nobody
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
