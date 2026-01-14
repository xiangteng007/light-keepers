---
name: git-workflow
description: Git 分支管理、提交規範和 PR 流程
---

# Git Workflow Skill

Light Keepers 專案的 Git 工作流程。

## 分支命名

| 類型 | 格式 | 範例 |
|------|------|------|
| 功能 | `feature/<描述>` | `feature/user-auth` |
| 修復 | `fix/<issue-id>-<描述>` | `fix/123-login-error` |
| 熱修 | `hotfix/<描述>` | `hotfix/security-patch` |
| 重構 | `refactor/<描述>` | `refactor/auth-module` |

## 提交訊息規範

使用 Conventional Commits：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- `feat`: 新功能
- `fix`: 修復 bug
- `docs`: 文件變更
- `style`: 格式變更（不影響程式碼）
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 建置/工具變更

### 範例

```bash
git commit -m "feat(auth): add password reset endpoint"
git commit -m "fix(security): add @Public decorator to reset-password"
git commit -m "docs(audit): update walkthrough with strict PASS"
```

## PR 流程

### 1. 創建分支

```bash
git checkout -b feature/my-feature
```

### 2. 開發並提交

```bash
git add .
git commit -m "feat(module): add new feature"
```

### 3. 推送並創建 PR

```bash
git push -u origin feature/my-feature
```

### 4. PR 檢查清單

- [ ] 程式碼通過 lint
- [ ] 單元測試通過
- [ ] 審計管線通過 (`ci-gate-check.ps1`)
- [ ] 無未解決的 review comments
- [ ] 已更新相關文件

## 常用指令

```bash
# 查看狀態
git status

# 查看分支
git branch -a

# 切換分支
git checkout <branch>

# 拉取更新
git pull origin main

# 合併主分支
git merge main

# 解決衝突後
git add .
git commit -m "fix: resolve merge conflicts"
```
