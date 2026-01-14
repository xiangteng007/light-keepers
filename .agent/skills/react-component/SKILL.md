---
name: react-component
description: 創建 React/Next.js 組件，遵循專案設計系統和最佳實踐
---

# React Component Skill

創建 Light Keepers 前端組件。

## 組件結構

```
frontend/src/components/<ComponentName>/
├── <ComponentName>.tsx
├── <ComponentName>.css
├── <ComponentName>.test.tsx (選填)
└── index.ts
```

## 組件模板

### 函數組件

```tsx
import React from 'react';
import './ComponentName.css';

interface ComponentNameProps {
  title: string;
  onClick?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  onClick,
}) => {
  return (
    <div className="component-name" onClick={onClick}>
      <h2>{title}</h2>
    </div>
  );
};

export default ComponentName;
```

### 帶狀態組件

```tsx
import React, { useState, useEffect } from 'react';

export const StatefulComponent: React.FC = () => {
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  return <div>{/* render data */}</div>;
};
```

## 樣式規範

### CSS 變數（從 index.css）

```css
.component-name {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}
```

### 響應式設計

```css
@media (max-width: 768px) {
  .component-name {
    padding: var(--spacing-sm);
  }
}
```

## Barrel Export

```typescript
// index.ts
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';
```

## 最佳實踐

1. **Props 介面**: 明確定義 TypeScript 介面
2. **預設值**: 使用解構賦值設定預設值
3. **Memo**: 昂貴組件使用 `React.memo()`
4. **錯誤邊界**: 使用 ErrorBoundary 包裹
5. **無障礙**: 加入適當的 ARIA 屬性
