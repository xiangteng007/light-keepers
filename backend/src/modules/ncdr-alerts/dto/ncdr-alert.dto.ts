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

// 預設核心類別 (避免流量爆掉)
export const CORE_ALERT_TYPES: number[] = [33, 34, 5, 6, 37, 38, 53]; // 地震/海嘯/颱風/雷雨/降雨/土石流/火災

// 所有示警類別定義
export const ALERT_TYPE_DEFINITIONS: AlertTypeDefinition[] = [
    // 中央部會 - 核心
    { id: 33, name: '地震', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 34, name: '海嘯', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 5, name: '颱風', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 6, name: '雷雨', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 37, name: '降雨', sourceUnit: '中央氣象署', category: 'central', priority: 'core' },
    { id: 38, name: '土石流', sourceUnit: '農業部', category: 'central', priority: 'core' },
    { id: 53, name: '火災', sourceUnit: '內政部消防署', category: 'central', priority: 'core' },

    // 中央部會 - 擴展
    { id: 14, name: '低溫', sourceUnit: '中央氣象署', category: 'central', priority: 'extended' },
    { id: 15, name: '濃霧', sourceUnit: '中央氣象署', category: 'central', priority: 'extended' },
    { id: 32, name: '強風', sourceUnit: '中央氣象署', category: 'central', priority: 'extended' },
    { id: 56, name: '高溫', sourceUnit: '中央氣象署', category: 'central', priority: 'extended' },
    { id: 67, name: '火山', sourceUnit: '中央氣象署', category: 'central', priority: 'extended' },
    { id: 7, name: '淹水', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 43, name: '水庫放流', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 36, name: '河川高水位', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 48, name: '枯旱預報', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 70, name: '淹水感測', sourceUnit: '水利署', category: 'central', priority: 'extended' },
    { id: 3, name: '道路封閉', sourceUnit: '交通部公路局', category: 'central', priority: 'extended' },
    { id: 35, name: '鐵路事故', sourceUnit: '臺鐵公司', category: 'central', priority: 'extended' },
    { id: 55, name: '傳染病', sourceUnit: '疾病管制署', category: 'central', priority: 'extended' },
    { id: 12, name: '空氣品質', sourceUnit: '環境部', category: 'central', priority: 'extended' },
    { id: 52, name: '林火', sourceUnit: '林業署', category: 'central', priority: 'extended' },
    { id: 63, name: '海洋污染', sourceUnit: '海洋保育署', category: 'central', priority: 'extended' },
    { id: 50, name: '輻射災害', sourceUnit: '核能安全委員會', category: 'central', priority: 'extended' },
    { id: 62, name: '防空', sourceUnit: '內政部', category: 'central', priority: 'extended' },
    { id: 47, name: '停班停課', sourceUnit: '行政院', category: 'central', priority: 'extended' },

    // 事業單位
    { id: 65, name: '捷運營運', sourceUnit: '各捷運公司', category: 'enterprise', priority: 'extended' },
    { id: 39, name: '行動電話中斷', sourceUnit: 'NCC', category: 'enterprise', priority: 'extended' },
    { id: 44, name: '停水', sourceUnit: '自來水公司', category: 'enterprise', priority: 'extended' },
    { id: 61, name: '電力', sourceUnit: '台灣電力公司', category: 'enterprise', priority: 'extended' },
    { id: 51, name: '鐵路事故(高鐵)', sourceUnit: '台灣高鐵', category: 'enterprise', priority: 'extended' },
    { id: 66, name: '急門診通報', sourceUnit: '衛生福利部', category: 'enterprise', priority: 'extended' },

    // 地方政府
    { id: 41, name: '水門資訊', sourceUnit: '地方政府', category: 'local', priority: 'extended' },
    { id: 45, name: '水位警戒', sourceUnit: '地方政府', category: 'local', priority: 'extended' },
    { id: 19, name: '道路施工', sourceUnit: '地方政府', category: 'local', priority: 'extended' },
    { id: 4, name: '開放臨時停車', sourceUnit: '地方政府', category: 'local', priority: 'extended' },
    { id: 8, name: '強風管制(高速)', sourceUnit: '交通部高速公路局', category: 'local', priority: 'extended' },
    { id: 59, name: '高速公路事件', sourceUnit: '交通部高速公路局', category: 'local', priority: 'extended' },
    { id: 72, name: '疏散避難', sourceUnit: '內政部消防署', category: 'local', priority: 'extended' },
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
