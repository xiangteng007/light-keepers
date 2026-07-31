/**
 * ⚠️ 凍結模組（FROZEN）— BE-4 / 工作項 4.2 判定
 *
 * 狀態：**已從 `app.module.ts` 移除註冊，目前無 HTTP 出口。**
 *
 * 凍結（而非刪除）的理由：
 * - 這是「待外部機關規格」的整合轉接層，不是被遺棄的假模組。
 *   `fire-119.service.ts` 在未設定時回傳結構化的 `FIRE119_NOT_CONFIGURED`
 *   ＋ `pendingSpecs`（需與消防署洽談 API 合作 / 取得即時案件推送權限 / 確認資料格式）。
 *
 * 但為何要關閉出口：
 * - `fire-119-deep.service.ts:463-476` 在未設定時會用 `Math.random()` 生成假案件
 *   （隨機台北座標、假 CAD 編號）並經 HTTP 送出。把示範資料當成真實 119 派遣資料
 *   對外提供，風險過高。
 *
 * 重新啟用條件：
 * 1. 消防署 API 規格與資料格式確認，`FIRE119_API_ENDPOINT` / `FIRE119_API_KEY`
 *    （深度整合另需 `FIRE119_CAD_ENDPOINT` / `FIRE119_AVL_ENDPOINT`）完成設定。
 * 2. 移除 `fire-119-deep.service.ts` 的模擬資料分支，未設定時一律回傳明確錯誤。
 * 3. 再把 `Fire119Module` 加回 `app.module.ts` 的 imports。
 *
 * 詳見 `docs/architecture/STUB_DELETION_REPORT.md` §5。
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Fire119Service } from './fire-119.service';
import { Fire119DeepIntegrationService } from './fire-119-deep.service';
import { Fire119Controller } from './fire-119.controller';

/**
 * Fire 119 Module
 * 消防署整合模組
 * 
 * Phase 4 深度整合：
 * - CAD 雙向同步
 * - 消防車位置追蹤
 * - 水源管理
 * - 火場態勢
 */
@Module({
    imports: [
        ConfigModule,
        EventEmitterModule.forRoot(),
    ],
    controllers: [Fire119Controller],
    providers: [
        Fire119Service,
        Fire119DeepIntegrationService,
    ],
    exports: [
        Fire119Service,
        Fire119DeepIntegrationService,
    ],
})
export class Fire119Module { }


