# Baseline Counting Specification

> **Created**: 2026-01-13  
> **Purpose**: Define unambiguous counting rules for modules, pages, routes, and guards  
> **Authority**: This spec is the single source of truth for baseline statistics

---

## 🎯 Counting Philosophy

1. **Machine-Readable**: All counts MUST be reproducible via scripts in `/tools/audit/`
2. **Deterministic**: Same codebase + same script = same numbers
3. **Auditable**: JSON output includes both counts AND the list of items counted
4. **Version-Tracked**: Output files stored in `/docs/proof/logs/` with timestamps

---

## 📦 Backend Module Counting

### Definition

A **Backend Module** is a NestJS module file matching `*.module.ts` in the `backend/src` directory tree.

### Inclusion Rules

| Include | Exclusion | Notes |
|---------|-----------|-------|
| `backend/src/modules/**/*.module.ts` | ✅ | Feature modules |
| `backend/src/core/**/*.module.ts` | ✅ | Core domain modules |
| `backend/src/common/**/*.module.ts` | ✅ | Shared infrastructure |
| `backend/src/health/**/*.module.ts` | ✅ | Health checks |
| `backend/src/*.module.ts` (root) | ✅ | App/root modules |

### Exclusion Rules

| Exclude | Pattern | Reason |
|---------|---------|--------|
| Test modules | `**/*.spec.ts`, `**/test/**` | Test fixtures |
| Mock modules | `**/mock/**`, `*.mock.module.ts` | Development only |
| Deprecated | `**/deprecated/**` | Archived code |
| Node modules | `**/node_modules/**` | Dependencies |
| Dist/build | `**/dist/**` | Compiled output |

### Counting Script Output

```json
{
  "category": "backend_modules",
  "timestamp": "2026-01-13T01:30:00Z",
  "total": 77,
  "breakdown": {
    "src/modules": 55,
    "src/core": 17,
    "src/common": 3,
    "src/health": 1,
    "src/root": 1
  },
  "items": [
    "backend/src/app.module.ts",
    "backend/src/modules/volunteers/volunteers.module.ts",
    ...
  ]
}
```

---

## 📄 Frontend Page Counting

### Definition

A **Frontend Page** is a React component file in `web-dashboard/src/pages/` that represents a routable page view.

### Inclusion Rules

| Include | Pattern | Notes |
|---------|---------|-------|
| Page components | `**/pages/**/*.tsx` | All page files |
| Nested pages | `**/pages/**/index.tsx` | Index pages |

### Exclusion Rules

| Exclude | Pattern | Reason |
|---------|---------|--------|
| CSS files | `*.css` | Not components |
| Test files | `*.test.tsx`, `*.spec.tsx` | Tests |
| Story files | `*.stories.tsx` | Storybook |
| Components folder | `**/components/**` | Not pages |
| Deprecated pages | `*.deprecated.tsx` | Archived |
| Module CSS | `*.module.css` | Styles only |

### Counting Logic

```typescript
// Count .tsx files in pages/ directory
// Exclude: .css, .test.tsx, .spec.tsx, .stories.tsx, .deprecated.tsx, .module.css
// Each .tsx file = 1 page (including subdirectories like /geo/, /account/)
```

### Counting Script Output

```json
{
  "category": "frontend_pages",
  "timestamp": "2026-01-13T01:30:00Z",
  "total": 79,
  "breakdown": {
    "root": 45,
    "geo": 3,
    "account": 2,
    "emergency": 4,
    ...
  },
  "items": [
    "web-dashboard/src/pages/DashboardPage.tsx",
    "web-dashboard/src/pages/geo/TacticalMapPage.tsx",
    ...
  ]
}
```

---

## 🛤️ API Route Counting

### Definition

An **API Route** is a controller method decorated with HTTP method decorators.

### Inclusion Rules

| Decorator | HTTP Method | Counted |
|-----------|-------------|:-------:|
| `@Get()` | GET | ✅ |
| `@Post()` | POST | ✅ |
| `@Put()` | PUT | ✅ |
| `@Patch()` | PATCH | ✅ |
| `@Delete()` | DELETE | ✅ |
| `@All()` | ALL | ✅ |

### Exclusion Rules

