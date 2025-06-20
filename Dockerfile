# Stage 1: Build
FROM node:22-alpine AS builder

# 1. Enable Corepack và cài đặt PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 2. Copy lock file trước để tận dụng Docker cache
COPY pnpm-lock.yaml ./

# 3. Copy package.json và install dependencies
COPY package.json .
RUN pnpm install --frozen-lockfile

# 4. Copy toàn bộ source code và build
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine AS runner

# 1. Cài đặt PNPM cho production
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 2. Chỉ copy những gì cần thiết
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 3. Cài đặt môi trường
ENV NODE_ENV production
ENV PORT 3000

# 4. Khởi chạy ứng dụng
EXPOSE 3000
CMD ["pnpm", "start"]
