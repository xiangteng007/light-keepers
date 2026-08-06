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

/** 區域。中央法規為 NATIONAL（全國適用）；地方自治法規帶縣市代碼。 */
export enum RegulationRegion {
    NATIONAL = 'NATIONAL',
    TPE = 'TPE',
    NWT = 'NWT',
    TXG = 'TXG',
    KHH = 'KHH',
    HUA = 'HUA',
}

export const REGION_LABEL: Record<string, string> = {
    NATIONAL: '中央（全國適用）',
    TPE: '臺北市',
    NWT: '新北市',
    TXG: '臺中市',
    KHH: '高雄市',
    HUA: '花蓮縣',
};

export interface RegulationChunk {
    id: string;
    corpusDomain: string;
    region: string;
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
