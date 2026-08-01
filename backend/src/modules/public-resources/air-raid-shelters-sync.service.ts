import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { AirRaidSheltersService } from './air-raid-shelters.service';
import { createMapboxGeocodeFn } from './air-raid-shelters-geocode.helper';

/**
 * 防空避難處所資料月度自動更新排程。
 *
 * ⚠️ 部署後設定事項（本任務不執行，僅提供排程骨架）：
 * 1. 設定環境變數 `AIR_RAID_SHELTER_CSV_URL`，指向內政部警政署「防空避難處所」
 *    於 data.gov.tw 的正式 CSV/API 下載連結。
 * 2. （選用）設定 `MAPBOX_ACCESS_TOKEN`，供缺少座標的地址自動地理編碼。
 *
 * 若 `AIR_RAID_SHELTER_CSV_URL` 未設定，排程執行時僅記錄警告並直接略過，
 * 不會嘗試對外連線 —— 這是刻意的安全預設值，避免在尚未完成資料來源審核前
 * 誤連正式政府資料源。手動/測試匯入請改用
 * `backend/src/scripts/import-air-raid-shelters.ts`（可搭配 seeds/ 假資料）。
 */
@Injectable()
export class AirRaidSheltersSyncService {
    private readonly logger = new Logger(AirRaidSheltersSyncService.name);

    constructor(
        private readonly airRaidSheltersService: AirRaidSheltersService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
        name: 'air-raid-shelters-monthly-sync',
    })
    async handleMonthlySync(): Promise<void> {
        const csvUrl = this.configService.get<string>('AIR_RAID_SHELTER_CSV_URL');

        if (!csvUrl) {
            this.logger.warn(
                'AIR_RAID_SHELTER_CSV_URL not configured — skipping air-raid shelter monthly sync. ' +
                'Configure this env var post-deployment to enable automatic updates.',
            );
            return;
        }

        try {
            this.logger.log(`Fetching air-raid shelter CSV from ${csvUrl}`);
            const response = await firstValueFrom(
                this.httpService.get<string>(csvUrl, { timeout: 60000, responseType: 'text' }),
            );

            const geocode = createMapboxGeocodeFn(this.configService.get<string>('MAPBOX_ACCESS_TOKEN'));
            const summary = await this.airRaidSheltersService.importFromCsv(response.data, { geocode });

            this.logger.log(
                `Air-raid shelter monthly sync complete: +${summary.inserted} / ~${summary.updated} / ` +
                `skipped ${summary.skipped} / missing coords ${summary.missingCoordinates.length}`,
            );
        } catch (error) {
            this.logger.error(`Air-raid shelter monthly sync failed: ${(error as Error).message}`);
        }
    }
}
