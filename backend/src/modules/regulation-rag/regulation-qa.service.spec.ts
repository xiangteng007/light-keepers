import { RegulationQaService } from './regulation-qa.service';
import { RegulationCorpusService } from './regulation-corpus.service';
import { RegulationChunk, RegulationDomain, RetrievalHit, DISCLAIMER } from './regulation-rag.types';

const chunk = (over: Partial<RegulationChunk> = {}): RegulationChunk => ({
    id: 'D0120014#22',
    corpusDomain: RegulationDomain.DISASTER,
    region: 'NATIONAL',
    lawId: 'D0120014',
    lawName: '災害防救法',
    lawLevel: '法律',
    category: null,
    articleNo: '22',
    articleLabel: '第 22 條',
    paragraphNo: null,
    text: '為減少災害發生或防止災害擴大，各級政府平時應依權責實施災害預防事項。',
    embedText: '',
    lastAmended: '2025-05-28',
    sourceUrl: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0120014&flno=22',
    contentHash: 'sha256:x',
    ...over,
});

function makeCorpus(hits: RetrievalHit[], ready = true): RegulationCorpusService {
    return {
        isReady: () => ready,
        attribution: '資料來源：全國法規資料庫（法務部）',
        search: jest.fn().mockResolvedValue(hits),
        stalestAmendmentDays: () => 10,
        referenceOnlySources: () => [],
        sourceReport: [],
    } as unknown as RegulationCorpusService;
}

const llmReturning = (text: string) =>
    ({ isAvailable: () => true, generateText: jest.fn().mockResolvedValue({ text }) }) as never;

describe('RegulationQaService', () => {
    const ask = { domain: RegulationDomain.DISASTER };

    it('語料未就緒 → answerable=false 且不輸出任何條號', async () => {
        const svc = new RegulationQaService(makeCorpus([], false));
        const r = await svc.ask('災害預防怎麼規定', ask);
        expect(r.answerable).toBe(false);
        expect(r.citations).toHaveLength(0);
    });

    it('🔴 陷阱題：檢索不到 → answerable=false，不呼叫 LLM，不吐條號', async () => {
        const llm = llmReturning('{}');
        const svc = new RegulationQaService(makeCorpus([]), llm);
        const r = await svc.ask('RC 結構鋼筋保護層不足的風險，依規範簡述', ask);

        expect(r.answerable).toBe(false);
        expect(r.citations).toHaveLength(0);
        expect(r.notice).toContain('查無');
        expect(r.notice).toContain('law.moj.gov.tw');
        // 沒有檢索結果就不該浪費資源呼叫模型，也就沒有捏造的機會
        expect((llm as unknown as { generateText: jest.Mock }).generateText).not.toHaveBeenCalled();
    });

    it('🔴 模型捏造引用 → 全數被驗證擋下 → 降級為 answerable=false', async () => {
        const llm = llmReturning(
            JSON.stringify({
                citations: [
                    { lawName: '混凝土結構設計規範', articleLabel: '第 8.2.1 條', quotedText: '保護層厚度不得小於 20mm' },
                ],
                plainExplanation: '依規範保護層應足夠。',
            }),
        );
        const svc = new RegulationQaService(makeCorpus([{ chunk: chunk(), score: 0.8 }]), llm);
        const r = await svc.ask('保護層規範', ask);

        expect(r.answerable).toBe(false);
        expect(r.citations).toHaveLength(0);
        expect(r.rejectedCitations).toBe(1);
        expect(r.plainExplanation).toBeNull();
    });

    it('模型正確逐字引用 → 採信，且 metadata 取自語料', async () => {
        const llm = llmReturning(
            '```json\n' +
                JSON.stringify({
                    citations: [
                        {
                            lawName: '災害防救法',
                            articleLabel: '第 22 條',
                            quotedText: '各級政府平時應依權責實施災害預防事項',
                        },
                    ],
                    plainExplanation: '各級政府平時就要做災害預防。',
                }) +
                '\n```',
        );
        const svc = new RegulationQaService(makeCorpus([{ chunk: chunk(), score: 0.8 }]), llm);
        const r = await svc.ask('災害預防由誰負責', ask);

        expect(r.answerable).toBe(true);
        expect(r.citations).toHaveLength(1);
        expect(r.citations[0].sourceUrl).toContain('pcode=D0120014&flno=22');
        expect(r.citations[0].lastAmended).toBe('2025-05-28');
        expect(r.plainExplanation).toContain('災害預防');
    });

    it('LLM 不可用但檢索有結果 → 仍回原文，並明示無白話說明', async () => {
        const svc = new RegulationQaService(makeCorpus([{ chunk: chunk(), score: 0.8 }]), {
            isAvailable: () => false,
        } as never);
        const r = await svc.ask('災害預防', ask);

        expect(r.answerable).toBe(true);
        expect(r.citations).toHaveLength(1);
        expect(r.plainExplanation).toBeNull();
        expect(r.notice).toContain('AI 服務目前不可用');
    });

    it('LLM 拋錯不會讓整個請求失敗，降級為查無', async () => {
        const llm = {
            isAvailable: () => true,
            generateText: jest.fn().mockRejectedValue(new Error('timeout')),
        } as never;
        const svc = new RegulationQaService(makeCorpus([{ chunk: chunk(), score: 0.8 }]), llm);
        const r = await svc.ask('災害預防', ask);
        expect(r.answerable).toBe(false);
        expect(r.citations).toHaveLength(0);
    });

    it('每則回答都必帶免責聲明與出處標示', async () => {
        const svc = new RegulationQaService(makeCorpus([]));
        const r = await svc.ask('任何問題', ask);
        expect(r.disclaimer).toBe(DISCLAIMER);
        expect(r.disclaimer).toContain('不構成法律意見');
        expect(r.attribution).toContain('全國法規資料庫');
    });

    it('domain 會原樣傳給檢索層（domain 隔離）', async () => {
        const corpus = makeCorpus([]);
        const svc = new RegulationQaService(corpus);
        await svc.ask('動員準備', { domain: RegulationDomain.WARTIME });
        expect(corpus.search).toHaveBeenCalledWith(
            '動員準備',
            expect.objectContaining({ domain: RegulationDomain.WARTIME }),
        );
    });
});
