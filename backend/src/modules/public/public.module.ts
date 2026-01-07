/**
 * Public Module - Level 0 公開端點
 * 
 * 集中處理所有不需要登入的公開 API，包括：
 * - 公開公告
 * - 公開地圖資訊 (避難所、AED)
 * - 公開預警資訊
 * - 公開氣象資訊
 * 
 * 安全規範：
 * - 禁止回傳任何個資
 * - 禁止回傳志工詳細資料
 * - 禁止回傳任務內部細節
 * - 禁止回傳非公開回報資料
 */

import { Module, forwardRef } from '@nestjs/common';
import { PublicController } from './public.controller';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { PublicResourcesModule } from '../public-resources/public-resources.module';
import { NcdrAlertsModule } from '../ncdr-alerts/ncdr-alerts.module';
import { WeatherForecastModule } from '../weather-forecast/weather-forecast.module';

@Module({
    imports: [
        forwardRef(() => AnnouncementsModule),
        forwardRef(() => PublicResourcesModule),
        forwardRef(() => NcdrAlertsModule),
        forwardRef(() => WeatherForecastModule),
    ],
    controllers: [PublicController],
    exports: [],
})
export class PublicModule { }
