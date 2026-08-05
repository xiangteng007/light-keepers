import { parseLlmJson } from './llm-json';

describe('parseLlmJson（LLM 輸出解析保底）', () => {
    it('乾淨的 JSON 直接解析', () => {
        const result = parseLlmJson('{"type":"fire","confidence":0.9}');
        expect(result.outcome).toBe('clean');
        expect(result.value).toEqual({ type: 'fire', confidence: 0.9 });
    });

    it('去掉 markdown 圍籬', () => {
        const result = parseLlmJson('```json\n{"type":"flood"}\n```');
        expect(result.outcome).toBe('clean');
        expect(result.value).toEqual({ type: 'flood' });
    });

    // A/B 實測 qwen3:14b 實際吐出來的壞法
    it('修復「鍵沒有引號」', () => {
        const result = parseLlmJson('{type: "fire", confidence: 0.85, massCasualty: false}');
        expect(result.outcome).toBe('repaired');
        expect(result.value).toEqual({ type: 'fire', confidence: 0.85, massCasualty: false });
    });

    it('修復單引號字串', () => {
        const result = parseLlmJson("{'type': 'earthquake', 'reasoning': '地震'}");
        expect(result.outcome).toBe('repaired');
        expect(result.value).toEqual({ type: 'earthquake', reasoning: '地震' });
    });

    it('修復尾端多餘的逗號', () => {
        const result = parseLlmJson('{"type":"fire","confidence":0.5,}');
        expect(result.outcome).toBe('repaired');
        expect(result.value).toEqual({ type: 'fire', confidence: 0.5 });
    });

    it('同時有多種壞法也能修', () => {
        const result = parseLlmJson("```json\n{type: 'fire', confidence: 0.7,}\n```");
        expect(result.outcome).toBe('repaired');
        expect(result.value).toEqual({ type: 'fire', confidence: 0.7 });
    });

    it('模型在 JSON 前後加了說明文字', () => {
        const result = parseLlmJson('好的，我的判斷如下：\n{"type":"landslide"}\n希望有幫助！');
        expect(result.outcome).toBe('clean');
        expect(result.value).toEqual({ type: 'landslide' });
    });

    it('後綴說明裡有大括號時不會被貪婪吃掉', () => {
        const result = parseLlmJson('{"type":"fire"}\n備註：格式是 {type, confidence}');
        expect(result.value).toEqual({ type: 'fire' });
    });

    it('不會動到字串字面值裡的冒號與逗號', () => {
        const result = parseLlmJson('{reasoning: "時間 12:30，多人受傷"}');
        expect(result.outcome).toBe('repaired');
        expect(result.value).toEqual({ reasoning: '時間 12:30，多人受傷' });
    });

    it('不會把字串值裡看起來像鍵的片段加上引號', () => {
        const result = parseLlmJson('{"note": "格式為 key: value 的組合"}');
        expect(result.outcome).toBe('clean');
        expect(result.value).toEqual({ note: '格式為 key: value 的組合' });
    });

    it('解析陣列', () => {
        const result = parseLlmJson('[{"id":"a"},{"id":"b"}]');
        expect(result.outcome).toBe('clean');
        expect(result.value).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it.each([undefined, null, '', '   '])('空輸入回 failed（%p）', (input) => {
        const result = parseLlmJson(input as string | null | undefined);
        expect(result.outcome).toBe('failed');
        expect(result.value).toBeNull();
    });

    it('完全不是 JSON 時回 failed 而不是 throw', () => {
        const result = parseLlmJson('抱歉，我無法回答這個問題。');
        expect(result.outcome).toBe('failed');
        expect(result.value).toBeNull();
        expect(result.error).toBeDefined();
    });

    it('修不好的殘缺 JSON 回 failed', () => {
        const result = parseLlmJson('{"type": "fire", "confidence":');
        expect(result.outcome).toBe('failed');
        expect(result.value).toBeNull();
    });

    it('純量不算成功（呼叫端要的是物件）', () => {
        expect(parseLlmJson('42').outcome).toBe('failed');
        expect(parseLlmJson('"just a string"').outcome).toBe('failed');
    });
});
