import { IsOptional, IsArray, IsInt, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// 示警類別定義
export interface AlertTypeDefinition {
    id: number;
    name: string;
    sourceUnit: string;
    category: 'central' | 'enterprise' | 'local'; // 中央部會/事業單位/地方政府
    priority: 'core' | 'extended'; // 核心類別預設載入
}

// =============================================
// NCDR AlertType ID 對照表 (5 位數格式)
// 來源: https://alerts.ncdr.nat.gov.tw/RSS.aspx
// =============================================

// 預設核心類別 (每 10 分鐘自動同步)
// 包含常見且重要的自然災害警報
export const CORE_ALERT_TYPES: number[] = [
    10501, // 地震
    10502, // 海嘯
    10401, // 颱風
    10701, // 大雨特報
    10702, // 豪雨特報
    10601, // 低溫特報
    10604, // 高溫特報
    10602, // 陸上強風特報
    10603, // 濃霧特報
    30501, // 土石流
    40601, // 火災
];

// 自然災害類型 - 保留 7 天資料
export const NATURAL_DISASTER_TYPES: number[] = [
    10501, // 地震
    10502, // 海嘯
    10401, // 颱風
    10701, // 大雨特報
    10702, // 豪雨特報
    10601, // 低溫特報
    10604, // 高溫特報
    10602, // 陸上強風特報
    10603, // 濃霧特報
    30501, // 土石流
    20101, // 淹水警戒
    20201, // 水庫放流
    20301, // 河川高水位
    30301, // 林火
];

// 非自然災害類型 - 保留 24 小時資料
// 包括：火災、鐵路事故、道路封閉、捷運營運、停水、電力 等

// 所有示警類別定義 (使用正確的 NCDR 5 位數 ID)
export const ALERT_TYPE_DEFINITIONS: AlertTypeDefinition[] = [
    // ============ 中央氣象署 ============
    { id: 10501, name: '地震', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10502, name: '海嘯', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10401, name: '颱風', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10701, name: '大雨特報', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10702, name: '豪雨特報', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10601, name: '低溫特報', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10604, name: '高溫特報', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10602, name: '陸上強風特報', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 10603, name: '濃霧特報', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },

    // ============ 農業部 ============
    { id: 30501, name: '土石流', sourceUnit: '農業部', category: 'central', priority: 'core' },
    { id: 30301, name: '林火', sourceUnit: '林業署', category: 'central', priority: 'extended' },

    // ============ 消防署 ============
    { id: 40601, name: '火災', sourceUnit: '內政部消防署', category: 'central', priority: 'core' },

    // ============ 水利署 ============
    { id: 20101, name: '淹水警戒', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 20201, name: '水庫放流', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 20301, name: '河川高水位', sourceUnit: '水利署', category: 'central', priority: 'extended' },

    // ============ 交通部 ============
    { id: 50101, name: '鐵路事故', sourceUnit: '臺鐵公司', category: 'enterprise', priority: 'extended' },
    { id: 50201, name: '鐵路事故(高鐵)', sourceUnit: '台灣高鐵', category: 'enterprise', priority: 'extended' },
    { id: 50301, name: '道路封閉', sourceUnit: '交通部公路局', category: 'central', priority: 'extended' },
    { id: 50501, name: '捷運營運', sourceUnit: '各捷運公司', category: 'enterprise', priority: 'extended' },

    // ============ 公共設施 ============
    { id: 60101, name: '停水', sourceUnit: '自來水公司', category: 'enterprise', priority: 'extended' },
    { id: 60201, name: '電力', sourceUnit: '台灣電力公司', category: 'enterprise', priority: 'extended' },

    // ============ 其他 ============
    { id: 70101, name: '空氣品質', sourceUnit: '環境部', category: 'central', priority: 'extended' },
    { id: 80101, name: '傳染病', sourceUnit: '疾病管制署', category: 'central', priority: 'extended' },
];

export class NcdrAlertQueryDto {
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        // 支援 comma-separated 字串 (types=33,34,5) 或陣列 (types[]=33&types[]=34)
        if (typeof value === 'string') {
            return value.split(',').map(Number).filter(n => !isNaN(n));
        }
        if (Array.isArray(value)) {
            return value.map(Number).filter((n: number) => !isNaN(n));
        }
        return value;
    })
    types?: number[]; // 篩選類別 IDs

    @IsOptional()
    @IsString()
    county?: string; // 篩選縣市

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    activeOnly?: boolean; // 僅有效警報

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    withLocation?: boolean; // 僅有座標

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    offset?: number;
}

export class SyncAlertTypesDto {
    @IsArray()
    @Type(() => Number)
    typeIds: number[];
}

export class NcdrAlertResponseDto {
    id: string;
    alertId: string;
    alertTypeId: number;
    alertTypeName: string;
    title: string;
    description: string;
    severity: string;
    sourceUnit: string;
    publishedAt: Date;
    expiresAt: Date;
    sourceLink: string;
    latitude: number;
    longitude: number;
    affectedAreas: string[];
    isActive: boolean;
}
