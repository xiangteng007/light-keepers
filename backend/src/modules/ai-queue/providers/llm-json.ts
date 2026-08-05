/**
 * 解析 LLM 回傳的 JSON —— 保底層。
 *
 * 第一道防線是 provider 的解碼約束（`LlmTextRequest.json` → Ollama 的
 * `response_format: json_object` / Gemini 的 `responseMimeType`）。
 * 這支檔案是第二道：即使約束沒生效（舊版 runtime、被換掉的模型、
 * 走 Vision 直連的路徑），也要盡量把可用的資料撈出來，而不是整包 throw。
 *
 * A/B 實測觀察到的實際壞法（qwen3:14b）：
 *   - 鍵沒有引號：`{type: "fire", confidence: 0.9}`
 *   - 前後包 ```json 圍籬
 *   - JSON 前後夾雜說明文字
 *   - 用單引號當字串引號
 *   - 物件尾端多一個逗號
 *
 * 修復一律是**保守**的：只在標準 `JSON.parse` 失敗後才嘗試，且不改動字串內容
 * （字面值裡的冒號、逗號、引號都必須原樣保留）。修不好就回 `null`，
 * 由呼叫端決定降級行為（關鍵字比對、模板回應…），不要讓它變成例外往上炸。
 */

export interface LlmJsonParseResult<T = Record<string, unknown>> {
    /** 解析成功的物件；失敗為 null */
    value: T | null;
    /** 走了哪條路：直接成功／修復後成功／失敗。用於日誌與測試斷言 */
    outcome: 'clean' | 'repaired' | 'failed';
    /** outcome=failed 時的原因摘要 */
    error?: string;
}

/** 去掉 markdown 圍籬（```json … ```） */
function stripCodeFences(text: string): string {
    return text
        .replace(/```[a-zA-Z]*\s*/g, '')
        .replace(/```/g, '')
        .trim();
}

/**
 * 從一段文字裡抓出第一個「括號平衡」的 JSON 物件或陣列。
 *
 * 不能用 `/\{[\s\S]*\}/` 這種貪婪 regex：模型在 JSON 後面再補一段說明時，
 * 貪婪比對會把說明裡的括號一起吃進來。這裡逐字掃描並跳過字串字面值。
 */
function extractFirstJsonValue(text: string): string | null {
    const startIndex = text.search(/[{[]/);
    if (startIndex === -1) return null;

    const openChar = text[startIndex];
    const closeChar = openChar === '{' ? '}' : ']';

    let depth = 0;
    let inString = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quoteChar) {
                inString = false;
            }
            continue;
        }

        if (ch === '"' || ch === "'") {
            inString = true;
            quoteChar = ch;
            continue;
        }

        if (ch === openChar) depth++;
        if (ch === closeChar) {
            depth--;
            if (depth === 0) {
                return text.substring(startIndex, i + 1);
            }
        }
    }

    return null;
}

/**
 * 保守修復三種常見的非法寫法，字串字面值內部一律不動。
 *
 * 1. 沒有引號的鍵      `{type: 1}`      → `{"type": 1}`
 * 2. 單引號字串        `{'a': 'b'}`     → `{"a": "b"}`
 * 3. 尾端多餘的逗號    `{"a": 1,}`      → `{"a": 1}`
 */
function repairJsonish(input: string): string {
    let out = '';
    let inString = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];

        if (inString) {
            if (escaped) {
                out += ch;
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                out += ch;
                escaped = true;
                continue;
            }
            if (ch === quoteChar) {
                inString = false;
                // 單引號字串轉成雙引號輸出
                out += '"';
                continue;
            }
            // 原本是單引號字串時，內部的雙引號要跳脫，否則轉換後會壞掉
            if (ch === '"' && quoteChar === "'") {
                out += '\\"';
                continue;
            }
            out += ch;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inString = true;
            quoteChar = ch;
            out += '"';
            continue;
        }

        out += ch;
    }

    // 沒有引號的鍵：出現在 `{` 或 `,` 之後、`:` 之前的裸識別字
    out = out.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
    // 尾端多餘的逗號
    out = out.replace(/,(\s*[}\]])/g, '$1');

    return out;
}

/**
 * 盡力把 LLM 的輸出解析成物件。永不 throw。
 *
 * @param text  模型輸出的原始文字
 */
export function parseLlmJson<T = Record<string, unknown>>(
    text: string | null | undefined,
): LlmJsonParseResult<T> {
    if (!text || !text.trim()) {
        return { value: null, outcome: 'failed', error: 'empty response' };
    }

    const stripped = stripCodeFences(text);
    const candidate = extractFirstJsonValue(stripped) ?? stripped;

    try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object') {
            return { value: parsed as T, outcome: 'clean' };
        }
        return { value: null, outcome: 'failed', error: 'parsed value is not an object' };
    } catch {
        // 落到修復路徑
    }

    try {
        const parsed = JSON.parse(repairJsonish(candidate));
        if (parsed && typeof parsed === 'object') {
            return { value: parsed as T, outcome: 'repaired' };
        }
        return { value: null, outcome: 'failed', error: 'repaired value is not an object' };
    } catch (error) {
        return {
            value: null,
            outcome: 'failed',
            error: (error as Error)?.message ?? 'unparseable',
        };
    }
}
