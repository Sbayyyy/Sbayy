# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Build argument for Next.js public env var
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_API_PROXY_TARGET
ENV NEXT_PUBLIC_API_PROXY_TARGET=${NEXT_PUBLIC_API_PROXY_TARGET}
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_SUPPORT_EMAIL=${NEXT_PUBLIC_SUPPORT_EMAIL}
ARG NEXT_PUBLIC_LOGO_URL
ENV NEXT_PUBLIC_LOGO_URL=${NEXT_PUBLIC_LOGO_URL}
ARG NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS
ENV NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS=${NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS}
ARG NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID}

# Bring manifests needed for a web-only install (shared is a file: dep)
COPY packages/shared/package.json packages/shared/package.json
COPY web/package.json web/package.json
COPY web/package-lock.json web/package-lock.json

# Install *inside* the web workspace so node_modules lands in /app/web/node_modules
RUN npm ci --prefix web

# Bring sources and build
COPY packages ./packages
COPY web ./web
RUN npm run --prefix web build

# ---------- runtime ----------
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Copy the standalone Next.js server plus static/public assets.
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./web/.next/static
COPY --from=build /app/web/public ./web/public

EXPOSE 3000
CMD ["node","web/server.js"]
