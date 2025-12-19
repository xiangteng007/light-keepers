# Light Keepers 災防平台 - 後端 API
# Dockerfile for Cloud Run

FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package files
COPY package*.json ./

# 安裝所有依賴（包含 dev）以便構建
RUN npm ci

# 複製源碼
COPY . .

# 建置 TypeScript
RUN npm run build

# 生產階段
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# 只複製必要檔案
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 只安裝生產依賴
RUN npm ci --only=production

EXPOSE 8080

CMD ["node", "dist/main.js"]
