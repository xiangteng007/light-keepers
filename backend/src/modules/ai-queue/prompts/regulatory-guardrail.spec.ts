import { REGULATORY_GUARDRAIL_ZH_TW, withRegulatoryGuardrail } from './regulatory-guardrail';

describe('法規回答護欄', () => {
    // 這幾條直接對應 A/B 實測觀察到的錯誤行為，措辭改動時測試會擋下來
    it('禁止引用未經檢索的法條／標準編號', () => {
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('沒有出現在本次提供資料中');
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('不要生成看起來合理的編號');
    });

    it('點名 GB 標準不得稱為我國規定', () => {
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('GB');
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('我國規定');
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('不具法規效力');
    });

    it('要求以台灣官方公告為準，並給出可查證的來源', () => {
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('主管機關的最新公告');
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('law.moj.gov.tw');
    });

    it('要求不確定就說不確定', () => {
        expect(REGULATORY_GUARDRAIL_ZH_TW).toContain('不確定就直說不確定');
    });

    describe('withRegulatoryGuardrail', () => {
        it('把護欄接在既有 system prompt 之後', () => {
            const combined = withRegulatoryGuardrail('你是災難應變助手。');
            expect(combined.startsWith('你是災難應變助手。')).toBe(true);
            expect(combined).toContain(REGULATORY_GUARDRAIL_ZH_TW);
        });

        it('沒有既有 prompt 時只回護欄，不留空行', () => {
            expect(withRegulatoryGuardrail()).toBe(REGULATORY_GUARDRAIL_ZH_TW);
            expect(withRegulatoryGuardrail('   ')).toBe(REGULATORY_GUARDRAIL_ZH_TW);
        });
    });
});
