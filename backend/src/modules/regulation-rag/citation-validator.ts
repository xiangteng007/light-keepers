/**
 * 🔴 引用驗證 —— 本模組的安全核心。
 *
 * 起因：本地模型 A/B 實測發現，法規題會引用中國 GB 標準並自稱「我國規範」，
 * 另一顆甚至捏造出不存在的規範編號（「BC 3-2006（台灣）」）。
 *
 * 對策不是靠 prompt 祈禱，而是**在程式層把關**：模型產出的每一則引用都必須
 * 通過下列驗證，對不上就整筆丟棄。這讓「捏造編號」從機制上不可能出現在輸出裡。
 *
 *   1. 白名單 —— lawName 必須出現在本次檢索結果中（模型不能引用沒檢索到的法規）
 *   2. 條號白名單 —— articleLabel 必須屬於該法規在本次檢索結果中的條號集合
 *   3. 逐字比對 —— quotedText 必須逐字出現在對應 chunk 的原文中（正規化空白後）
 *
 * 三關全過才採信。任一關失敗即丟棄該引用並計數。
 */
import { Citation, RegulationChunk, RetrievalHit, REGION_LABEL } from './regulation-rag.types';

/** 模型可能回傳的原始引用（尚未驗證，欄位皆不可信） */
export interface RawCitation {
    lawName?: unknown;
    articleLabel?: unknown;
    quotedText?: unknown;
}

export interface ValidationOutcome {
    accepted: Citation[];
    rejected: Array<{ raw: RawCitation; reason: string }>;
}

/**
 * 正規化：移除所有空白字元與常見全形／半形差異，讓逐字比對不會被排版差異誤殺，
 * 但仍然無法讓「模型自己編的句子」通過 —— 內容本身必須真的存在。
 */
export function normalizeForCompare(s: string): string {
    return s
        .replace(/[\s　]+/g, '')
        .replace(/[（]/g, '(')
        .replace(/[）]/g, ')')
        .replace(/[：]/g, ':')
        .replace(/[，]/g, ',')
        .replace(/[。]/g, '.');
}

const asString = (v: unknown): string | null =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;

/**
 * 依本次檢索結果驗證模型產出的引用。
 *
 * @param rawCitations 模型輸出的引用陣列（完全不可信）
 * @param hits         本次實際檢索到的 chunk（唯一的事實來源）
 */
export function validateCitations(
    rawCitations: unknown,
    hits: RetrievalHit[],
): ValidationOutcome {
    const accepted: Citation[] = [];
    const rejected: Array<{ raw: RawCitation; reason: string }> = [];

    if (!Array.isArray(rawCitations)) {
        return { accepted, rejected };
    }

    // 只有檢索到、且真的有原文可引的 chunk 才進白名單。
    // referenceOnly 的來源（授權未確認，僅登錄書目）不得被逐字引用。
    const quotable: RegulationChunk[] = hits
        .map((h) => h.chunk)
        .filter((c) => !c.referenceOnly);

    const seen = new Set<string>();

    for (const item of rawCitations) {
        const raw = (item ?? {}) as RawCitation;
        const lawName = asString(raw.lawName);
        const articleLabel = asString(raw.articleLabel);
        const quotedText = asString(raw.quotedText);

        if (!lawName || !quotedText) {
            rejected.push({ raw, reason: 'MISSING_FIELDS' });
            continue;
        }

        // 關卡 1：法規名白名單
        const sameLaw = quotable.filter((c) => c.lawName === lawName);
        if (sameLaw.length === 0) {
            rejected.push({ raw, reason: 'LAW_NOT_IN_RETRIEVAL' });
            continue;
        }

        // 關卡 2：條號白名單（模型有給條號時才檢；沒給就退化為只比法規＋原文）
        const candidates = articleLabel
            ? sameLaw.filter((c) => c.articleLabel === articleLabel)
            : sameLaw;
        if (candidates.length === 0) {
            rejected.push({ raw, reason: 'ARTICLE_NOT_IN_RETRIEVAL' });
            continue;
        }

        // 關卡 3：原文逐字比對
        const needle = normalizeForCompare(quotedText);
        if (needle.length < 8) {
            rejected.push({ raw, reason: 'QUOTE_TOO_SHORT' });
            continue;
        }
        const match = candidates.find((c) => normalizeForCompare(c.text).includes(needle));
        if (!match) {
            rejected.push({ raw, reason: 'QUOTE_NOT_VERBATIM' });
            continue;
        }

        const key = `${match.lawId}#${match.articleNo}#${needle}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // 採信 —— 但輸出的 metadata 一律取自 chunk，不採用模型給的值。
        accepted.push({
            lawName: match.lawName,
            articleLabel: match.articleLabel,
            quotedText: quotedText,
            lastAmended: match.lastAmended,
            sourceUrl: match.sourceUrl,
            region: match.region,
            regionLabel: REGION_LABEL[match.region] ?? match.region,
        });
    }

    return { accepted, rejected };
}
