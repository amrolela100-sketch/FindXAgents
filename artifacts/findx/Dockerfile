FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
# In Vite we need the VITE_API_URL during build or runtime? Usually runtime can be tricky,
# but for Vite it's injected at build time. We will inject it via docker-compose build args or env.
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN pnpm --filter @workspace/findx run build

FROM nginx:alpine AS runtime
COPY --from=build /app/artifacts/findx/dist /usr/share/nginx/html
COPY artifacts/findx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
