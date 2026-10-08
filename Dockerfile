FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
COPY .env.example .env
ENV DATABASE_URL="file:/app/data/dev.db"
RUN mkdir -p /app/data \
  && npx prisma generate \
  && npx prisma migrate deploy \
  && npx tsx prisma/seed.ts \
  && npm run build
EXPOSE 41731
CMD ["npm", "start"]
