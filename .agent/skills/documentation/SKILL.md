---
name: documentation
description: 撰寫技術文件，包含 API 文件、README 和架構文件
---

# Documentation Skill

撰寫 Light Keepers 技術文件。

## 文件類型

### 1. README.md

```markdown
# 專案名稱

簡短描述專案用途

## 快速開始

### 安裝
\`\`\`bash
npm install
\`\`\`

### 執行
\`\`\`bash
npm run dev
\`\`\`

## 功能列表

- 功能 1
- 功能 2

## 貢獻指南

PR 歡迎！請先閱讀 CONTRIBUTING.md

## 授權

MIT
```

### 2. API 文件（Swagger）

```typescript
// 使用裝飾器
@ApiTags('Users')
@ApiOperation({ summary: '取得使用者資料' })
@ApiResponse({ status: 200, description: '成功' })
@ApiResponse({ status: 401, description: '未授權' })
@Get(':id')
findOne(@Param('id') id: string) { ... }
```

### 3. 架構文件

```markdown
# 系統架構

## 概述

描述系統整體架構

## 元件圖

\`\`\`mermaid
graph TD
    A[Frontend] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Core Service]
    C --> E[(Database)]
    D --> E
\`\`\`

## 技術堆疊

| 層級 | 技術 |
|------|------|
| 前端 | Next.js |
| 後端 | NestJS |
| 資料庫 | PostgreSQL |
```

## 文件最佳實踐

### 1. 使用清晰的標題層級

```markdown
# 主標題 (H1) - 每個文件只有一個
## 章節 (H2)
### 小節 (H3)
```

### 2. 程式碼範例

- 提供可執行的範例
- 加入註解說明
- 使用正確的語法高亮

### 3. 保持更新

- 程式碼變更時同步更新文件
- 使用 CI 檢查文件完整性

## 自動生成文件

### Swagger UI

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Light Keepers API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

### TypeDoc（程式碼文件）

```bash
npx typedoc --entryPoints src --out docs
```
