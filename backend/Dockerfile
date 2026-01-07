# Light Keepers 災防平台 - 後端 API
# Dockerfile for Cloud Run
# Build optimization: v2 - Kaniko cache enabled
#
# 本機驗證指令:
#   docker build -t light-keepers-api:test ./backend
#   docker run -e PORT=8080 -e NODE_ENV=production -p 8080:8080 light-keepers-api:test
#   curl http://localhost:8080/api/v1/health
#   curl http://localhost:8080/api/v1/health/live
#   curl http://localhost:8080/api/v1/health/ready

FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package files
COPY package*.json ./

# 使用 npm ci 比 npm install 更快更可靠（嚴格遵循 package-lock.json）
RUN npm ci --legacy-peer-deps

# 複製源碼
COPY . .

# 建置 TypeScript
RUN npm run build

# 生產階段
FROM node:20-alpine AS runner

WORKDIR /app

# Cloud Run 標準環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 只複製必要檔案
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 只安裝生產依賴，並清理 npm cache 減少 image 大小
RUN npm ci --legacy-peer-deps --omit=dev && \
    npm cache clean --force

# Cloud Run HEALTHCHECK - 確保容器啟動後可響應
# 注意：Cloud Run 使用 HTTP startup/liveness probe，但本地 Docker 使用此 HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/v1/health/live || exit 1

EXPOSE 8080

# 直接執行 Node.js - 不使用 npm start 減少一層 process
CMD ["node", "dist/src/main.js"]

