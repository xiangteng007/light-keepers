/**
 * 台灣災防／戰時動員法規 RAG —— 型別與常數
 *
 * 設計不變量（見 docs/LK_DISASTER_REG_RAG_PLAN.md）：
 *  1. domain 隔離：法規語料與 manuals 完全分離，manuals 行為零改動
 *  2. 引用驗證在程式層，不信任模型輸出
 *  3. 查無資料一律 answerable=false，不得輸出任何條號
 */

/** 語料領域。查詢時為**必填**，型別層強制，避免誤跨 domain 檢索。 */
export enum RegulationDomain {
    /** 災害防救（災防法、施行細則、消防法…） */
    DISASTER = 'tw-disaster-regulation',
    /** 戰時動員／民防（民防法、全民防衛動員準備法…） */
    WARTIME = 'tw-wartime-mobilization',
}

/** 區域。中央法規為 NATIONAL（全國適用）；地方帶縣市代碼。 */
export enum RegulationRegion {
    NATIONAL = 'NATIONAL',
    TPE = 'TPE',
    NWT = 'NWT',
    TYC = 'TYC',
    TXG = 'TXG',
    TNN = 'TNN',
    KHH = 'KHH',
    HUA = 'HUA',
}

/**
 * 來源性質。**法規與計畫是兩種東西，不可混為一談**：
 * 法規有法律效力、在全國法規資料庫、採開放授權；
 * 計畫是依法擬訂的行政計畫，散在各機關網站，授權需個案確認。
 */
export enum SourceType {
    REGULATION = 'regulation',
    PLAN = 'plan',
}

/**
 * 災害防救計畫的三層階層 —— 直接來自災害防救法本文，不是我們自訂的分類：
 *
 *  §17 基本計畫：中央災害防救委員會擬訂 → 中央災害防救會報核定 → 行政院函送
 *  §19 業務計畫：①公共事業擬訂→中央目的事業主管機關核定
 *               ②中央災害防救業務主管機關擬訂→中央災害防救會報核定
 *  §20 地區計畫：①直轄市、縣（市）政府 ②鄉（鎮、市）、山地原住民區公所
 *               且明定**下級不得牴觸上級**（§20 II、V）
 *
 * 檢討週期依施行細則不同層級不同（見 PLAN_REVIEW_CYCLE_YEARS）。
 */
export enum PlanLevel {
    /** 災害防救基本計畫（全國上位） */
    BASIC = 'basic-plan',
    /** 災害防救業務計畫（中央各部會／公共事業，按災種） */
    OPERATIONAL = 'operational-plan',
    /** 地區災害防救計畫（直轄市縣市／鄉鎮市、山地原住民區） */
    REGIONAL = 'regional-plan',
}

/**
 * 各層計畫的法定檢討週期（年）。
 * 基本計畫 5 年：施行細則 §6（依本法 §17 II）
 * 業務計畫 2 年：施行細則 §7
 * 地區計畫 2 年：施行細則 §8
 *
 * ⚠ 母法 §17 只寫「應定期檢討」，**沒有寫五年** —— 五年是施行細則 §6 才定的。
 * 引用時務必分清法源，別把細則的規定講成母法的規定。
 */
export const PLAN_REVIEW_CYCLE_YEARS: Record<PlanLevel, number> = {
    [PlanLevel.BASIC]: 5,
    [PlanLevel.OPERATIONAL]: 2,
    [PlanLevel.REGIONAL]: 2,
};

/**
 * 計畫內容四範疇。語出施行細則 §6 檢討事項與本法 §18 計畫內容規定。
 * （owner 摘要作「三大範疇」把應變與復原併稱；法條文字為四項並列，此處依法條。）
 */
export enum ScopeTag {
    MITIGATION = 'mitigation', // 減災
    PREPAREDNESS = 'preparedness', // 整備
    RESPONSE = 'response', // 災害應變
    RECOVERY = 'recovery', // 災後復原重建
}

export const SCOPE_TAG_LABEL: Record<ScopeTag, string> = {
    [ScopeTag.MITIGATION]: '減災',
    [ScopeTag.PREPAREDNESS]: '整備',
    [ScopeTag.RESPONSE]: '災害應變',
    [ScopeTag.RECOVERY]: '災後復原重建',
};

export const PLAN_LEVEL_LABEL: Record<PlanLevel, string> = {
    [PlanLevel.BASIC]: '災害防救基本計畫（全國上位）',
    [PlanLevel.OPERATIONAL]: '災害防救業務計畫（中央各部會／公共事業）',
    [PlanLevel.REGIONAL]: '地區災害防救計畫（直轄市縣市／鄉鎮市）',
};

