# 📋 Light Keepers E2E 流程文件

## Flow 1: 用戶登入流程

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant FB as Firebase Auth
    participant DB as PostgreSQL

    U->>FE: 輸入帳密
    FE->>FB: signInWithEmailAndPassword
    FB-->>FE: Firebase ID Token
    FE->>BE: POST /auth/login {idToken}
    BE->>FB: verifyIdToken
    FB-->>BE: decoded token
    BE->>DB: 查詢/建立 Account
    BE-->>FE: {accessToken, refreshToken}
    FE->>FE: 儲存 tokens
```

**SLO**: 登入完成 < 2s (P95)

---

## Flow 2: 任務發布流程

```mermaid
sequenceDiagram
    participant IC as Incident Commander
    participant FE as Frontend
    participant BE as Backend
    participant WS as WebSocket
    participant VOL as Volunteers

    IC->>FE: 建立任務
    FE->>BE: POST /tasks
    BE->>BE: 驗證權限 (Level 5+)
    BE-->>FE: Task created
    BE->>WS: broadcast 'task.created'
    WS->>VOL: 推播通知
```

**SLO**: 任務發布到推播 < 500ms

---

## Flow 3: 現場報告提交

```mermaid
sequenceDiagram
    participant V as Volunteer
    participant PWA as PWA (Offline)
    participant BE as Backend
    participant S3 as Cloud Storage

    V->>PWA: 填寫報告 + 拍照
    PWA->>PWA: 存入 IndexedDB
    Note over PWA: 離線時暫存
    PWA->>BE: POST /field-reports
    PWA->>S3: 上傳附件
    BE->>BE: 驗證 + 儲存
    BE-->>PWA: Report ID
```

**SLO**: 報告上傳 < 5s (含附件)

---

## Flow 4: 緊急求救 (SOS)

```mermaid
sequenceDiagram
    participant V as Volunteer
    participant PWA as PWA
    participant BE as Backend
    participant WS as WebSocket
    participant CC as Command Center

    V->>PWA: 按下 SOS 按鈕
    PWA->>BE: POST /sos {location}
    BE->>WS: broadcast 'sos.alert'
    WS->>CC: 即時警報
    BE-->>PWA: SOS ID
    CC->>BE: GET /volunteers/{id}/location
    CC->>CC: 顯示位置於地圖
```

**SLO**: SOS 到指揮中心 < 1s

---

## Flow 5: Token 自動續期

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend

    FE->>BE: API Request (expired token)
    BE-->>FE: 401 Unauthorized
    FE->>BE: POST /auth/refresh {refreshToken}
    BE->>BE: 驗證 + Rotation
    BE-->>FE: {newAccessToken, newRefreshToken}
    FE->>BE: 重試原始請求
    BE-->>FE: 成功回應
```

**SLO**: Token 續期 < 200ms

---

## Flow 6: 物資請求流程

```mermaid
sequenceDiagram
    participant TL as Team Lead
    participant FE as Frontend
    participant BE as Backend
    participant LOG as Logistics Officer

    TL->>FE: 提交物資請求
    FE->>BE: POST /resource-requests
    BE-->>FE: Request ID
    BE->>LOG: 通知審核
    LOG->>FE: 審核請求
    FE->>BE: PATCH /resource-requests/{id}/approve
    BE->>TL: 通知核准
```

**SLO**: 請求到通知 < 3s
