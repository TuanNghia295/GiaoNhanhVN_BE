##################
# BUILD BASE IMAGE
##################

FROM node:22-alpine AS base

# Install and use pnpm
RUN npm install -g pnpm

#############################
# BUILD FOR LOCAL DEVELOPMENT
#############################

FROM base AS development
WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install

# Bundle app source
COPY . .

#####################
# BUILD BUILDER IMAGE
#####################

FROM base AS builder
WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/src ./src
COPY --from=development /app/tsconfig.json ./tsconfig.json
COPY --from=development /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=development /app/nest-cli.json ./nest-cli.json

RUN pnpm build

# Re-install only production dependencies
ENV NODE_ENV=production
RUN pnpm prune --prod
RUN pnpm install --prod

######################
# BUILD FOR PRODUCTION
######################

FROM node:22-alpine AS production
WORKDIR /app

# Copy production files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
# Copy folder assets vào uploads
COPY --from=builder /app/assets ./uploads
# Copy ảnh từ builder hoặc context
# Start the server
CMD ["node", "dist/main.js"]