| Exclude | Reason |
|---------|--------|
| Commented routes | Not active |
| In test files | Not production |
| WebSocket handlers (`@SubscribeMessage`) | Different protocol |

### Unique Route Definition

A unique route = `METHOD` + `FULL_PATH` (including controller prefix + method path)

---

## 🛡️ Guard Coverage Counting

### Definition

**Guard Coverage** measures the percentage of API routes protected by guards.

### Guard Types Tracked

| Guard Type | Decorator/Mechanism | Priority |
|------------|---------------------|:--------:|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | High |
| `RolesGuard` | `@UseGuards(RolesGuard)` | High |
| `RequireLevel` | `@RequireLevel(n)` | High |
| `CoreJwtGuard` | `@UseGuards(CoreJwtGuard)` | High |
| `Throttle` | `@Throttle()` | Medium |
| Global Guards | `APP_GUARD` in module | Applied globally |

### Coverage Categories

| Category | Definition | Target |
|----------|------------|:------:|
| **Authenticated** | Has JWT/Auth guard | 100% for non-public |
| **Authorized** | Has role/level guard | 100% for sensitive |
| **Rate-Limited** | Has throttle guard | 80% |
| **Public** | Explicitly marked `@Public()` | Documented |

### Coverage Formula

```
Coverage % = (Routes with Guard / Total Non-Public Routes) × 100
```

---

## 📁 Production vs Non-Production Code

### Production Code (Counted)

| Category | Patterns |
|----------|----------|
| Backend modules | `backend/src/**/*.module.ts` |
| Backend services | `backend/src/**/*.service.ts` |
| Backend controllers | `backend/src/**/*.controller.ts` |
| Backend entities | `backend/src/**/*.entity.ts` |
| Frontend pages | `web-dashboard/src/pages/**/*.tsx` |
| Frontend components | `web-dashboard/src/components/**/*.tsx` |

### Non-Production Code (Excluded from counts)

| Category | Patterns | Notes |
|----------|----------|-------|
| Tests | `*.spec.ts`, `*.test.ts(x)`, `**/test/**` | Quality assurance |
| Mocks | `**/mock/**`, `*.mock.ts` | Development |
| Tools | `**/tools/**`, `**/scripts/**` | Utilities |
| Storybook | `*.stories.tsx` | Documentation |
| Deprecated | `*.deprecated.*`, `**/deprecated/**` | Archived |
| Config | `*.config.ts`, `**/config/**` | Infrastructure |
| Migrations | `**/migrations/**` | DB scripts |

---

## 📊 Summary JSON Schema

All baseline scans output to `/docs/proof/logs/T0-count-summary.json`:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-01-13T01:30:00Z",
  "generated_by": "scan-baseline.ts",
  "spec_version": "baseline-counting-spec.md@v1",
  "counts": {
    "backend_modules": {
      "total": 77,
      "breakdown": { ... },
      "list_file": "T0-modules-list.txt"
    },
    "frontend_pages": {
      "total": 79,
      "breakdown": { ... },
      "list_file": "T0-pages-list.txt"
    },
    "api_routes": {
      "total": 0,
      "note": "Generated by scan-routes-guards.ts"
    }
  },
  "exclusions_applied": [
    "test/**",
    "*.spec.ts",
    "mock/**",
    "deprecated/**"
  ]
}
```

---

## 🔄 Re-Running Baseline

```powershell
# Generate fresh baseline
npx ts-node tools/audit/scan-baseline.ts

# Verify consistency
# The output should match the committed T0-count-summary.json
# if no code changes have been made
```

---

## 📌 Exceptions Registry

If any files require special handling, document here:

| File/Pattern | Reason | Handling |
|--------------|--------|----------|
| `health-only.module.ts` | Minimal bootstrap | Count as module |
| `*.deprecated.tsx` | Archived but in repo | Exclude from counts |

---

## ✅ Audit Verification

This spec enables third-party verification by:

1. **Cloning repo** → Same files available
2. **Running script** → Deterministic output
3. **Comparing JSON** → Exact match expected
4. **Checking list files** → Item-by-item verification possible

---

**Last Updated**: 2026-01-13  
**Spec Version**: 1.0.0
