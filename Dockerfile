# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- deps
FROM node:22-alpine AS deps
WORKDIR /app
# sharp cần libc6-compat trên Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client sinh vào src/generated, phải chạy trước next build
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------- runtime
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration và seed KHÔNG chạy từ image này. Dùng stage `migrator` bên dưới:
#   docker compose --profile tools run --rm migrate
#   docker compose --profile tools run --rm seed

# UPLOAD_DIR được mount volume từ host, xem docker-compose.yml
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

# ---------------------------------------------------------------- migrator
# Stage riêng cho migration và seed: giữ nguyên node_modules đầy đủ và mã nguồn,
# nên tsx, prisma và sharp đều chạy được. Chỉ dùng thủ công, không chạy thường trực.
FROM builder AS migrator
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/uploads
CMD ["npx", "prisma", "migrate", "deploy"]
