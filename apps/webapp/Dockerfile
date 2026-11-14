# Build context: the repository root.
FROM node:24-slim AS build

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/webapp/package.json apps/webapp/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @cropilot/webapp...

COPY apps/webapp apps/webapp
COPY packages/api packages/api
RUN pnpm --filter @cropilot/webapp build

FROM nginx:1.30-alpine
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/webapp/dist /usr/share/nginx/html
