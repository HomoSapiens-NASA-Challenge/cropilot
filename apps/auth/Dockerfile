# Build context: the repository root.
FROM node:24-slim

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth/package.json apps/auth/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @cropilot/auth

COPY apps/auth/src apps/auth/src

WORKDIR /repo/apps/auth
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["sh", "-c", "node src/migrate.ts && exec node src/index.ts"]
