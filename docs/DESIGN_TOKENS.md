# 🎨 Light Keepers 設計代幣

## 色彩系統

### 主色調 (Tactical Dark Theme)

```css
:root {
  /* Primary */
  --color-primary-50: #fdf8f6;
  --color-primary-100: #f2e8e5;
  --color-primary-500: #8b5a3c;
  --color-primary-600: #7c4f34;
  --color-primary-700: #6b4329;
  
  /* Accent (Gold) */
  --color-accent-400: #fbbf24;
  --color-accent-500: #f59e0b;
  --color-accent-600: #d97706;
  
  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Neutral */
  --color-gray-50: #fafafa;
  --color-gray-100: #f4f4f5;
  --color-gray-800: #27272a;
  --color-gray-900: #18181b;
}
```

### 淺色主題 (Humanitarian Light)

```css
[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
}
```

---

## 字體系統

```css
:root {
  /* Font Family */
  --font-sans: 'Inter', 'Noto Sans TC', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Font Size */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  
  /* Font Weight */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Height */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

---

## 間距系統

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

---

## 圓角 & 陰影

```css
:root {
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
}
```

---

## 動畫

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
  
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}
```

---

## 斷點

```css
/* Breakpoints */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

---

## 元件狀態矩陣

| 狀態 | 背景 | 文字 | 邊框 |
|------|------|------|------|
| Default | gray-50 | gray-900 | gray-200 |
| Hover | gray-100 | gray-900 | gray-300 |
| Active | primary-100 | primary-700 | primary-300 |
| Disabled | gray-100 | gray-400 | gray-200 |
| Error | error/10 | error | error |
| Success | success/10 | success | success |
