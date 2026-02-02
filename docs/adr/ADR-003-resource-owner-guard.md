# ADR-003: 資源擁有權驗證 (IDOR 防護)

## 狀態
已採用

## 背景
防止 Insecure Direct Object Reference (IDOR) 攻擊，確保用戶只能存取自己的資源。

## 決策
採用可配置的 `ResourceOwnerGuard` 配合 Decorator 模式。

### 使用方式

```typescript
@UseGuards(CoreJwtGuard, ResourceOwnerGuard)
@ResourceOwner({ 
    entity: 'Report', 
    ownerField: 'reporterId', 
    idParam: 'id',
    bypassLevel: 5 // OFFICER 以上可存取所有
})
@Get(':id')
async findOne(@Param('id') id: string) { ... }
```

### 配置選項

| 選項 | 說明 | 預設值 |
|------|------|--------|
| entity | TypeORM Entity 名稱 | 必填 |
| ownerField | 擁有者 ID 欄位 | 必填 |
| idParam | 路由參數名稱 | 'id' |
| bypassLevel | 可跳過檢查的角色等級 | 5 (OFFICER) |

## 實作
- `modules/shared/guards/resource-owner.guard.ts`

## 後果
- ✅ 宣告式 IDOR 防護
- ✅ 支援角色等級跳過
- ✅ 自動查詢資源驗證擁有權
