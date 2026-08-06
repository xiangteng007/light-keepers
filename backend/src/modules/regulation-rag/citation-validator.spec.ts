import { validateCitations, normalizeForCompare } from './citation-validator';
import { RegulationChunk, RetrievalHit } from './regulation-rag.types';

const chunk = (over: Partial<RegulationChunk> = {}): RegulationChunk => ({
    id: 'D0080118#1',
    corpusDomain: 'tw-wartime-mobilization',
    region: 'NATIONAL',
    lawId: 'D0080118',
    lawName: '民防法',
    lawLevel: '法律',
    category: '行政 ＞ 內政部 ＞ 警政目',
    articleNo: '1',
    articleLabel: '第 1 條',
    paragraphNo: null,
    text: '為有效運用民力，發揮民間自衛自救功能，共同防護人民生命、身體、財產安全，以達平時防災救護，戰時有效支援軍事任務，特制定本法。',
    embedText: '',
    lastAmended: '2021-01-20',
    sourceUrl: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0080118&flno=1',
    contentHash: 'sha256:x',
    ...over,
});

const hits = (chunks: RegulationChunk[]): RetrievalHit[] =>
    chunks.map((c) => ({ chunk: c, score: 0.9 }));

describe('citation-validator（引用驗證：本模組的安全核心）', () => {
    describe('關卡 1：法規名白名單', () => {
        it('擋下未出現在檢索結果中的法規 —— 這正是 A/B 實測翻車的捏造模式', () => {
            const out = validateCitations(
                [{ lawName: '混凝土結構設計規範（GB 50010-2010）', articleLabel: '第 8.2.1 條', quotedText: '保護層厚度不得小於……' }],
                hits([chunk()]),
            );
            expect(out.accepted).toHaveLength(0);
            expect(out.rejected[0].reason).toBe('LAW_NOT_IN_RETRIEVAL');
        });

        it('擋下捏造的台灣規範編號（BC 3-2006）', () => {
            const out = validateCitations(
                [{ lawName: 'BC 3-2006', articleLabel: '第 4.2.1 節', quotedText: '在鹽碱土壤區域加厚保護層' }],
                hits([chunk()]),
            );
            expect(out.accepted).toHaveLength(0);
            expect(out.rejected[0].reason).toBe('LAW_NOT_IN_RETRIEVAL');
        });
    });

    describe('關卡 2：條號白名單', () => {
        it('法規對但條號不在檢索結果中 → 丟棄', () => {
            const out = validateCitations(
                [{ lawName: '民防法', articleLabel: '第 99 條', quotedText: '為有效運用民力' }],
                hits([chunk()]),
            );
            expect(out.accepted).toHaveLength(0);
            expect(out.rejected[0].reason).toBe('ARTICLE_NOT_IN_RETRIEVAL');
        });
    });

    describe('關卡 3：原文逐字比對', () => {
        it('法規與條號都對，但引文是模型自己造的句子 → 丟棄', () => {
            const out = validateCitations(
                [{ lawName: '民防法', articleLabel: '第 1 條', quotedText: '民防團隊應每年實施空襲避難演練兩次。' }],
                hits([chunk()]),
            );
            expect(out.accepted).toHaveLength(0);
            expect(out.rejected[0].reason).toBe('QUOTE_NOT_VERBATIM');
        });

        it('逐字片段（含全形標點差異）可通過', () => {
            const out = validateCitations(
                [{ lawName: '民防法', articleLabel: '第 1 條', quotedText: '以達平時防災救護，戰時有效支援軍事任務' }],
                hits([chunk()]),
            );
            expect(out.accepted).toHaveLength(1);
            expect(out.rejected).toHaveLength(0);
        });

        it('過短的引文一律丟棄（避免用「本法」兩字就過關）', () => {
            const out = validateCitations(
                [{ lawName: '民防法', articleLabel: '第 1 條', quotedText: '本法' }],
                hits([chunk()]),
            );
            expect(out.rejected[0].reason).toBe('QUOTE_TOO_SHORT');
        });
    });

    describe('輸出 metadata 一律取自 chunk，不採用模型給的值', () => {
        it('模型亂給日期與連結時，輸出仍是語料的正確值', () => {
            const out = validateCitations(
                [
                    {
                        lawName: '民防法',
                        articleLabel: '第 1 條',
                        quotedText: '共同防護人民生命、身體、財產安全',
                        // 以下欄位模型即使亂給也不會被採用（型別上根本沒讀）
                        lastAmended: '1999-01-01',
                        sourceUrl: 'https://evil.example.com',
                    } as Record<string, unknown>,
                ],
                hits([chunk()]),
            );
            expect(out.accepted[0].lastAmended).toBe('2021-01-20');
            expect(out.accepted[0].sourceUrl).toContain('law.moj.gov.tw');
            expect(out.accepted[0].regionLabel).toBe('中央（全國適用）');
        });
    });

    describe('referenceOnly 來源不得被逐字引用', () => {
        it('授權未確認的來源（基本計畫）即使被檢索到也不能當引用', () => {
            const ref = chunk({
                id: 'ref:cdprc-basic-plan',
                lawId: 'cdprc-basic-plan',
                lawName: '災害防救基本計畫',
                articleLabel: null,
                referenceOnly: true,
                text: '《災害防救基本計畫》為國家層級之災害防救計畫，由中央災害防救委員會擬訂。',
            });
            const out = validateCitations(
                [{ lawName: '災害防救基本計畫', quotedText: '為國家層級之災害防救計畫' }],
                hits([ref]),
            );
            expect(out.accepted).toHaveLength(0);
            expect(out.rejected[0].reason).toBe('LAW_NOT_IN_RETRIEVAL');
        });
    });

    describe('輸入健壯性', () => {
        it('非陣列輸入不會爆', () => {
            expect(validateCitations(null, hits([chunk()])).accepted).toHaveLength(0);
            expect(validateCitations('nope', hits([chunk()])).accepted).toHaveLength(0);
            expect(validateCitations({}, hits([chunk()])).accepted).toHaveLength(0);
        });

        it('缺欄位的引用被記為 MISSING_FIELDS', () => {
            const out = validateCitations([{ lawName: '民防法' }], hits([chunk()]));
            expect(out.rejected[0].reason).toBe('MISSING_FIELDS');
        });

        it('重複引用同一段只保留一筆', () => {
            const c = [
                { lawName: '民防法', articleLabel: '第 1 條', quotedText: '共同防護人民生命、身體、財產安全' },
                { lawName: '民防法', articleLabel: '第 1 條', quotedText: '共同防護人民生命、身體、財產安全' },
            ];
            expect(validateCitations(c, hits([chunk()])).accepted).toHaveLength(1);
        });
    });

    describe('normalizeForCompare', () => {
        it('忽略空白與全半形標點差異', () => {
            expect(normalizeForCompare('共同防護 人民 生命，身體')).toBe(
                normalizeForCompare('共同防護人民生命,身體'),
            );
        });
    });
});
