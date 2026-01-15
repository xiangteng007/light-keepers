# Cloud Run 監控計畫

**日期**: 2026-01-15  
**狀態**: 規劃完成

---

## 1. 監控策略

### 1.1 核心指標

| 指標 | 說明 | 閾值 |
|------|------|------|
| 請求延遲 (p99) | 99th percentile 響應時間 | > 2s 警示 |
| 錯誤率 | 5xx 錯誤比例 | > 1% 警示 |
| 請求數 | 每分鐘請求量 | 異常波動警示 |
| CPU 使用率 | 容器 CPU 使用 | > 80% 警示 |
| 記憶體使用率 | 容器記憶體使用 | > 85% 警示 |
| 實例數 | 運行中實例 | 持續為 0 警示 |

### 1.2 Always-on CPU 考量

```yaml
# Cloud Run 服務配置
spec:
  template:
    metadata:
      annotations:
        # 啟用 Always-on CPU
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
```

**風險**:

- 成本較高（約 $0.00002400/vCPU-sec）
- 適用於需要後台處理的服務

**建議**:

- WebSocket Gateway: 使用 Always-on
- API 服務: 使用標準 CPU（按需節流）

---

## 2. Terraform 配置

### 2.1 監控告警策略

```hcl
# terraform/modules/monitoring/main.tf

resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "Light Keepers - High Latency"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run Latency > 2s"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }
    }
  }

  notification_channels = var.notification_channels

  documentation {
    content   = "Cloud Run 服務回應時間超過 2 秒"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "Light Keepers - High Error Rate"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error Rate > 1%"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = var.notification_channels
}

resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "Light Keepers - High CPU"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "CPU > 80%"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/container/cpu/utilizations\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels
}
```

### 2.2 通知頻道

```hcl
# Slack 通知
resource "google_monitoring_notification_channel" "slack" {
  display_name = "Light Keepers Slack"
  project      = var.project_id
  type         = "slack"

  labels = {
    channel_name = "#lightkeepers-alerts"
  }

  sensitive_labels {
    auth_token = var.slack_webhook_token
  }
}

# Email 通知
resource "google_monitoring_notification_channel" "email" {
  display_name = "Light Keepers Email"
  project      = var.project_id
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}
```

### 2.3 Dashboard

```hcl
resource "google_monitoring_dashboard" "lightkeepers" {
  dashboard_json = jsonencode({
    displayName = "Light Keepers Overview"
    gridLayout = {
      columns = 2
      widgets = [
        {
          title = "Request Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\""
                }
              }
            }]
          }
        },
        {
          title = "Latency (p99)"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""
                  aggregation = {
                    perSeriesAligner = "ALIGN_PERCENTILE_99"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Error Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                }
              }
            }]
          }
        },
        {
          title = "Instance Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/container/instance_count\""
                }
              }
            }]
          }
        }
      ]
    }
  })
  project = var.project_id
}
```

---

## 3. 成本觀察

| 項目 | 計費方式 | 月估算 |
|------|----------|--------|
| Always-on CPU | $0.00002400/vCPU-sec | ~$62/月 (1 vCPU) |
| 標準 CPU | $0.00002400/vCPU-sec (僅處理時) | ~$10-20/月 |
| Memory | $0.00000250/GiB-sec | ~$6/月 (1 GiB) |
| Requests | $0.40/百萬次 | ~$1-5/月 |

**建議**: 非關鍵服務使用標準 CPU，僅 WebSocket Gateway 使用 Always-on。

---

## 4. 驗收確認

- [ ] 告警策略已部署
- [ ] 通知頻道已驗證
- [ ] Dashboard 可存取
- [ ] 成本監控已設置
