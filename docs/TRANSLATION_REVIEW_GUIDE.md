# 🌏 翻譯品質審核指南
# Translation Quality Review Guide

> **建立日期**: 2026-02-03  
> **對應語言**: 13 種

---

## 📋 審核語言清單

| 代碼 | 語言 | 審核狀態 | 審核人 |
|:----:|------|:--------:|:------:|
| zh-TW | 繁體中文 | ✅ 原生 | - |
| zh-CN | 简体中文 | ⏳ 待審核 | |
| en | English | ✅ 原生 | - |
| ja | 日本語 | ⏳ 待審核 | |
| ko | 한국어 | ⏳ 待審核 | |
| vi | Tiếng Việt | ⏳ 待審核 | |
| th | ภาษาไทย | ⏳ 待審核 | |
| id | Bahasa Indonesia | ⏳ 待審核 | |
| ms | Bahasa Melayu | ⏳ 待審核 | |
| fil | Filipino | ⏳ 待審核 | |
| km | ភាសាខ្មែរ | ⏳ 待審核 | |
| my | မြန်မာ | ⏳ 待審核 | |
| lo | ພາສາລາວ | ⏳ 待審核 | |

---

## ✅ 審核重點

### 1. 專業術語一致性

以下救災專業術語需確保各語言翻譯正確：

| 中文 | 英文 | 說明 |
|------|------|------|
| 避難所 | Shelter | 臨時收容住所 |
| 檢傷分類 | Triage | START 分類法 |
| 現場指揮所 | Incident Command Post | ICS 術語 |
| 物資調度 | Resource Allocation | 後勤管理 |
| 搜救任務 | Search and Rescue (SAR) | 山域/水域/城搜 |
| 志工動員 | Volunteer Mobilization | 人力調度 |

### 2. 審核方法

1. **母語者審核**: 請該語言母語者審閱
2. **專業術語**: 確認災防專業術語符合當地用語
3. **一致性檢查**: 確保相同概念使用相同翻譯
4. **長度檢查**: UI 元素確保翻譯不會過長

### 3. 翻譯檔案位置

```
web-dashboard/src/i18n/locales/
├── zh-TW.json  ← 繁體中文 (基準)
├── zh-CN.json  ← 简体中文
├── en.json     ← English
├── ja.json     ← 日本語
├── ko.json     ← 한국어
├── vi.json     ← Tiếng Việt
├── th.json     ← ภาษาไทย
├── id.json     ← Bahasa Indonesia
├── ms.json     ← Bahasa Melayu
├── fil.json    ← Filipino
├── km.json     ← ភាសាខ្មែរ
├── my.json     ← မြန်မာ
└── lo.json     ← ພາສາລາວ
```

---

## 📝 回報格式

發現翻譯問題時，請使用以下格式回報：

```
語言: ja
鍵值: reports.type.flood
目前翻譯: 洪水
建議翻譯: 水害 / 浸水被害
理由: 日本較常用「水害」描述水災
```

---

## 🔄 更新流程

1. 審核人員回報問題
2. 開發人員更新 JSON 檔案
3. 部署後驗證顯示正確
4. 更新此文件審核狀態

---

**審核完成後，請將狀態更新為 ✅ 並填入審核人姓名。**
