# Route-Guard Mapping Report

> **Generated**: 2026-01-13T02:17:52.936Z  
> **Script**: scan-routes-guards.ps1  
> **Spec**: baseline-counting-spec.md@v1

---

## Summary

| Metric | Value |
|--------|------:|
| Total Routes | 1108 |
| Protected Routes | 672 |
| Unprotected Routes | 436 |
| Public Routes | 1 |
| **Coverage** | **60.6%** |

---

## Controller Statistics

| Metric | Value |
|--------|------:|
| Total Controllers | 130 |
| With Guards | 78 |
| Without Guards | 52 |

---

## High-Risk Routes (Missing Guards)

| Method | Path | Controller | Line |
|--------|------|------------|-----:|
| GET | `/health` | backend/src/health-only.controller.ts | 13 |
| GET | `/health/live` | backend/src/health-only.controller.ts | 25 |
| GET | `/health/ready` | backend/src/health-only.controller.ts | 30 |
| GET | `/health` | backend/src/health/health.controller.ts | 36 |
| GET | `/health/detailed` | backend/src/health/health.controller.ts | 44 |
| GET | `/health/live` | backend/src/health/health.controller.ts | 67 |
| GET | `/health/ready` | backend/src/health/health.controller.ts | 75 |
| POST | `/aerial-analysis/images` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 11 |
| GET | `/aerial-analysis/images/:id` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 17 |
| GET | `/aerial-analysis/images/mission/:missionId` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 23 |
| GET | `/aerial-analysis/images/pending` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 29 |
| POST | `/aerial-analysis/images/:id/analyze` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 35 |
| POST | `/aerial-analysis/images/batch-analyze` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 41 |
| POST | `/aerial-analysis/assessments` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 47 |
| GET | `/aerial-analysis/assessments` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 53 |
| GET | `/aerial-analysis/assessments/:id` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 59 |
| POST | `/aerial-analysis/compare` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 65 |
| GET | `/aerial-analysis/detections/persons` | backend/src/modules/aerial-image-analysis/aerial-image-analysis.controller.ts | 71 |
| POST | `/ar/markers` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 11 |
| GET | `/ar/markers/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 17 |
| GET | `/ar/markers/floor/:buildingId/:floorId` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 23 |
| PUT | `/ar/markers/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 29 |
| DELETE | `/ar/markers/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 35 |
| POST | `/ar/routes` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 41 |
| GET | `/ar/routes/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 47 |
| POST | `/ar/routes/shortest` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 53 |
| POST | `/ar/routes/evacuation` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 59 |
| POST | `/ar/floor-plans` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 65 |
| GET | `/ar/floor-plans/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 71 |
| GET | `/ar/floor-plans/building/:buildingId` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 77 |
| POST | `/ar/sessions` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 83 |
| PUT | `/ar/sessions/:id/position` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 89 |
| GET | `/ar/sessions/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 95 |
| GET | `/ar/sessions/active` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 101 |
| DELETE | `/ar/sessions/:id` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 107 |
| GET | `/ar/view` | backend/src/modules/ar-field-guidance/ar-field-guidance.controller.ts | 113 |
| POST | `/dashboard-analytics/kpis` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 13 |
| GET | `/dashboard-analytics/kpis` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 19 |
| GET | `/dashboard-analytics/kpis/current` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 25 |
| GET | `/dashboard-analytics/kpis/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 31 |
| GET | `/dashboard-analytics/kpis/:id/history` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 37 |
| POST | `/dashboard-analytics/kpis/:id/record` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 43 |
| PUT | `/dashboard-analytics/kpis/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 49 |
| DELETE | `/dashboard-analytics/kpis/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 55 |
| POST | `/dashboard-analytics/alerts` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 63 |
| GET | `/dashboard-analytics/alerts` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 69 |
| PUT | `/dashboard-analytics/alerts/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 75 |
| DELETE | `/dashboard-analytics/alerts/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 81 |
| POST | `/dashboard-analytics/dashboards` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 89 |
| GET | `/dashboard-analytics/dashboards` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 95 |
| GET | `/dashboard-analytics/dashboards/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 101 |
| PUT | `/dashboard-analytics/dashboards/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 107 |
| DELETE | `/dashboard-analytics/dashboards/:id` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 113 |
| POST | `/dashboard-analytics/dashboards/:id/widgets` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 119 |
| DELETE | `/dashboard-analytics/dashboards/:dashboardId/widgets/:widgetId` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 125 |
| GET | `/dashboard-analytics/data/aggregate` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 133 |
| GET | `/dashboard-analytics/data/timeseries` | backend/src/modules/dashboard-analytics/dashboard-analytics.controller.ts | 143 |
| GET | `/api/drill/status` | backend/src/modules/drill-simulation/drill.controller.ts | 18 |
| GET | `/api/drill/scenarios` | backend/src/modules/drill-simulation/drill.controller.ts | 33 |
| GET | `/api/drill/scenarios/:id` | backend/src/modules/drill-simulation/drill.controller.ts | 43 |
| POST | `/api/drill/scenarios` | backend/src/modules/drill-simulation/drill.controller.ts | 53 |
| PUT | `/api/drill/scenarios/:id` | backend/src/modules/drill-simulation/drill.controller.ts | 73 |
| POST | `/api/drill/start/:scenarioId` | backend/src/modules/drill-simulation/drill.controller.ts | 88 |
| POST | `/api/drill/stop` | backend/src/modules/drill-simulation/drill.controller.ts | 98 |
| POST | `/api/drill/respond/:eventIndex` | backend/src/modules/drill-simulation/drill.controller.ts | 109 |
| GET | `/api/drill/templates` | backend/src/modules/drill-simulation/drill.controller.ts | 127 |
| POST | `/drones` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 11 |
| GET | `/drones` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 17 |
| GET | `/drones/available` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 23 |
| GET | `/drones/:id` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 29 |
| PUT | `/drones/:id/status` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 35 |
| PUT | `/drones/:id/position` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 41 |
| POST | `/drones/missions` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 47 |
| GET | `/drones/missions/all` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 53 |
| GET | `/drones/missions/active` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 59 |
| GET | `/drones/missions/:id` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 65 |
| POST | `/drones/missions/:id/start` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 71 |
| POST | `/drones/missions/:id/pause` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 77 |
| POST | `/drones/missions/:id/resume` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 83 |
| POST | `/drones/missions/:id/complete` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 89 |
| POST | `/drones/missions/:id/abort` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 95 |
| POST | `/drones/patterns/generate` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 101 |
| POST | `/drones/:id/stream/start` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 107 |
| GET | `/drones/:id/stream/:type` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 113 |
| DELETE | `/drones/:id/stream/:type` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 119 |
| GET | `/drones/streams/all` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 125 |
| POST | `/drones/detections` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 131 |
| GET | `/drones/detections/all` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 137 |
| PUT | `/drones/detections/:id/verify` | backend/src/modules/drone-swarm/drone-swarm.controller.ts | 143 |
| GET | `/equipment-qr` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 11 |
| GET | `/equipment-qr/category/:category` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 17 |
| GET | `/equipment-qr/scan/:qrCode` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 23 |
| POST | `/equipment-qr/register` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 29 |
| POST | `/equipment-qr/checkout` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 35 |
| POST | `/equipment-qr/return/:recordId` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 46 |
| GET | `/equipment-qr/checkouts/active` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 55 |
| GET | `/equipment-qr/checkouts/history/:equipmentId` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 61 |
| GET | `/equipment-qr/maintenance/pending` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 67 |
| GET | `/equipment-qr/maintenance/alerts` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 73 |
| POST | `/equipment-qr/maintenance/schedule` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 79 |
| PATCH | `/equipment-qr/maintenance/:scheduleId/complete` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 85 |
| GET | `/equipment-qr/stats` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 91 |
| GET | `/equipment-qr/alerts/low-stock` | backend/src/modules/equipment-qr/equipment-qr.controller.ts | 97 |
| GET | `/event-ai/patterns` | backend/src/modules/event-ai/event-ai.controller.ts | 11 |
| POST | `/event-ai/patterns/analyze` | backend/src/modules/event-ai/event-ai.controller.ts | 17 |
| GET | `/event-ai/predictions` | backend/src/modules/event-ai/event-ai.controller.ts | 23 |
| POST | `/event-ai/predictions/:areaId` | backend/src/modules/event-ai/event-ai.controller.ts | 29 |
| POST | `/event-ai/estimate-resources` | backend/src/modules/event-ai/event-ai.controller.ts | 38 |
| POST | `/event-ai/recommendations/:eventId` | backend/src/modules/event-ai/event-ai.controller.ts | 46 |
| POST | `/event-ai/summary` | backend/src/modules/event-ai/event-ai.controller.ts | 55 |
| POST | `/excel/events` | backend/src/modules/excel-export/excel-export.controller.ts | 11 |
| POST | `/excel/volunteers` | backend/src/modules/excel-export/excel-export.controller.ts | 19 |
| POST | `/excel/attendance` | backend/src/modules/excel-export/excel-export.controller.ts | 27 |
| POST | `/excel/payroll` | backend/src/modules/excel-export/excel-export.controller.ts | 35 |
| POST | `/excel/statistics` | backend/src/modules/excel-export/excel-export.controller.ts | 43 |
| POST | `/excel/custom` | backend/src/modules/excel-export/excel-export.controller.ts | 51 |
| POST | `/excel/csv` | backend/src/modules/excel-export/excel-export.controller.ts | 59 |
| POST | `/api/expenses` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 10 |
| POST | `/api/expenses/:id/review` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 16 |
| POST | `/api/expenses/:id/pay` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 22 |
| GET | `/api/expenses/pending` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 28 |
| GET | `/api/expenses/submitter/:id` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 34 |
| GET | `/api/expenses/stats` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 40 |
| GET | `/api/expenses/categories` | backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts | 46 |
| POST | `/reunification/persons` | backend/src/modules/family-reunification/family-reunification.controller.ts | 11 |
| GET | `/reunification/persons/search` | backend/src/modules/family-reunification/family-reunification.controller.ts | 17 |
| GET | `/reunification/persons/:id` | backend/src/modules/family-reunification/family-reunification.controller.ts | 28 |
| PUT | `/reunification/persons/:id` | backend/src/modules/family-reunification/family-reunification.controller.ts | 34 |
| POST | `/reunification/persons/:id/found` | backend/src/modules/family-reunification/family-reunification.controller.ts | 40 |
| GET | `/reunification/persons/:id/matches` | backend/src/modules/family-reunification/family-reunification.controller.ts | 46 |
| POST | `/reunification/matches/verify` | backend/src/modules/family-reunification/family-reunification.controller.ts | 52 |
| GET | `/reunification/cases` | backend/src/modules/family-reunification/family-reunification.controller.ts | 58 |
| GET | `/reunification/cases/:id` | backend/src/modules/family-reunification/family-reunification.controller.ts | 64 |
| GET | `/reunification/persons/:personId/cases` | backend/src/modules/family-reunification/family-reunification.controller.ts | 70 |
| POST | `/reunification/cases/:id/confirm` | backend/src/modules/family-reunification/family-reunification.controller.ts | 76 |
| POST | `/reunification/cases/:id/start` | backend/src/modules/family-reunification/family-reunification.controller.ts | 82 |
| POST | `/reunification/cases/:id/complete` | backend/src/modules/family-reunification/family-reunification.controller.ts | 88 |
| POST | `/reunification/cases/:id/notes` | backend/src/modules/family-reunification/family-reunification.controller.ts | 94 |
| POST | `/reunification/cases/:id/notify` | backend/src/modules/family-reunification/family-reunification.controller.ts | 100 |
| POST | `/reunification/shelter-reports` | backend/src/modules/family-reunification/family-reunification.controller.ts | 106 |
| GET | `/reunification/shelter-reports/:shelterId` | backend/src/modules/family-reunification/family-reunification.controller.ts | 112 |
| GET | `/reunification/stats` | backend/src/modules/family-reunification/family-reunification.controller.ts | 118 |
| GET | `/api/fatigue/volunteer/:id` | backend/src/modules/fatigue-detection/fatigue-detection.controller.ts | 10 |
| GET | `/api/fatigue/needs-rest` | backend/src/modules/fatigue-detection/fatigue-detection.controller.ts | 16 |
| POST | `/api/fatigue/validate-shift` | backend/src/modules/fatigue-detection/fatigue-detection.controller.ts | 22 |
| GET | `/api/fatigue/thresholds` | backend/src/modules/fatigue-detection/fatigue-detection.controller.ts | 33 |
| POST | `/api/fatigue/record-duty` | backend/src/modules/fatigue-detection/fatigue-detection.controller.ts | 39 |
| POST | `/api/geofence` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 11 |
| POST | `/api/geofence/location` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 19 |
| GET | `/api/geofence/disaster-zones` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 26 |
| GET | `/api/geofence/:id/users` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 32 |
| GET | `/api/geofence/danger-check` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 38 |
| DELETE | `/api/geofence/:id` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 44 |
| POST | `/api/geofence/quick-circle` | backend/src/modules/geofence-alert/geofence-alert.controller.ts | 51 |
| GET | `/health` | backend/src/modules/health/health.controller.ts | 27 |
| GET | `/health/live` | backend/src/modules/health/health.controller.ts | 41 |
| GET | `/health/ready` | backend/src/modules/health/health.controller.ts | 50 |
| GET | `/health/details` | backend/src/modules/health/health.controller.ts | 79 |
| POST | `/intake` | backend/src/modules/intake/intake.controller.ts | 26 |
| GET | `/intake/:id` | backend/src/modules/intake/intake.controller.ts | 60 |
| GET | `/intake/incident/:incidentId` | backend/src/modules/intake/intake.controller.ts | 69 |
| GET | `/api/public/transparency/search` | backend/src/modules/integrity-ledger/public-audit.controller.ts | 23 |
| GET | `/api/public/transparency/resource/:resourceId` | backend/src/modules/integrity-ledger/public-audit.controller.ts | 75 |
| GET | `/api/public/transparency/validate/:resourceId` | backend/src/modules/integrity-ledger/public-audit.controller.ts | 93 |
| GET | `/api/public/transparency/stats` | backend/src/modules/integrity-ledger/public-audit.controller.ts | 109 |
| GET | `/api/public/transparency/recent` | backend/src/modules/integrity-ledger/public-audit.controller.ts | 120 |
| POST | `/ai/vision/analyze` | backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts | 24 |
| POST | `/ai/vision/flood-level` | backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts | 49 |
| POST | `/ai/vision/damage-assessment` | backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts | 74 |
| POST | `/ai/classify` | backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts | 99 |
| POST | `/ai/classify/batch` | backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts | 116 |
| GET | `/api/missions/:sessionId/aar` | backend/src/modules/mission-sessions/aar.controller.ts | 17 |
| POST | `/api/missions/:sessionId/aar` | backend/src/modules/mission-sessions/aar.controller.ts | 24 |
| POST | `/api/missions/:sessionId/aar/generate` | backend/src/modules/mission-sessions/aar.controller.ts | 34 |
| GET | `/api/missions/:sessionId/aar/timeline` | backend/src/modules/mission-sessions/aar.controller.ts | 44 |
| GET | `/api/missions/:sessionId/aar/statistics` | backend/src/modules/mission-sessions/aar.controller.ts | 51 |
| PUT | `/api/missions/:sessionId/aar/:aarId` | backend/src/modules/mission-sessions/aar.controller.ts | 58 |
| POST | `/api/missions/:sessionId/aar/:aarId/finalize` | backend/src/modules/mission-sessions/aar.controller.ts | 75 |
| GET | `/api/missions/:sessionId/aar/:aarId/export` | backend/src/modules/mission-sessions/aar.controller.ts | 85 |
| GET | `/api/missions/:sessionId/iap/periods` | backend/src/modules/mission-sessions/iap.controller.ts | 20 |
| GET | `/api/missions/:sessionId/iap/periods/active` | backend/src/modules/mission-sessions/iap.controller.ts | 27 |
| POST | `/api/missions/:sessionId/iap/periods` | backend/src/modules/mission-sessions/iap.controller.ts | 34 |
| PUT | `/api/missions/:sessionId/iap/periods/:periodId` | backend/src/modules/mission-sessions/iap.controller.ts | 61 |
| POST | `/api/missions/:sessionId/iap/periods/:periodId/approve` | backend/src/modules/mission-sessions/iap.controller.ts | 82 |
| POST | `/api/missions/:sessionId/iap/periods/:periodId/activate` | backend/src/modules/mission-sessions/iap.controller.ts | 92 |
| POST | `/api/missions/:sessionId/iap/periods/:periodId/close` | backend/src/modules/mission-sessions/iap.controller.ts | 99 |
| GET | `/api/missions/:sessionId/iap/periods/:periodId/documents` | backend/src/modules/mission-sessions/iap.controller.ts | 108 |
| GET | `/api/missions/:sessionId/iap/periods/:periodId/documents/:docType` | backend/src/modules/mission-sessions/iap.controller.ts | 115 |
| PUT | `/api/missions/:sessionId/iap/periods/:periodId/documents/:docType` | backend/src/modules/mission-sessions/iap.controller.ts | 125 |
| POST | `/api/missions/:sessionId/iap/periods/:periodId/documents/:docId/approve` | backend/src/modules/mission-sessions/iap.controller.ts | 142 |
| GET | `/api/missions/:sessionId/iap/periods/:periodId/export` | backend/src/modules/mission-sessions/iap.controller.ts | 154 |
| GET | `/mission-reports/:sessionId/pdf` | backend/src/modules/mission-sessions/mission-report.controller.ts | 16 |
| GET | `/mission-reports/:sessionId/csv` | backend/src/modules/mission-sessions/mission-report.controller.ts | 24 |
| GET | `/mission-reports/:sessionId/json` | backend/src/modules/mission-sessions/mission-report.controller.ts | 32 |
| GET | `/mission-reports/:sessionId/download/pdf` | backend/src/modules/mission-sessions/mission-report.controller.ts | 40 |
| GET | `/mission-reports/:sessionId/download/csv` | backend/src/modules/mission-sessions/mission-report.controller.ts | 58 |
| GET | `/mission-reports/:sessionId/download/json` | backend/src/modules/mission-sessions/mission-report.controller.ts | 76 |
| GET | `/api/missions/:sessionId/sitrep` | backend/src/modules/mission-sessions/sitrep.controller.ts | 20 |
| POST | `/api/missions/:sessionId/sitrep` | backend/src/modules/mission-sessions/sitrep.controller.ts | 27 |
| POST | `/api/missions/:sessionId/sitrep/generate` | backend/src/modules/mission-sessions/sitrep.controller.ts | 50 |
| PUT | `/api/missions/:sessionId/sitrep/:sitrepId` | backend/src/modules/mission-sessions/sitrep.controller.ts | 69 |
| POST | `/api/missions/:sessionId/sitrep/:sitrepId/approve` | backend/src/modules/mission-sessions/sitrep.controller.ts | 86 |
| GET | `/api/missions/:sessionId/sitrep/decisions` | backend/src/modules/mission-sessions/sitrep.controller.ts | 98 |
| POST | `/api/missions/:sessionId/sitrep/decisions` | backend/src/modules/mission-sessions/sitrep.controller.ts | 112 |
| GET | `/api/missions/:sessionId/sitrep/decisions/entity/:entityType/:entityId` | backend/src/modules/mission-sessions/sitrep.controller.ts | 139 |
| GET | `/mobile-sync/state/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 13 |
| POST | `/mobile-sync/register` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 19 |
| PUT | `/mobile-sync/state/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 25 |
| POST | `/mobile-sync/offline-checkin` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 33 |
| GET | `/mobile-sync/offline-queue/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 45 |
| POST | `/mobile-sync/sync/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 51 |
| DELETE | `/mobile-sync/synced/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 57 |
| POST | `/mobile-sync/push/register` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 66 |
| GET | `/mobile-sync/push/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 78 |
| GET | `/mobile-sync/push/user/:userId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 84 |
| PUT | `/mobile-sync/push/:deviceId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 90 |
| POST | `/mobile-sync/push/:deviceId/topic` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 96 |
| POST | `/mobile-sync/push/send/:userId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 106 |
| POST | `/mobile-sync/push/broadcast/:topic` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 116 |
| POST | `/mobile-sync/location/:userId` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 128 |
| GET | `/mobile-sync/location/:userId/history` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 138 |
| GET | `/mobile-sync/location/active` | backend/src/modules/mobile-sync/mobile-sync.controller.ts | 147 |
| GET | `/api/mesh/nodes` | backend/src/modules/offline-mesh/mesh.controller.ts | 15 |
| GET | `/api/mesh/nodes/active` | backend/src/modules/offline-mesh/mesh.controller.ts | 25 |
| GET | `/api/mesh/nodes/:nodeId/messages` | backend/src/modules/offline-mesh/mesh.controller.ts | 35 |
| GET | `/api/mesh/stats` | backend/src/modules/offline-mesh/mesh.controller.ts | 51 |
| POST | `/api/mesh/sync` | backend/src/modules/offline-mesh/mesh.controller.ts | 61 |
| POST | `/api/sync/upload` | backend/src/modules/offline-sync/offline-sync.controller.ts | 10 |
| GET | `/api/sync/pending` | backend/src/modules/offline-sync/offline-sync.controller.ts | 16 |
| GET | `/api/sync/updates` | backend/src/modules/offline-sync/offline-sync.controller.ts | 22 |
| GET | `/api/sync/summary` | backend/src/modules/offline-sync/offline-sync.controller.ts | 28 |
| POST | `/org-chart` | backend/src/modules/org-chart/org-chart.controller.ts | 10 |
| GET | `/org-chart/:id` | backend/src/modules/org-chart/org-chart.controller.ts | 18 |
| PUT | `/org-chart/:id` | backend/src/modules/org-chart/org-chart.controller.ts | 25 |
| DELETE | `/org-chart/:id` | backend/src/modules/org-chart/org-chart.controller.ts | 33 |
| GET | `/org-chart/:id/children` | backend/src/modules/org-chart/org-chart.controller.ts | 41 |
| GET | `/org-chart/tree/:rootId` | backend/src/modules/org-chart/org-chart.controller.ts | 48 |
| GET | `/org-chart/:id/path` | backend/src/modules/org-chart/org-chart.controller.ts | 55 |
| GET | `/org-chart` | backend/src/modules/org-chart/org-chart.controller.ts | 62 |
| PUT | `/org-chart/:id/move` | backend/src/modules/org-chart/org-chart.controller.ts | 69 |
| GET | `/org-chart/stats` | backend/src/modules/org-chart/org-chart.controller.ts | 77 |
| GET | `/org-chart/export/flat` | backend/src/modules/org-chart/org-chart.controller.ts | 84 |
| GET | `/api/missions/:sessionId/map/sectors` | backend/src/modules/overlays/map-dispatch.controller.ts | 21 |
| POST | `/api/missions/:sessionId/map/sectors` | backend/src/modules/overlays/map-dispatch.controller.ts | 28 |
| POST | `/api/missions/:sessionId/map/sectors/:sectorId/assign` | backend/src/modules/overlays/map-dispatch.controller.ts | 50 |
| PUT | `/api/missions/:sessionId/map/sectors/:sectorId/status` | backend/src/modules/overlays/map-dispatch.controller.ts | 64 |
| GET | `/api/missions/:sessionId/map/rally-points` | backend/src/modules/overlays/map-dispatch.controller.ts | 81 |
| POST | `/api/missions/:sessionId/map/rally-points` | backend/src/modules/overlays/map-dispatch.controller.ts | 88 |
| PUT | `/api/missions/:sessionId/map/rally-points/:pointId/status` | backend/src/modules/overlays/map-dispatch.controller.ts | 113 |
| GET | `/api/missions/:sessionId/map/routes` | backend/src/modules/overlays/map-dispatch.controller.ts | 125 |
| POST | `/api/missions/:sessionId/map/routes` | backend/src/modules/overlays/map-dispatch.controller.ts | 132 |
| PUT | `/api/missions/:sessionId/map/routes/:routeId/status` | backend/src/modules/overlays/map-dispatch.controller.ts | 155 |
| POST | `/api/missions/:sessionId/map/dispatch/bbox` | backend/src/modules/overlays/map-dispatch.controller.ts | 167 |
| POST | `/api/missions/:sessionId/map/dispatch/sector/:sectorId` | backend/src/modules/overlays/map-dispatch.controller.ts | 189 |
| GET | `/api/missions/:sessionId/map/eta` | backend/src/modules/overlays/map-dispatch.controller.ts | 207 |
| GET | `/map-packages` | backend/src/modules/overlays/map-packages.controller.ts | 22 |
| GET | `/map-packages/recommendations` | backend/src/modules/overlays/map-packages.controller.ts | 30 |
| GET | `/map-packages/:id/manifest` | backend/src/modules/overlays/map-packages.controller.ts | 40 |
| POST | `/pdf/event-report` | backend/src/modules/pdf-generator/pdf-generator.controller.ts | 11 |
| POST | `/pdf/attendance-report` | backend/src/modules/pdf-generator/pdf-generator.controller.ts | 19 |
| POST | `/pdf/sitrep` | backend/src/modules/pdf-generator/pdf-generator.controller.ts | 27 |
| POST | `/pdf/statistics` | backend/src/modules/pdf-generator/pdf-generator.controller.ts | 35 |
| POST | `/pdf/certificate/:volunteerId` | backend/src/modules/pdf-generator/pdf-generator.controller.ts | 43 |
| POST | `/pdf/batch` | backend/src/modules/pdf-generator/pdf-generator.controller.ts | 51 |
| GET | `/api/performance/volunteer/:id` | backend/src/modules/performance-report/performance-report.controller.ts | 10 |
| GET | `/api/performance/team/:id` | backend/src/modules/performance-report/performance-report.controller.ts | 17 |
| GET | `/api/performance/area` | backend/src/modules/performance-report/performance-report.controller.ts | 24 |
| GET | `/api/performance/monthly/:year/:month` | backend/src/modules/performance-report/performance-report.controller.ts | 31 |
| GET | `/api/performance/annual/:year` | backend/src/modules/performance-report/performance-report.controller.ts | 37 |
| GET | `/api/performance/export/:type` | backend/src/modules/performance-report/performance-report.controller.ts | 43 |
| GET | `/metrics` | backend/src/modules/prometheus/prometheus.controller.ts | 10 |
| GET | `/metrics/json` | backend/src/modules/prometheus/prometheus.controller.ts | 17 |
| POST | `/api/care/mood` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 21 |
| GET | `/api/care/mood/history/:userId` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 40 |
| GET | `/api/care/mood/summary/:userId` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 56 |
| GET | `/api/care/mood/team-trend` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 66 |
| GET | `/api/care/mood/attention` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 78 |
| GET | `/api/care/blessings` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 90 |
| POST | `/api/care/blessings` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 102 |
| POST | `/api/care/blessings/:id/like` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 120 |
| POST | `/api/care/chat` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 132 |
| GET | `/api/care/chat/history/:userId` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 152 |
| POST | `/api/care/chat/new-session` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 165 |
| GET | `/api/care/stats` | backend/src/modules/psychological-support/mood-tracker.controller.ts | 177 |
| GET | `/public/announcements` | backend/src/modules/public/public.controller.ts | 67 |
| GET | `/public/shelters` | backend/src/modules/public/public.controller.ts | 87 |
| GET | `/public/aed` | backend/src/modules/public/public.controller.ts | 110 |
| GET | `/public/alerts` | backend/src/modules/public/public.controller.ts | 131 |
| GET | `/public/weather` | backend/src/modules/public/public.controller.ts | 150 |
| GET | `/public/ping` | backend/src/modules/public/public.controller.ts | 164 |
| GET | `/public/info` | backend/src/modules/public/public.controller.ts | 177 |
| GET | `/api/public/finance/summary/:year` | backend/src/modules/public-finance/public-finance.controller.ts | 10 |
| GET | `/api/public/finance/expenditures/:year` | backend/src/modules/public-finance/public-finance.controller.ts | 16 |
| GET | `/api/public/finance/project/:id` | backend/src/modules/public-finance/public-finance.controller.ts | 23 |
| GET | `/api/public/finance/donor-acknowledgement` | backend/src/modules/public-finance/public-finance.controller.ts | 29 |
| GET | `/api/public/finance/annual-report/:year` | backend/src/modules/public-finance/public-finance.controller.ts | 39 |
| GET | `/api/public/finance/dashboard` | backend/src/modules/public-finance/public-finance.controller.ts | 45 |
| GET | `/public-resources/shelters` | backend/src/modules/public-resources/public-resources.controller.ts | 16 |
| GET | `/public-resources/shelters/nearby` | backend/src/modules/public-resources/public-resources.controller.ts | 26 |
| GET | `/public-resources/aed` | backend/src/modules/public-resources/public-resources.controller.ts | 52 |
| GET | `/public-resources/aed/nearby` | backend/src/modules/public-resources/public-resources.controller.ts | 62 |
| GET | `/public-resources/map` | backend/src/modules/public-resources/public-resources.controller.ts | 88 |
| POST | `/api/knowledge/query` | backend/src/modules/rag-knowledge/rag-knowledge.controller.ts | 10 |
| GET | `/api/knowledge/search` | backend/src/modules/rag-knowledge/rag-knowledge.controller.ts | 16 |
| GET | `/api/knowledge/categories` | backend/src/modules/rag-knowledge/rag-knowledge.controller.ts | 22 |
| POST | `/api/knowledge/documents` | backend/src/modules/rag-knowledge/rag-knowledge.controller.ts | 28 |
| GET | `/report-builder/templates` | backend/src/modules/report-builder/report-builder.controller.ts | 11 |
| GET | `/report-builder/templates/:id` | backend/src/modules/report-builder/report-builder.controller.ts | 17 |
| POST | `/report-builder/templates` | backend/src/modules/report-builder/report-builder.controller.ts | 23 |
| PATCH | `/report-builder/templates/:id` | backend/src/modules/report-builder/report-builder.controller.ts | 29 |
| DELETE | `/report-builder/templates/:id` | backend/src/modules/report-builder/report-builder.controller.ts | 35 |
| POST | `/report-builder/generate/:templateId` | backend/src/modules/report-builder/report-builder.controller.ts | 41 |
| GET | `/report-builder/scheduled` | backend/src/modules/report-builder/report-builder.controller.ts | 47 |
| POST | `/report-builder/scheduled` | backend/src/modules/report-builder/report-builder.controller.ts | 53 |
| PATCH | `/report-builder/scheduled/:id/toggle` | backend/src/modules/report-builder/report-builder.controller.ts | 59 |
| DELETE | `/report-builder/scheduled/:id` | backend/src/modules/report-builder/report-builder.controller.ts | 65 |
| POST | `/labels/generate/lot` | backend/src/modules/resources/label-print.controller.ts | 15 |
| POST | `/labels/generate/assets` | backend/src/modules/resources/label-print.controller.ts | 41 |
| POST | `/labels/reprint` | backend/src/modules/resources/label-print.controller.ts | 67 |
| POST | `/labels/revoke` | backend/src/modules/resources/label-print.controller.ts | 95 |
| GET | `/labels/history/:targetType/:targetId` | backend/src/modules/resources/label-print.controller.ts | 126 |
| GET | `/label-templates` | backend/src/modules/resources/label-templates.controller.ts | 15 |
| GET | `/label-templates/:id` | backend/src/modules/resources/label-templates.controller.ts | 32 |
| POST | `/label-templates` | backend/src/modules/resources/label-templates.controller.ts | 41 |
| PATCH | `/label-templates/:id` | backend/src/modules/resources/label-templates.controller.ts | 71 |
| PATCH | `/label-templates/:id/active` | backend/src/modules/resources/label-templates.controller.ts | 99 |
| DELETE | `/label-templates/:id` | backend/src/modules/resources/label-templates.controller.ts | 118 |
| GET | `/label-templates/applicable/list` | backend/src/modules/resources/label-templates.controller.ts | 137 |
| POST | `/sensitive/read` | backend/src/modules/resources/sensitive.controller.ts | 17 |
| POST | `/sensitive/audit-logs` | backend/src/modules/resources/sensitive.controller.ts | 56 |
| POST | `/sensitive/read-logs` | backend/src/modules/resources/sensitive.controller.ts | 91 |
| POST | `/shift-calendar` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 10 |
| GET | `/shift-calendar/calendar` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 18 |
| GET | `/shift-calendar/volunteer/:volunteerId` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 26 |
| PUT | `/shift-calendar/:shiftId` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 38 |
| DELETE | `/shift-calendar/:shiftId` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 46 |
| POST | `/shift-calendar/swap` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 54 |
| POST | `/shift-calendar/copy-week` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 62 |
| GET | `/shift-calendar/vacancies` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 71 |
| GET | `/shift-calendar/templates` | backend/src/modules/shift-calendar/shift-calendar.controller.ts | 79 |
| POST | `/api/scheduling/suggest-dispatch` | backend/src/modules/smart-scheduling/smart-scheduling.controller.ts | 10 |
| POST | `/api/scheduling/generate-schedule` | backend/src/modules/smart-scheduling/smart-scheduling.controller.ts | 16 |
| POST | `/api/scheduling/find-backup` | backend/src/modules/smart-scheduling/smart-scheduling.controller.ts | 25 |
| GET | `/api/scheduling/predict-staffing` | backend/src/modules/smart-scheduling/smart-scheduling.controller.ts | 31 |
| GET | `/social-monitor/posts` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 47 |
| GET | `/social-monitor/export` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 68 |
| GET | `/social-monitor/trends` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 88 |
| GET | `/social-monitor/stats` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 95 |
| GET | `/social-monitor/keywords` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 103 |
| POST | `/social-monitor/keywords` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 109 |
| GET | `/social-monitor/exclude-words` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 118 |
| POST | `/social-monitor/exclude-words` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 124 |
| POST | `/social-monitor/analyze` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 133 |
| DELETE | `/social-monitor/purge` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 162 |
| GET | `/social-monitor/notifications` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 170 |
| POST | `/social-monitor/notifications` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 176 |
| PUT | `/social-monitor/notifications/:id` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 182 |
| DELETE | `/social-monitor/notifications/:id` | backend/src/modules/social-media-monitor/social-media-monitor.controller.ts | 188 |
| GET | `/blockchain/chain` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 11 |
| GET | `/blockchain/chain/verify` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 17 |
| GET | `/blockchain/blocks/:hash` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 23 |
| POST | `/blockchain/donations` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 29 |
| GET | `/blockchain/donations` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 35 |
| GET | `/blockchain/donations/:id` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 41 |
| GET | `/blockchain/donations/donor/:name` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 47 |
| GET | `/blockchain/items/:itemId/trail` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 53 |
| POST | `/blockchain/items/:itemId/transfer` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 59 |
| POST | `/blockchain/items/:itemId/distribute` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 68 |
| GET | `/blockchain/public/ledger` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 77 |
| GET | `/blockchain/audit/report` | backend/src/modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts | 83 |
| GET | `/api/climate/trends/:region` | backend/src/modules/tccip-climate/tccip-climate.controller.ts | 10 |
| GET | `/api/climate/extreme-weather/:region` | backend/src/modules/tccip-climate/tccip-climate.controller.ts | 16 |
| GET | `/api/climate/vulnerability/:region` | backend/src/modules/tccip-climate/tccip-climate.controller.ts | 22 |
| GET | `/api/climate/disaster-stats/:region` | backend/src/modules/tccip-climate/tccip-climate.controller.ts | 28 |
| GET | `/api/climate/adaptation` | backend/src/modules/tccip-climate/tccip-climate.controller.ts | 34 |
| GET | `/api/trends/predict/:region/:type` | backend/src/modules/trend-prediction/trend-prediction.controller.ts | 10 |
| GET | `/api/trends/risk/:region` | backend/src/modules/trend-prediction/trend-prediction.controller.ts | 21 |
| GET | `/api/trends/seasonal/:region` | backend/src/modules/trend-prediction/trend-prediction.controller.ts | 27 |
| GET | `/api/trends/resource-demand/:region/:scenario` | backend/src/modules/trend-prediction/trend-prediction.controller.ts | 33 |
| GET | `/api/voice/users/online` | backend/src/modules/voice/voice-call.controller.ts | 15 |
| GET | `/api/voice/stats` | backend/src/modules/voice/voice-call.controller.ts | 25 |
| POST | `/api/voice/call/line` | backend/src/modules/voice/voice-call.controller.ts | 37 |
| POST | `/api/voice/broadcast/:missionId` | backend/src/modules/voice/voice-call.controller.ts | 56 |
| GET | `/api/voice/turn-credentials` | backend/src/modules/voice/voice-call.controller.ts | 74 |
| GET | `/volunteer-points/:volunteerId` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 11 |
| POST | `/volunteer-points/:volunteerId/initialize` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 17 |
| POST | `/volunteer-points/:volunteerId/add` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 26 |
| POST | `/volunteer-points/:volunteerId/service-hours` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 35 |
| GET | `/volunteer-points/rewards/list` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 51 |
| POST | `/volunteer-points/:volunteerId/redeem/:rewardId` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 57 |
| PATCH | `/volunteer-points/:volunteerId/redemption/:redemptionId/fulfill` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 66 |
| GET | `/volunteer-points/leaderboard/top` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 75 |
| GET | `/volunteer-points/:volunteerId/annual-report/:year` | backend/src/modules/volunteer-points/volunteer-points.controller.ts | 81 |
| GET | `/api/water/river-levels` | backend/src/modules/water-resources/water-resources.controller.ts | 10 |
| GET | `/api/water/reservoirs` | backend/src/modules/water-resources/water-resources.controller.ts | 16 |
| GET | `/api/water/flood-zones/:region` | backend/src/modules/water-resources/water-resources.controller.ts | 22 |
| GET | `/api/water/alerts` | backend/src/modules/water-resources/water-resources.controller.ts | 28 |
| POST | `/api/water/subscribe` | backend/src/modules/water-resources/water-resources.controller.ts | 34 |
| GET | `/api/weather/current` | backend/src/modules/weather/weather.controller.ts | 15 |
| GET | `/api/weather/forecast/:location` | backend/src/modules/weather/weather.controller.ts | 27 |
| GET | `/api/weather/alerts` | backend/src/modules/weather/weather.controller.ts | 38 |
| GET | `/api/weather/alerts/location/:location` | backend/src/modules/weather/weather.controller.ts | 49 |
| GET | `/api/weather/risk` | backend/src/modules/weather/weather.controller.ts | 59 |
| GET | `/api/weather/sync` | backend/src/modules/weather/weather.controller.ts | 77 |
| POST | `/weather-alerts` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 11 |
| GET | `/weather-alerts/active` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 17 |
| GET | `/weather-alerts/region/:region` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 23 |
| GET | `/weather-alerts/:id` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 29 |
| PUT | `/weather-alerts/:id` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 35 |
| POST | `/weather-alerts/:id/resolve` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 41 |
| POST | `/weather-alerts/sync/cwb` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 47 |
| GET | `/weather-alerts/weather/:locationId` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 54 |
| GET | `/weather-alerts/weather/:locationId/history` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 60 |
| POST | `/weather-alerts/subscriptions` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 66 |
| GET | `/weather-alerts/subscriptions/user/:userId` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 72 |
| PUT | `/weather-alerts/subscriptions/:id` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 78 |
| DELETE | `/weather-alerts/subscriptions/:id` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 84 |
| POST | `/weather-alerts/missions/:missionId/link` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 90 |
| GET | `/weather-alerts/missions/:missionId/impact` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 96 |
| DELETE | `/weather-alerts/missions/:missionId/link` | backend/src/modules/weather-alert-integration/weather-alert-integration.controller.ts | 102 |
| GET | `/weather/general` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 11 |
| GET | `/weather/weekly` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 17 |
| GET | `/weather/maps` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 25 |
| GET | `/weather/rainfall` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 31 |
| GET | `/weather/marine` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 39 |
| GET | `/weather/wave` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 45 |
| GET | `/weather/tide` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 51 |
| GET | `/weather/mountain` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 59 |
| GET | `/weather/scenic` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 65 |
| GET | `/weather/farm` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 71 |
| GET | `/weather/counties` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 79 |
| GET | `/weather/tide-stations` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 84 |
| GET | `/weather/marine-regions` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 89 |
| GET | `/weather/summary` | backend/src/modules/weather-forecast/weather-forecast.controller.ts | 96 |
| GET | `/weather-hub/overview` | backend/src/modules/weather-hub/weather-hub.controller.ts | 19 |
| GET | `/weather-hub/by-location` | backend/src/modules/weather-hub/weather-hub.controller.ts | 29 |


---

## Protected Routes by Guard Type

### With RequireLevel

- `GET /webhooks/subscriptions` -> Level 3
- `GET /webhooks/subscriptions/:id` -> Level 3
- `POST /webhooks/subscriptions` -> Level 3
- `PUT /webhooks/subscriptions/:id` -> Level 3
- `DELETE /webhooks/subscriptions/:id` -> Level 4
- `POST /webhooks/subscriptions/:id/regenerate-secret` -> Level 5
- `POST /webhooks/subscriptions/:id/test` -> Level 4
- `POST /webhooks/subscriptions/:id/enable` -> Level 3
- `POST /webhooks/subscriptions/:id/disable` -> Level 4
- `GET /webhooks/event-types` -> Level 4
- `GET /webhooks/logs` -> Level 3
- `GET /webhooks/stats` -> Level 3
- `POST /webhooks/dispatch` -> Level 3


### Explicitly Public

- `GET /intake` -> @Public()


---

## Next Steps

1. Review high-risk routes and add appropriate guards
2. Run E2E tests on 10 high-risk endpoints
3. Calculate security maturity score

---

**Full data**: [T1-routes-guards-mapping.json](T1-routes-guards-mapping.json)
