/**
 * 災型分類法 SSOT（CD-1 / C1.1）
 * ---------------------------------------------------------------------------
 * 擴充前，八個災型值被硬編在 12 個位置（DTO 驗證 ×3、派遣技能表、標籤表、
 * LLM prompt ×2、parser validTypes ×2、關鍵字 fallback、LINE 常數、benchmark）。
 * 本檔把災型的**全部**中繼資料收斂成單一來源，之後再加災型只需改這裡。
 *
 * 設計說明與向後相容論證見 `docs/architecture/CIVIL_DEFENSE_TAXONOMY.md`。
 *
 * 向後相容硬要求：既有 8 類的 label / defaultSeverity / skills 逐字沿用擴充前
 * 的值，任何既有路徑的行為必須與擴充前相同。
 */

import { ReportSeverity, ReportType } from './reports.entity';

export interface DisasterTypeMeta {
    /** 中文標籤（既有 8 類沿用 report-dispatcher 原本的字串） */
    label: string;
    /** 未指定 severity 時的預設值。既有 8 類一律 medium＝擴充前行為 */
    defaultSeverity: ReportSeverity;
    /** 自動派遣的技能標籤（既有 8 類沿用 TYPE_TO_SKILLS 原值） */
    skills: string[];
    /** 是否為 D16 新增的民防類別 */
    civilDefense: boolean;
    /** 給 LLM prompt 的一行判準 */
    criterion: string;
    /** 應變動作提示（回覆通報者 / 派遣單附註用） */
    responseHints: string[];
}

/** 既有（天災導向）8 類——擴充前的完整清單，作為回歸基準 */
export const LEGACY_REPORT_TYPES = [
    'earthquake',
    'flood',
    'fire',
    'typhoon',
    'landslide',
    'traffic',
    'infrastructure',
    'other',
] as const satisfies readonly ReportType[];

/** D16 新增的民防類別 */
export const CIVIL_DEFENSE_REPORT_TYPES = [
    'air_raid',
    'explosion',
    'terror_attack',
    'cbrn',
] as const satisfies readonly ReportType[];

/** 全部合法災型值（DTO @IsIn / parser validTypes 的唯一來源） */
export const REPORT_TYPE_VALUES: readonly ReportType[] = [
    ...LEGACY_REPORT_TYPES,
    ...CIVIL_DEFENSE_REPORT_TYPES,
];

/**
 * 災型中繼資料。
 *
 * `Record<ReportType, …>` 是刻意的：union 加值時 TypeScript 會在這裡報錯，
 * 逼迫新增者補齊 label / severity / skills，不會出現「加了值卻沒有派遣技能」。
 */
