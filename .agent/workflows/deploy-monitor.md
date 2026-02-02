---
description: 監視 Cloud Run 部署狀態並修正錯誤
---

# 部署監視流程 (Deploy Monitor)

每次推送到 GitHub 後必須執行此流程，確保部署成功。

## 📋 必執行步驟

### 1. 推送代碼後
```bash
git push origin main
```

// turbo
### 2. 立即開啟瀏覽器監視 GitHub Actions
```
使用 browser_subagent 工具導航到:
https://github.com/xiangteng007/light-keepers/actions

查看並記錄:
- 最新的 workflow run 狀態
- 是否有任何失敗或排隊中的任務
- 部署進度 (queued → in_progress → success/failure)
```

// turbo
### 3. 等待部署完成
```
每 30 秒刷新頁面，直到:
- ✅ 所有 workflow 顯示綠色勾勾 (success)
- ❌ 或發現紅色叉叉 (failure)
```

### 4. 如果部署失敗
```
1. 點擊失敗的 workflow run
2. 查看錯誤日誌
3. 截圖記錄錯誤
4. 分析錯誤原因
5. 修正代碼並重新推送
6. 回到步驟 2 繼續監視
```

// turbo
### 5. 部署成功後驗證
```
驗證前端: 
curl -s https://lightkeepers.ngo | Select-String "LIGHTKEEPERS"

驗證後端:
Invoke-WebRequest -Uri "https://light-keepers-api-955234851806.asia-east1.run.app/api/v1/health" -UseBasicParsing
```

### 6. 回報結果
向用戶報告:
- ✅ 部署成功 + 驗證結果
- ❌ 部署失敗 + 錯誤原因 + 修正計畫

---

## 🔗 相關 URLs

| 服務 | URL |
|------|-----|
| GitHub Actions | https://github.com/xiangteng007/light-keepers/actions |
| Frontend (Vercel) | https://lightkeepers.ngo |
| Backend (Cloud Run) | https://light-keepers-api-955234851806.asia-east1.run.app |

## ⚠️ 重要提醒

1. **每次 `git push` 後必須執行此流程**
2. 不要假設部署會成功，一定要親眼驗證
3. 如果 browser_subagent 失敗，使用 curl/Invoke-WebRequest 替代方案
4. 記錄所有部署失敗的原因到 walkthrough.md
