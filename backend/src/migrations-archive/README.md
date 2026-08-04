# migrations-archive — 前朝 migration 考古庫（不再執行）

D20（2026-08-03）定案 GCP 生產資料不可取回、本案轉「重新開站」後，
schema 唯一事實來源＝ `src/migrations/1785839846234-Baseline.ts`（由當前
entity 全集對空庫生成，內含本目錄 11 支的全部 schema 變更）。

本目錄僅供歷史考古，**不在 data-source.ts 的 migrations glob 內、永不執行**：
- 9 支原 `src/migrations/`（V30/StaffSecurity/FieldReports/AiQueue/
  RenameMissionEvents/DomainEventsOutbox/CivilDefense/DeletedAt/AirRaidShelters）
- 2 支原 `src/database/migrations/`（該目錄從未被 CLI 載入——data-source 只
  註冊 `src/migrations`，此為修正前的懸空目錄）：
  - AddVolunteerAccountRelation：schema 已含於 baseline
  - AssignOwnerRole：資料 migration（指定帳號賦 owner 角色）——重開站後由
    `SeedService.seedOwnerAccount()` 同邏輯接手，毋需重跑