export const REGION_LABEL: Record<string, string> = {
    NATIONAL: '中央（全國適用）',
    TPE: '臺北市',
    NWT: '新北市',
    TYC: '桃園市',
    TXG: '臺中市',
    TNN: '臺南市',
    KHH: '高雄市',
    HUA: '花蓮縣',
};

export interface RegulationChunk {
    id: string;
    corpusDomain: string;
    /** 直轄市／縣（市）層級，或 NATIONAL */
    region: string;
    /** 鄉（鎮、市）、山地原住民區層級（地區計畫第二級，§20 IV）。無則 null。 */
    subRegion?: string | null;
    /** 法規 or 計畫 —— 兩者授權與效力完全不同，不可混 */
    sourceType?: SourceType;
    /** 僅計畫類有值：屬三層階層的哪一層 */
    planLevel?: PlanLevel | null;
    /** 僅計畫類有值：版本，例「113-117」 */
    planVersion?: string | null;
    /** 僅計畫類有值：法定檢討週期（年） */
    reviewCycleYears?: number | null;
    /** 內容範疇標籤（減災／整備／應變／復原重建） */
    scopeTags?: ScopeTag[];
    /** 計畫的法源條文，例「災害防救法第 17 條」 */
    legalBasis?: string | null;
    lawId: string;
    lawName: string;
    lawLevel: string;
    category: string | null;
    articleNo: string | null;
    articleLabel: string | null;
    paragraphNo: string | null;
    /** 條文原文，逐字，不改寫 */
    text: string;
    /** 送去 embedding 的文字（含法規名與條號前綴） */
    embedText: string;
    lastAmended: string | null;
    sourceUrl: string;
    contentHash: string;
    /** true 代表僅登錄書目與連結、未重製內文（授權未確認的來源） */
    referenceOnly?: boolean;
    licenceNote?: string;
    vector?: number[];
}

export interface RegulationCorpus {
    schemaVersion: number;
    attribution: string;
    embedModel: string | null;
    embedDim: number | null;
    ingestedAt: string;
    sourceReport: Array<Record<string, unknown>>;
    chunks: RegulationChunk[];
}

export interface RetrievalHit {
    chunk: RegulationChunk;
    /** cosine 相似度，0–1 */
    score: number;
}

export interface RetrievalOptions {
    /** 必填 —— domain 隔離的型別層防線 */
    domain: RegulationDomain;
    /** 使用者所在縣市。帶了就回「該縣市 + 中央」，不帶只回中央。 */
    region?: RegulationRegion;
    topK?: number;
}

/**
 * 相似度門檻。低於此值視同查無 —— 災防場景寧可多說幾次「查無」，
 * 也不要給錯條號。實際值由 P4 評測集校準。
 */
export const MIN_SIMILARITY = 0.45;

/**
 * 語料時效警語門檻（天）。超過即在回答附註提醒使用者自行核對官方最新版本。
 */
export const STALENESS_WARN_DAYS = 180;

/**
 * 🔴 免責聲明 —— **固定字串，不由模型生成**。
 *
 * ⚠ owner 待審：本措辭由工程端擬定保守版本，涉及法律責任，
 *   請法務／owner 覆核後定稿。修改此常數即全站生效。
 */
export const DISCLAIMER =
    '【免責聲明】本回答由系統依公開法規語料檢索整理，僅供參考，不構成法律意見，' +
    '亦不得作為緊急應變之唯一依據。法規可能業經修正，實際效力應以主管機關公告之' +
    '現行條文為準；災害或戰時情境之處置，應以中央及地方主管機關之最新公告、' +
    '現場指揮官指示與專業人員判斷為優先。如涉人身安全，請立即撥打 119／110。';

export interface Citation {
    lawName: string;
    articleLabel: string | null;
    quotedText: string;
    lastAmended: string | null;
    sourceUrl: string;
    region: string;
    regionLabel: string;
}

export interface RegulationAnswer {
    answerable: boolean;
    domain: RegulationDomain;
    region: RegulationRegion | null;
    citations: Citation[];
    plainExplanation: string | null;
    /** 未採信而被丟棄的引用數（引用驗證擋下的） */
    rejectedCitations: number;
    notice: string | null;
    disclaimer: string;
    attribution: string;
    processingTimeMs: number;
}
