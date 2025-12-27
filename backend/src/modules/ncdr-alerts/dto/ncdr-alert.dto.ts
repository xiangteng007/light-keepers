import { IsOptional, IsArray, IsInt, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// 示警類別定義
export interface AlertTypeDefinition {
    id: number;
    name: string;
    sourceUnit: string;
    category: 'central' | 'enterprise' | 'local'; // 中央部會/事業單位/地方政府
    isNaturalDisaster: boolean; // 是否為自然災害 (影響資料保留時間)
}

// =============================================
// NCDR AlertType ID 對照表
// 來源: https://alerts.ncdr.nat.gov.tw/RSS.aspx
// 更新時間: 2024-12-27
// =============================================

// ============ 中央部會 AlertType IDs ============
export const CENTRAL_ALERT_TYPES: number[] = [
    5,      // 颱風(中央氣象署)
    6,      // 地震(中央氣象署)
    7,      // 海嘯(中央氣象署)
    8,      // 淹水(水利署)
    9,      // 土石流及大規模崩塌(農業部農村發展及水土保持署)
    10,     // 降雨(中央氣象署)
    11,     // 河川高水位(水利署)
    12,     // 水庫放流(水利署)
    13,     // 道路封閉(交通部公路局)
    33,     // 停班停課(行政院人事行政總處)
    1047,   // 防空(內政部警政署民防指揮管制所)
    1051,   // 雷雨(中央氣象署)
    1053,   // 傳染病(疾病管制署)
    1060,   // 低溫(中央氣象署)
    1061,   // 強風(中央氣象署)
    1062,   // 濃霧(中央氣象署)
    1075,   // 市話通訊中斷(國家通訊傳播委員會)
    1076,   // 行動電話中斷(國家通訊傳播委員會)
    1078,   // 空氣品質(環境部)
    1087,   // 火災(內政部消防署)
    1093,   // 林火危險度預警(農業部林業及自然保育署)
    2098,   // 分洪警報(水利署第十河川分署)
    2099,   // 枯旱預警(水利署)
    2102,   // 疏散避難(內政部消防署)
    2104,   // 輻射災害(核能安全委員會)
    2107,   // 高溫(中央氣象署)
    2108,   // 火山(中央氣象署)
    2115,   // 交流道下地方連絡道淹水(交通部高速公路局)
    2116,   // 強風管制路段(交通部高速公路局)
    2118,   // 海洋污染(海洋保育署)
    2119,   // 海灘水質(海洋保育署)
    2121,   // 鐵路事故(阿里山林業鐵路及文化資產管理處)
    2142,   // 急門診通報(衛生福利部)
    2158,   // 消防安全檢查重大不合格場所(內政部消防署)
    3153,   // 高速公路路況事件(交通部高速公路局)
    100013, // 濃霧(日月潭國家風景區管理處)
    100014, // 堰塞湖警戒(農業部林業及自然保育署)
    100018, // 國家公園入園示警(營建署)
    104048, // 國家森林遊樂區(農業部林業及自然保育署)
    104051, // 淹水感測(水利署)
];

// ============ 事業單位 AlertType IDs ============
export const ENTERPRISE_ALERT_TYPES: number[] = [
    32,     // 鐵路事故(台灣高速鐵路股份有限公司)
    34,     // 鐵路事故(臺鐵公司)
    1080,   // 電力中斷(台灣電力公司)
    1085,   // 停水(臺北自來水事業處)
    1089,   // 停水(台灣自來水公司)
    2134,   // 捷運營運(臺中捷運股份有限公司)
    2135,   // 捷運營運(臺北大眾捷運股份有限公司)
    2139,   // 捷運營運(高雄捷運股份有限公司)
    2141,   // 捷運營運(新北大眾捷運股份有限公司)
    100016, // 捷運營運(桃園大眾捷運股份有限公司)
];

// ============ 地方政府 AlertType IDs ============
export const LOCAL_ALERT_TYPES: number[] = [
    1057,   // 開放路邊停車(臺北市政府)
    1059,   // 水門資訊(臺北市政府)
    1066,   // 水位警戒(臺中市水利局)
    1091,   // 水位警示(桃園市政府)
    2101,   // 區排警戒(臺南市政府)
    2109,   // 道路施工(臺中市政府建設局)
    2112,   // 道路施工(臺北市政府工務局)
    4153,   // 開放路邊停車(新北市政府)
    100003, // 開放臨時停車(高雄市政府)
    100005, // 水門資訊(新北市政府)
    100020, // 地下道積淹水(新竹市消防局)
];

// 所有 AlertType IDs (合併)
export const ALL_ALERT_TYPES: number[] = [
    ...CENTRAL_ALERT_TYPES,
    ...ENTERPRISE_ALERT_TYPES,
    ...LOCAL_ALERT_TYPES,
];

// 自然災害類型 - 保留 7 天資料
export const NATURAL_DISASTER_TYPES: number[] = [
    5,      // 颱風
    6,      // 地震
    7,      // 海嘯
    8,      // 淹水
    9,      // 土石流及大規模崩塌
    10,     // 降雨
    11,     // 河川高水位
    12,     // 水庫放流
    1051,   // 雷雨
    1060,   // 低溫
    1061,   // 強風
    1062,   // 濃霧
    1093,   // 林火危險度預警
    2098,   // 分洪警報
    2099,   // 枯旱預警
    2107,   // 高溫
    2108,   // 火山
    2115,   // 交流道下地方連絡道淹水
    100013, // 濃霧(日月潭)
    100014, // 堰塞湖警戒
    104051, // 淹水感測
    1066,   // 水位警戒
    1091,   // 水位警示
    2101,   // 區排警戒
];

// 核心警報類型 (每 10 分鐘自動同步)
export const CORE_ALERT_TYPES: number[] = [
    // 中央氣象署
    5,      // 颱風
    6,      // 地震
    7,      // 海嘯
    10,     // 降雨
    1051,   // 雷雨
    1060,   // 低溫
    1061,   // 強風
    1062,   // 濃霧
    2107,   // 高溫
    // 水利署
    8,      // 淹水
    11,     // 河川高水位
    12,     // 水庫放流
    // 農業部
    9,      // 土石流
    // 消防署
    1087,   // 火災
    2102,   // 疏散避難
    // 交通
    13,     // 道路封閉
    // 其他重要
    33,     // 停班停課
    1053,   // 傳染病
];

// 所有示警類別定義
export const ALERT_TYPE_DEFINITIONS: AlertTypeDefinition[] = [
    // ============ 中央部會 ============
    { id: 5, name: '颱風', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 6, name: '地震', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 7, name: '海嘯', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 8, name: '淹水', sourceUnit: '水利署', category: 'central', isNaturalDisaster: true },
    { id: 9, name: '土石流及大規模崩塌', sourceUnit: '農業部農村發展及水土保持署', category: 'central', isNaturalDisaster: true },
    { id: 10, name: '降雨', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 11, name: '河川高水位', sourceUnit: '水利署', category: 'central', isNaturalDisaster: true },
    { id: 12, name: '水庫放流', sourceUnit: '水利署', category: 'central', isNaturalDisaster: true },
    { id: 13, name: '道路封閉', sourceUnit: '交通部公路局', category: 'central', isNaturalDisaster: false },
    { id: 33, name: '停班停課', sourceUnit: '行政院人事行政總處', category: 'central', isNaturalDisaster: false },
    { id: 1047, name: '防空', sourceUnit: '內政部警政署民防指揮管制所', category: 'central', isNaturalDisaster: false },
    { id: 1051, name: '雷雨', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 1053, name: '傳染病', sourceUnit: '疾病管制署', category: 'central', isNaturalDisaster: false },
    { id: 1060, name: '低溫', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 1061, name: '強風', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 1062, name: '濃霧', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 1075, name: '市話通訊中斷', sourceUnit: '國家通訊傳播委員會', category: 'central', isNaturalDisaster: false },
    { id: 1076, name: '行動電話中斷', sourceUnit: '國家通訊傳播委員會', category: 'central', isNaturalDisaster: false },
    { id: 1078, name: '空氣品質', sourceUnit: '環境部', category: 'central', isNaturalDisaster: false },
    { id: 1087, name: '火災', sourceUnit: '內政部消防署', category: 'central', isNaturalDisaster: false },
    { id: 1093, name: '林火危險度預警', sourceUnit: '農業部林業及自然保育署', category: 'central', isNaturalDisaster: true },
    { id: 2098, name: '分洪警報', sourceUnit: '水利署第十河川分署', category: 'central', isNaturalDisaster: true },
    { id: 2099, name: '枯旱預警', sourceUnit: '水利署', category: 'central', isNaturalDisaster: true },
    { id: 2102, name: '疏散避難', sourceUnit: '內政部消防署', category: 'central', isNaturalDisaster: false },
    { id: 2104, name: '輻射災害', sourceUnit: '核能安全委員會', category: 'central', isNaturalDisaster: false },
    { id: 2107, name: '高溫', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 2108, name: '火山', sourceUnit: '中央氣象署', category: 'central', isNaturalDisaster: true },
    { id: 2115, name: '交流道下地方連絡道淹水', sourceUnit: '交通部高速公路局', category: 'central', isNaturalDisaster: true },
    { id: 2116, name: '強風管制路段', sourceUnit: '交通部高速公路局', category: 'central', isNaturalDisaster: false },
    { id: 2118, name: '海洋污染', sourceUnit: '海洋保育署', category: 'central', isNaturalDisaster: false },
    { id: 2119, name: '海灘水質', sourceUnit: '海洋保育署', category: 'central', isNaturalDisaster: false },
    { id: 2121, name: '鐵路事故', sourceUnit: '阿里山林業鐵路及文化資產管理處', category: 'central', isNaturalDisaster: false },
    { id: 2142, name: '急門診通報', sourceUnit: '衛生福利部', category: 'central', isNaturalDisaster: false },
    { id: 2158, name: '消防安全檢查重大不合格場所', sourceUnit: '內政部消防署', category: 'central', isNaturalDisaster: false },
    { id: 3153, name: '高速公路路況事件', sourceUnit: '交通部高速公路局', category: 'central', isNaturalDisaster: false },
    { id: 100013, name: '濃霧', sourceUnit: '日月潭國家風景區管理處', category: 'central', isNaturalDisaster: true },
    { id: 100014, name: '堰塞湖警戒', sourceUnit: '農業部林業及自然保育署', category: 'central', isNaturalDisaster: true },
    { id: 100018, name: '國家公園入園示警', sourceUnit: '營建署', category: 'central', isNaturalDisaster: false },
    { id: 104048, name: '國家森林遊樂區', sourceUnit: '農業部林業及自然保育署', category: 'central', isNaturalDisaster: false },
    { id: 104051, name: '淹水感測', sourceUnit: '水利署', category: 'central', isNaturalDisaster: true },

    // ============ 事業單位 ============
    { id: 32, name: '鐵路事故', sourceUnit: '台灣高速鐵路股份有限公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 34, name: '鐵路事故', sourceUnit: '臺鐵公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 1080, name: '電力中斷', sourceUnit: '台灣電力公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 1085, name: '停水', sourceUnit: '臺北自來水事業處', category: 'enterprise', isNaturalDisaster: false },
    { id: 1089, name: '停水', sourceUnit: '台灣自來水公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 2134, name: '捷運營運', sourceUnit: '臺中捷運股份有限公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 2135, name: '捷運營運', sourceUnit: '臺北大眾捷運股份有限公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 2139, name: '捷運營運', sourceUnit: '高雄捷運股份有限公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 2141, name: '捷運營運', sourceUnit: '新北大眾捷運股份有限公司', category: 'enterprise', isNaturalDisaster: false },
    { id: 100016, name: '捷運營運', sourceUnit: '桃園大眾捷運股份有限公司', category: 'enterprise', isNaturalDisaster: false },

    // ============ 地方政府 ============
    { id: 1057, name: '開放路邊停車', sourceUnit: '臺北市政府', category: 'local', isNaturalDisaster: false },
    { id: 1059, name: '水門資訊', sourceUnit: '臺北市政府', category: 'local', isNaturalDisaster: false },
    { id: 1066, name: '水位警戒', sourceUnit: '臺中市水利局', category: 'local', isNaturalDisaster: true },
    { id: 1091, name: '水位警示', sourceUnit: '桃園市政府', category: 'local', isNaturalDisaster: true },
    { id: 2101, name: '區排警戒', sourceUnit: '臺南市政府', category: 'local', isNaturalDisaster: true },
    { id: 2109, name: '道路施工', sourceUnit: '臺中市政府建設局', category: 'local', isNaturalDisaster: false },
    { id: 2112, name: '道路施工', sourceUnit: '臺北市政府工務局', category: 'local', isNaturalDisaster: false },
    { id: 4153, name: '開放路邊停車', sourceUnit: '新北市政府', category: 'local', isNaturalDisaster: false },
    { id: 100003, name: '開放臨時停車', sourceUnit: '高雄市政府', category: 'local', isNaturalDisaster: false },
    { id: 100005, name: '水門資訊', sourceUnit: '新北市政府', category: 'local', isNaturalDisaster: false },
    { id: 100020, name: '地下道積淹水', sourceUnit: '新竹市消防局', category: 'local', isNaturalDisaster: true },
];

// 根據 AlertType ID 獲取類別
export function getAlertCategory(alertTypeId: number): 'central' | 'enterprise' | 'local' {
    if (CENTRAL_ALERT_TYPES.includes(alertTypeId)) return 'central';
    if (ENTERPRISE_ALERT_TYPES.includes(alertTypeId)) return 'enterprise';
    if (LOCAL_ALERT_TYPES.includes(alertTypeId)) return 'local';
    return 'central'; // 預設為中央部會
}

// 根據 AlertType ID 判斷是否為自然災害
export function isNaturalDisaster(alertTypeId: number): boolean {
    return NATURAL_DISASTER_TYPES.includes(alertTypeId);
}

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
    category?: 'central' | 'enterprise' | 'local'; // 篩選分類

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
    category: 'central' | 'enterprise' | 'local';
}
