FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Dummy URLs let `prisma generate` and `next build` run without a database.
# Pass the real DATABASE_URL and DIRECT_URL when you start the container.
ARG DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ARG DIRECT_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build
EXPOSE 41731
CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/seed-if-enabled.mjs && npm start"]
