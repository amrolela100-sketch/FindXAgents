FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN pnpm --filter @workspace/api-server run build

FROM base AS runtime
WORKDIR /app
# We need node_modules for hoisted dependencies or unbundled externals (like pg, drizzle-orm)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["node", "./artifacts/api-server/dist/index.mjs"]
