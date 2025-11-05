# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Bring manifests needed for a web-only install (shared is a file: dep)
COPY packages/shared/package.json packages/shared/package.json
COPY web/package.json web/package.json

# Install *inside* the web workspace so node_modules lands in /app/web/node_modules
RUN npm install --prefix web

# Bring sources and build
COPY packages ./packages
COPY web ./web
RUN npm run --prefix web build

# Trim dev deps only in the web workspace
RUN npm prune --prefix web --omit=dev

# ---------- runtime ----------
FROM node:20-alpine
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app/web

# Copy the built workspace (includes its own node_modules + .next)
COPY --from=build /app/web ./

EXPOSE 3000
CMD ["npm","start","--prefix","/app/web"]
