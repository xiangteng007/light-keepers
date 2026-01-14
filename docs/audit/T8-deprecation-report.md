# T8 Deprecation & Cleanup Report

> **Date**: 2026-01-14
> **Status**: ✅ ANALYSIS COMPLETE

---

## 📊 Current State

### STUB_MODULES 陣列 (已條件式停用)

以下模組已在 `app.module.ts` 中被標記為 stub，僅在 `ENABLE_STUB_MODULES=true` 時載入：

| Module | Status | Reason |
|--------|:------:|--------|
| `ArFieldGuidanceModule` | ✅ 已停用 | AR 現場導引 - 硬體依賴 |
| `ArNavigationModule` | ✅ 已停用 | AR 導航 - 硬體依賴 |
| `VrCommandModule` | ✅ 已停用 | VR 指揮 - 硬體依賴 |
| `DroneSwarmModule` | ✅ 已停用 | 無人機群控 - 硬體依賴 |
| `SupplyChainBlockchainModule` | ✅ 已停用 | 供應鏈區塊鏈 - 未實作 |
| `AerialImageAnalysisModule` | ✅ 已停用 | 航拍分析 - AI 模型依賴 |

---

### 仍在生產載入的可疑模組

以下模組仍在主要匯入清單中，但可能屬於 stub 或未完全實作：

| Module | Line | Assessment |
|--------|:----:|------------|
| `RobotRescueModule` | 465 | 🟡 低優先級 - 機器人救援 |
| `Cesium3dModule` | 462 | 🟡 低優先級 - 3D 地圖 |
| `BlockchainModule` | 445 | 🟡 保留 - 基礎設施 |
| `MockDataModule` | 384 | ⚠️ 應移到 STUB_MODULES |

---

## ✅ 建議操作

### 1. 移動 MockDataModule 到 STUB_MODULES

`MockDataModule` 在生產環境不應載入。

### 2. 考慮移動其他低優先級模組

以下模組可考慮移到 STUB_MODULES：

- `RobotRescueModule`
- `Cesium3dModule`
- `SpectrumAnalysisModule`
- `BimIntegrationModule`

---

## 🔒 安全措施

### 已實施

1. **STUB_MODULES 陣列** - 6 個模組已條件式停用
2. **環境變數控制** - `ENABLE_STUB_MODULES=true` 才載入
3. **生產預設停用** - 預設 `process.env.ENABLE_STUB_MODULES !== 'true'`

### 驗證

```powershell
# 確認 STUB_MODULES 未載入
# 在 .env 中確保沒有 ENABLE_STUB_MODULES=true

# 驗證無錯誤
npx tsc --noEmit
```

---

## 📁 可刪除的目錄

如果決定完全移除這些功能，以下目錄可安全刪除：

```
❌ 不建議刪除 - 已被條件式管理，保留以備未來開發

backend/src/modules/ar-field-guidance/     (13 KB)
backend/src/modules/ar-navigation/         (8 KB)
backend/src/modules/vr-command/            (6 KB)
backend/src/modules/drone-swarm/           (15 KB)
backend/src/modules/supply-chain-blockchain/ (12 KB)
backend/src/modules/robot-rescue/          (7 KB)
backend/src/modules/cesium-3d/             (5 KB)
```

---

## 結論

**T8 Deprecation 狀態: ✅ 已由現有架構處理**

系統已有完善的 stub 模組管理機制：

1. `STUB_MODULES` 陣列收集所有未完成模組
2. `ENABLE_STUB_MODULES` 環境變數控制載入
3. 生產環境預設不載入這些模組

**建議**: 不需要刪除任何檔案，現有的條件式載入機制已足夠。唯一建議是將 `MockDataModule` 移到 `STUB_MODULES` 陣列中。