export const DISASTER_TYPE_META: Record<ReportType, DisasterTypeMeta> = {
    // ---- 既有 8 類：label / skills / severity 皆為擴充前原值，不得更動 ----
    earthquake: {
        label: '地震',
        defaultSeverity: 'medium',
        skills: ['搜救', '救援'],
        civilDefense: false,
        criterion: '地震、震動、搖晃造成的災害',
        responseHints: ['確認建物結構安全再進入', '留意餘震', '關閉瓦斯與電源總開關'],
    },
    flood: {
        label: '水災',
        defaultSeverity: 'medium',
        skills: ['水域救援', '抽水'],
        civilDefense: false,
        criterion: '水災、淹水、積水、溢流',
        responseHints: ['勿涉水通行', '移往高處', '注意積水下的孔蓋與漏電'],
    },
    fire: {
        label: '火災',
        defaultSeverity: 'medium',
        skills: ['消防', '滅火'],
        civilDefense: false,
        criterion: '火災、燃燒、濃煙，以及民生／工業起因的氣爆（瓦斯外洩氣爆、鍋爐爆炸等火災伴生爆炸）',
        responseHints: ['低姿勢逃生並關門阻隔濃煙', '勿搭電梯', '通報後於安全處等待'],
    },
    typhoon: {
        label: '颱風',
        defaultSeverity: 'medium',
        skills: ['防災', '救援'],
        civilDefense: false,
        criterion: '颱風、強風、風災',
        responseHints: ['遠離門窗與招牌', '勿前往海邊河邊', '備妥停電停水物資'],
    },
    landslide: {
        label: '土石流',
        defaultSeverity: 'medium',
        skills: ['搜救', '重機械'],
        civilDefense: false,
        criterion: '土石流、山崩、坍方、落石、邊坡滑動',
        responseHints: ['立即撤離潛勢溪流兩側', '勿在坡腳停留', '回報道路中斷位置'],
    },
    traffic: {
        label: '交通事故',
        defaultSeverity: 'medium',
        skills: ['交通管制', '救援'],
        civilDefense: false,
        criterion: '車禍、交通事故、道路阻塞',
        responseHints: ['設置警示三角架', '勿隨意移動傷者', '回報車輛數與是否有受困'],
    },
    infrastructure: {
        label: '設施損壞',
        defaultSeverity: 'medium',
        skills: ['電氣', '工程'],
        civilDefense: false,
        criterion: '基礎設施損壞（電線桿倒塌、路面坑洞、建物損壞、管線破損、停電等）',
        responseHints: ['遠離斷落電線', '設置警示', '通報管線權責單位'],
    },
    other: {
        label: '其他',
        defaultSeverity: 'medium',
        skills: [],
        civilDefense: false,
        criterion: '其他無法明確分類的災害',
        responseHints: ['補充現場描述與照片以利研判'],
    },

    // ---- D16 新增民防類別 ----
    air_raid: {
        label: '空襲／砲擊',
        defaultSeverity: 'critical',
        skills: ['防空疏散', '搜救'],
        civilDefense: true,
        criterion:
            '空襲、防空警報、飛彈、砲擊、轟炸、無人機攻擊，或可歸因於空中攻擊的爆炸與彈著',
        responseHints: [
            '立即前往最近防空避難處所',
            '確認彈著點與二次危害（火、瓦斯、結構）',
            '人員清點並回報失聯者',
            '警報解除前不得復歸，勿在戶外聚集',
        ],
    },
    explosion: {
        label: '爆炸／爆裂物',
        defaultSeverity: 'high',
        skills: ['搜救', '消防', '緊急醫療'],
        civilDefense: true,
        criterion:
            '爆裂物、可疑包裹、不明來源的爆炸、未爆彈藥。注意：瓦斯氣爆等民生／工業起因的爆炸屬於 fire，不屬於本類',
        responseHints: [
            '劃設警戒半徑並疏散，不得接近或移動可疑物',
            '現場關閉無線電與手機發射（遙控起爆風險）',
            '通報警方排爆單位',
            '搜索二次裝置（針對到場人員的攻擊模式）',
            '傷患檢傷並保存現場證物',
        ],
    },
    terror_attack: {
        label: '恐怖攻擊',
        defaultSeverity: 'critical',
        skills: ['治安協防', '緊急醫療'],
        civilDefense: true,
        criterion:
            '有組織攻擊意圖的事件：槍擊、持刀砍人、車輛衝撞人群、挾持人質、多點同時攻擊、攻擊者宣稱訴求。情資不足時應保守判為 explosion 而非本類',
        responseHints: [
            'Run–Hide–Tell：先避難再通報，勿趨近現場',
            '現場肅清前救護人員於警方指定集結點待命',
            '回報攻擊者人數／方向／武器／衣著',
            '穿刺與槍創優先止血帶與 MARCH 流程',
        ],
    },
    cbrn: {
        label: '化生放核',
        defaultSeverity: 'critical',
        skills: ['除污', '防護裝備', '緊急醫療'],
        civilDefense: true,
        criterion:
            '化學／生物／放射／核事件：不明刺鼻氣體致多人不適、不明白色粉末、輻射警報、化學槽車洩漏、核設施事故',
        responseHints: [
            '往上風、上坡、上游處撤離',
            '未著防護裝備者不得進入，先劃管制區',
            '除污站優先於後送（未除污傷患會污染救護車與醫院）',
            '回報氣味／顏色／來源方向／風向',
        ],
    },
};

