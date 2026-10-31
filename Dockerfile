
FROM node:26-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@12.16.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm exec prisma generate

RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start"]
