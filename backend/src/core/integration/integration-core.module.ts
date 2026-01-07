/**
 * Integration Core Module - 外部整合
 * 
 * 整合模組: integrations, ngo-integration, ngo-api, fire-119,
 *           citizen-app, webhooks, satellite-comm, voice,
 *           voice-assistant, speech-to-text
 * 
 * 職責:
 * - 第三方 API 整合
 * - Webhook 管理
 * - 外部系統對接 (NGO, 119)
 */

import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../modules/integrations/integrations.module';

@Module({
    imports: [
        IntegrationsModule,
        // 未來整合: NgoApiModule, WebhooksModule, etc.
    ],
    exports: [IntegrationsModule],
})
export class IntegrationCoreModule { }