/**
 * 大量傷患（MCI）— 跨災型旗標，不是互斥類別。
 * 取捨論證見 CIVIL_DEFENSE_TAXONOMY.md §2.2。
 */
export const MASS_CASUALTY_META = {
    label: '大量傷患',
    /** 協會層級的概估門檻；正式 MCI 定義由 CD-3 訂 */
    thresholdCasualties: 5,
    responseHints: [
        '設檢傷站，執行 START／JumpSTART 分類（紅／黃／綠／黑）',
        '回報概估傷患數與最重傷勢，不逐一詳述',
        '請求增援救護車並查詢醫院容量',
        '建立傷患追蹤編號（掛牌→後送→醫院）',
    ],
} as const;

/**
 * 民防「強訊號」關鍵字——LLM 全滅時的 fallback 第一階段。
 *
 * 這組詞彙與既有 8 類的關鍵字表**完全無交集**（刻意避開 `爆炸`、`倒塌`、`火`
 * 等既有詞），因此任何只含既有關鍵字的文本，比對結果與擴充前完全相同。
 */
export const CIVIL_DEFENSE_KEYWORDS: Record<
    (typeof CIVIL_DEFENSE_REPORT_TYPES)[number],
    string[]
> = {
    air_raid: [
        '空襲', '防空警報', '空襲警報', '飛彈', '飛彈警報', '砲擊', '砲彈',
        '轟炸', '空爆', '無人機攻擊', '敵機',
    ],
    explosion: [
        '爆裂物', '可疑包裹', '可疑物品', '不明爆炸', '炸彈', '未爆彈',
        '土製炸彈', '爆裂裝置', '無人認領行李',
    ],
    terror_attack: [
        '恐攻', '恐怖攻擊', '槍擊', '開槍', '槍手', '持刀', '砍人', '挾持',
        '人質', '無差別攻擊', '衝撞人群', '劫持',
    ],
    cbrn: [
        '化學攻擊', '毒氣', '神經毒', '輻射', '核災', '核輻射', '生化',
        '白色粉末', '不明粉末', '刺鼻氣體', '化學物質外洩', '除污',
    ],
};

/** 大量傷患旗標的關鍵字（與災型分開比對，可同時成立） */
export const MASS_CASUALTY_KEYWORDS: string[] = [
    '大量傷患', '很多人受傷', '傷患很多', '一堆人倒', '多人受傷',
    '集體中毒', '多人不適', '救護車不夠', '死傷慘重', '很多人倒地',
];

/** 型別守衛：外部字串是否為合法災型 */
export function isReportType(value: unknown): value is ReportType {
    return typeof value === 'string' && (REPORT_TYPE_VALUES as readonly string[]).includes(value);
}

/** 取得災型的預設 severity（未知值一律回 medium＝擴充前行為） */
export function getDefaultSeverity(type: ReportType | string | undefined): ReportSeverity {
    if (isReportType(type)) {
        return DISASTER_TYPE_META[type].defaultSeverity;
    }
    return 'medium';
}

/** 取得災型中文標籤 */
export function getDisasterTypeLabel(type: ReportType | string | undefined): string {
    return isReportType(type) ? DISASTER_TYPE_META[type].label : '其他';
}

/**
 * 民防強訊號關鍵字比對（fallback 第一階段）。
 * 命中回傳災型，未命中回傳 null 讓呼叫端往既有 patterns 走。
 */
export function detectCivilDefenseType(text: string): ReportType | null {
    const lower = text.toLowerCase();
    for (const type of CIVIL_DEFENSE_REPORT_TYPES) {
        if (CIVIL_DEFENSE_KEYWORDS[type].some((kw) => lower.includes(kw))) {
            return type;
        }
    }
    return null;
}

/** 大量傷患關鍵字比對（與災型正交） */
export function detectMassCasualty(text: string): boolean {
    const lower = text.toLowerCase();
    return MASS_CASUALTY_KEYWORDS.some((kw) => lower.includes(kw));
}
