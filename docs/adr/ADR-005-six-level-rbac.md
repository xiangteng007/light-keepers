# ADR-005: 六級 RBAC 權限模型

## 狀態
已採用

## 背景
災難應變場景需要清晰的指揮鏈和權限控制，遵循 FEMA ICS 標準。

## 決策
採用六級角色模型，對應 ICS 指揮結構。

### 角色等級

| Level | 角色 | ICS 對應 | 權限範圍 |
|-------|------|---------|---------|
| 0 | BLOCKED | - | 無權限 |
| 1 | CIVILIAN | 民眾 | 只讀 |
| 2 | VOLUNTEER | 志工 | 參與任務 |
| 3 | TEAM_LEAD | 小隊長 | 管理小組 |
| 4 | SECTION_CHIEF | 幕僚長 | 管理部門 |
| 5 | OFFICER | 指揮官 | 區域管理 |
| 6 | INCIDENT_COMMANDER | 總指揮 | 全域管理 |

### Guard 實作

```typescript
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequireRoles(RoleLevel.SECTION_CHIEF) // Level 4+
@Post()
async createMission() { ... }
```

## 實作
- `modules/auth/guards/roles.guard.ts`
- `modules/shared/guards/unified-roles.guard.ts`

## 後果
- ✅ 符合 ICS 標準
- ✅ 靈活的權限控制
- ✅ 向上相容（高等級包含低等級權限）
