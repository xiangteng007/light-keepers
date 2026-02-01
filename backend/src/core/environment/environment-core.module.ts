/**
 * Environment Core Module - 環境監測中心
 * 
 * 整合模組: weather, weather-forecast, weather-alert-integration,
 *           weather-hub, ncdr-alerts, tccip-climate, trend-prediction
 * 
 * 職責:
 * - 氣象資料整合 (CWA)
 * - 災害預警 (NCDR)
 * - 氣候趨勢分析
 * - 環境監測
 */

import { Module } from '@nestjs/common';
import { NcdrAlertsModule } from '../../modules/ncdr-alerts/ncdr-alerts.module';

@Module({
    imports: [NcdrAlertsModule,
        // 未來整合: ClimateModule, etc.
    ],
    exports: [NcdrAlertsModule],
})
export class EnvironmentCoreModule { }
