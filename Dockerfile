FROM node:24-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/game/package.json packages/game/package.json
COPY packages/protocol/package.json packages/protocol/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY apps apps
COPY packages packages

RUN pnpm build
RUN pnpm --filter @fortune/server deploy --prod --legacy /prod/server

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app

COPY --from=build /prod/server apps/server
COPY --from=build /workspace/apps/web/dist apps/web/dist

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health >/dev/null || exit 1

CMD ["node", "apps/server/dist/index.js"]
