import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AirRaidShelter } from '../modules/public-resources/entities/air-raid-shelter.entity';
import { parseAirRaidShelterCsv, upsertAirRaidShelters } from '../modules/public-resources/air-raid-shelters.importer';
import { createMapboxGeocodeFn } from '../modules/public-resources/air-raid-shelters-geocode.helper';

config({ path: '.env.local' });
config();

/**
 * 防空避難處所（Air-Raid Shelter）CSV 匯入腳本
 * C1.2 / CD-2 防空避難設施資料介接
 *
 * 用法：
 *   npx ts-node backend/src/scripts/import-air-raid-shelters.ts [csv路徑]
 *
 * 若不指定 csv 路徑，預設讀取 backend/src/seeds/air-raid-shelters.sample.csv
 * （3-5 筆假資料，供開發/測試使用；欄位格式模擬 data.gov.tw 下載格式）。
 *
 * 正式資料來源（內政部警政署「防空避難處所」，data.gov.tw）之連線與大量匯入
 * 屬部署後操作，本腳本本身不內建正式資料的下載網址 —— 使用方式為：
 *   1. 從 data.gov.tw 下載該資料集之 CSV
 *   2. 執行：npx ts-node backend/src/scripts/import-air-raid-shelters.ts /path/to/downloaded.csv
 *
 * 去重規則：同地址（address）視為同一筆設施，將更新既有資料而非新增重複資料。
 *
 * 地理編碼：若 CSV 列缺少緯度/經度，且已設定環境變數 MAPBOX_ACCESS_TOKEN，
 * 會嘗試以地址呼叫 Mapbox Geocoding API 補齊座標；未設定則座標留空，並於
 * 執行結果摘要中列出待補地址（missingCoordinates），不會使用假座標。
 *
 * 月度自動更新：見 AirRaidSheltersSyncService
 * (backend/src/modules/public-resources/air-raid-shelters-sync.service.ts)，
 * 該排程服務重用本腳本相同的解析/upsert 邏輯
 * (air-raid-shelters.importer.ts)。
 */

const DEFAULT_CSV_PATH = resolve(__dirname, '../seeds/air-raid-shelters.sample.csv');

async function importAirRaidShelters() {
    const csvPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_CSV_PATH;

    console.log('🛡️  防空避難處所資料匯入');
    console.log(`📄 CSV 來源: ${csvPath}`);

    if (!existsSync(csvPath)) {
        console.error(`❌ 找不到 CSV 檔案: ${csvPath}`);
        process.exitCode = 1;
        return;
    }

    const csvText = readFileSync(csvPath, 'utf8');
    const rows = parseAirRaidShelterCsv(csvText);
    console.log(`📊 解析出 ${rows.length} 筆資料`);

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE || 'lightkeepers',
        entities: [AirRaidShelter],
        synchronize: false,
    });

    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
        console.warn(
            '⚠️  MAPBOX_ACCESS_TOKEN 未設定，缺少座標的地址將不會自動地理編碼，' +
            '座標欄位會留空待後續人工補值。',
        );
    }
    const geocode = createMapboxGeocodeFn(mapboxToken);

    try {
        await dataSource.initialize();
        console.log('✅ 資料庫連線成功');

        const repo = dataSource.getRepository(AirRaidShelter);
        const summary = await upsertAirRaidShelters(repo, rows, { geocode });

        console.log('\n🎉 匯入完成');
        console.log(`   新增: ${summary.inserted}`);
        console.log(`   更新: ${summary.updated}`);
        console.log(`   略過（錯誤）: ${summary.skipped}`);
        if (summary.missingCoordinates.length > 0) {
            console.log(`   ⚠️ 缺少座標（待補）: ${summary.missingCoordinates.length} 筆`);
            summary.missingCoordinates.forEach((addr) => console.log(`      - ${addr}`));
        }
    } catch (error) {
        console.error('❌ 匯入失敗:', error);
        process.exitCode = 1;
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

importAirRaidShelters();
