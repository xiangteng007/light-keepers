import { DEFAULT_CASES, extractClassification, main } from './llm-benchmark';

describe('llm-benchmark', () => {
    describe('DEFAULT_CASES', () => {
        it('covers every supported disaster type', () => {
            const types = new Set(DEFAULT_CASES.map((c) => c.expected));
            for (const expected of [
                'earthquake', 'flood', 'fire', 'typhoon',
                'landslide', 'traffic', 'infrastructure', 'other',
                // CD-1 民防類別
                'air_raid', 'explosion', 'terror_attack', 'cbrn',
            ]) {
                expect(types.has(expected)).toBe(true);
            }
        });

        it('keeps at least 10 civil defense cases (C1.1 驗收門檻)', () => {
            const civilDefense = DEFAULT_CASES.filter((c) =>
                ['air_raid', 'explosion', 'terror_attack', 'cbrn'].includes(c.expected),
            );
            expect(civilDefense.length).toBeGreaterThanOrEqual(10);
        });

        it('preserves the original 20 D13 cases verbatim as a regression baseline', () => {
            // 擴充前的測資（D13）必須一題未改地留在前 20 筆
            expect(DEFAULT_CASES.slice(0, 20).map((c) => c.expected)).toEqual([
                'flood', 'flood', 'earthquake', 'earthquake', 'fire', 'fire',
                'typhoon', 'typhoon', 'landslide', 'landslide', 'traffic', 'traffic',
                'infrastructure', 'infrastructure', 'infrastructure', 'other', 'other',
                'infrastructure', 'flood', 'landslide',
            ]);
        });

        it('keeps 瓦斯氣爆 on fire so explosion does not steal an existing label', () => {
            const gasBlast = DEFAULT_CASES.filter((c) => c.description.includes('氣爆'));
            expect(gasBlast.length).toBeGreaterThan(0);
            gasBlast.forEach((c) => expect(c.expected).toBe('fire'));
        });

        it('has a description and an expected label on every case', () => {
            for (const testCase of DEFAULT_CASES) {
                expect(testCase.description.length).toBeGreaterThan(0);
                expect(testCase.expected.length).toBeGreaterThan(0);
            }
        });
    });

    describe('extractClassification', () => {
        it('parses a bare JSON object', () => {
            expect(extractClassification('{"type":"flood","confidence":0.9}'))
                .toEqual({ type: 'flood', confidence: 0.9, massCasualty: false });
        });

        it('parses a fenced JSON block', () => {
            expect(extractClassification('```json\n{"type":"fire","confidence":0.4}\n```'))
                .toEqual({ type: 'fire', confidence: 0.4, massCasualty: false });
        });

        it('parses JSON wrapped in commentary (common with local models)', () => {
            const text = '好的，我的判斷如下：\n{"type":"landslide","confidence":0.7}\n希望有幫助。';
            expect(extractClassification(text))
                .toEqual({ type: 'landslide', confidence: 0.7, massCasualty: false });
        });

        it('returns NaN confidence when the model omits it', () => {
            const result = extractClassification('{"type":"other"}');
            expect(result?.type).toBe('other');
            expect(Number.isNaN(result?.confidence)).toBe(true);
        });

        it('returns null on unparseable output', () => {
            expect(extractClassification('I think it is a flood')).toBeNull();
        });

        it('returns null when type is missing', () => {
            expect(extractClassification('{"confidence":0.5}')).toBeNull();
        });

        // CD-1: MCI 旗標
        it('reads the massCasualty flag when present', () => {
            expect(extractClassification('{"type":"cbrn","confidence":0.8,"massCasualty":true}'))
                .toEqual({ type: 'cbrn', confidence: 0.8, massCasualty: true });
        });
    });

    describe('main', () => {
        it('runs end to end and reports both providers as skipped when unconfigured', async () => {
            const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
            jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
            const saved = { ...process.env };
            delete process.env.LLM_BASE_URL;
            delete process.env.LLM_MODEL;
            delete process.env.GEMINI_API_KEY;

            try {
                await main(['node', 'llm-benchmark.ts', '--limit=2']);
                const output = log.mock.calls.map((c) => c.join(' ')).join('\n');
                expect(output).toContain('D13 LLM 對測結果');
                expect(output).toContain('SKIPPED');
            } finally {
                process.env = saved;
                jest.restoreAllMocks();
            }
        });
    });
});
