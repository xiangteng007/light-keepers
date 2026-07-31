import { DEFAULT_CASES, extractClassification, main } from './llm-benchmark';

describe('llm-benchmark', () => {
    describe('DEFAULT_CASES', () => {
        it('covers every supported disaster type', () => {
            const types = new Set(DEFAULT_CASES.map((c) => c.expected));
            for (const expected of [
                'earthquake', 'flood', 'fire', 'typhoon',
                'landslide', 'traffic', 'infrastructure', 'other',
            ]) {
                expect(types.has(expected)).toBe(true);
            }
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
                .toEqual({ type: 'flood', confidence: 0.9 });
        });

        it('parses a fenced JSON block', () => {
            expect(extractClassification('```json\n{"type":"fire","confidence":0.4}\n```'))
                .toEqual({ type: 'fire', confidence: 0.4 });
        });

        it('parses JSON wrapped in commentary (common with local models)', () => {
            const text = '好的，我的判斷如下：\n{"type":"landslide","confidence":0.7}\n希望有幫助。';
            expect(extractClassification(text))
                .toEqual({ type: 'landslide', confidence: 0.7 });
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
