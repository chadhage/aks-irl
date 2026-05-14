# Multi-stage, distroless final image. Build args expose VERSION at runtime.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

FROM gcr.io/distroless/nodejs20-debian12 AS runtime
ARG APP_VERSION=v1
ENV APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
USER 1000
EXPOSE 8080
CMD ["src/server.js"]
