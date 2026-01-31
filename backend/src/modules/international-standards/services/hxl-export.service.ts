import { Injectable, Logger } from '@nestjs/common';

/**
 * HXL 標準欄位標籤
 * @see https://hxlstandard.org/standard/
 */
export const HXL_TAGS = {
    // 地理
    ADM1: '#adm1',           // 一級行政區
    ADM2: '#adm2',           // 二級行政區
    ADM3: '#adm3',           // 三級行政區
    LOC: '#loc',             // 位置
    GEO_LAT: '#geo+lat',     // 緯度
    GEO_LON: '#geo+lon',     // 經度

    // 受影響人口
    AFFECTED: '#affected',
    INNEED: '#inneed',
    REACHED: '#reached',
    TARGETED: '#targeted',

    // 組織
    ORG: '#org',
    SECTOR: '#sector',
    SUBSECTOR: '#subsector',
    ACTIVITY: '#activity',

    // 日期
    DATE: '#date',
    DATE_START: '#date+start',
    DATE_END: '#date+end',

    // 人員
    POPULATION: '#population',
    BENEFICIARIES: '#beneficiaries',

    // 物資
    ITEM: '#item',
    QUANTITY: '#quantity',
    UNIT: '#unit',

    // 狀態
    STATUS: '#status',
    INDICATOR: '#indicator',
    VALUE: '#value',
} as const;

export interface HxlDataset {
    headers: string[];
    hxlTags: string[];
    data: any[][];
    metadata: {
        title: string;
        source: string;
        date: string;
        license?: string;
    };
}

export interface HxlExportOptions {
    format: 'csv' | 'json' | 'xlsx';
    includeHxlRow: boolean;
    encoding?: string;
}

/**
 * HXL Export Service
 * 
 * 提供 Humanitarian Exchange Language 標準資料匯出：
 * - 任務資料 HXL 標記
 * - 資源資料 HXL 標記
 * - 受影響人口資料
 */
@Injectable()
export class HxlExportService {
    private readonly logger = new Logger(HxlExportService.name);

    /**
     * 匯出任務資料為 HXL 格式
     */
    exportMissions(missions: any[]): HxlDataset {
        const headers = ['Mission Name', 'Location', 'Latitude', 'Longitude', 'Start Date', 'End Date', 'Status', 'Beneficiaries'];
        const hxlTags = ['#activity+name', HXL_TAGS.LOC, HXL_TAGS.GEO_LAT, HXL_TAGS.GEO_LON, HXL_TAGS.DATE_START, HXL_TAGS.DATE_END, HXL_TAGS.STATUS, HXL_TAGS.BENEFICIARIES];

        const data = missions.map(m => [
            m.name || '',
            m.location?.name || '',
            m.location?.lat || '',
            m.location?.lng || '',
            m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : '',
            m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : '',
            m.status || '',
            m.beneficiaries || 0,
        ]);

        return {
            headers,
            hxlTags,
            data,
            metadata: {
                title: 'Mission Data Export',
                source: 'Light Keepers Platform',
                date: new Date().toISOString().split('T')[0],
            },
        };
    }

    /**
     * 匯出資源資料為 HXL 格式
     */
    exportResources(resources: any[]): HxlDataset {
        const headers = ['Item', 'Quantity', 'Unit', 'Location', 'Status'];
        const hxlTags = [HXL_TAGS.ITEM, HXL_TAGS.QUANTITY, HXL_TAGS.UNIT, HXL_TAGS.LOC, HXL_TAGS.STATUS];

        const data = resources.map(r => [
            r.name || '',
            r.quantity || 0,
            r.unit || 'units',
            r.location || '',
            r.status || 'available',
        ]);

        return {
            headers,
            hxlTags,
            data,
            metadata: {
                title: 'Resource Inventory Export',
                source: 'Light Keepers Platform',
                date: new Date().toISOString().split('T')[0],
            },
        };
    }

    /**
     * 匯出 3W (Who-What-Where) 資料
     */
    export3W(activities: any[]): HxlDataset {
        const headers = ['Organization', 'Sector', 'Activity', 'Admin 1', 'Admin 2', 'Location', 'Start Date', 'End Date', 'Targeted', 'Reached'];
        const hxlTags = [HXL_TAGS.ORG, HXL_TAGS.SECTOR, HXL_TAGS.ACTIVITY, HXL_TAGS.ADM1, HXL_TAGS.ADM2, HXL_TAGS.LOC, HXL_TAGS.DATE_START, HXL_TAGS.DATE_END, HXL_TAGS.TARGETED, HXL_TAGS.REACHED];

        const data = activities.map(a => [
            a.organization || '',
            a.sector || '',
            a.activity || '',
            a.adm1 || '',
            a.adm2 || '',
            a.location || '',
            a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : '',
            a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : '',
            a.targeted || 0,
            a.reached || 0,
        ]);

        return {
            headers,
            hxlTags,
            data,
            metadata: {
                title: '3W (Who-What-Where) Export',
                source: 'Light Keepers Platform',
                date: new Date().toISOString().split('T')[0],
            },
        };
    }

    /**
     * 轉換為 CSV 格式
     */
    toCsv(dataset: HxlDataset, options: HxlExportOptions = { format: 'csv', includeHxlRow: true }): string {
        const lines: string[] = [];
        
        lines.push(dataset.headers.join(','));
        
        if (options.includeHxlRow) {
            lines.push(dataset.hxlTags.join(','));
        }

        for (const row of dataset.data) {
            lines.push(row.map(cell => {
                const str = String(cell);
                return str.includes(',') ? `"${str}"` : str;
            }).join(','));
        }

        return lines.join('\n');
    }

    /**
     * 轉換為 JSON 格式
     */
    toJson(dataset: HxlDataset): any {
        return {
            metadata: dataset.metadata,
            schema: dataset.headers.map((h, i) => ({
                name: h,
                hxlTag: dataset.hxlTags[i],
            })),
            data: dataset.data.map(row => {
                const obj: any = {};
                dataset.headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            }),
        };
    }
}
