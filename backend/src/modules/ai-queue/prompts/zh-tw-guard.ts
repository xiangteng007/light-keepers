/**
 * 繁體中文護欄。
 *
 * 起因：A/B 實測發現 qwen3:14b 在同樣 prompt、同樣參數下，**同一題兩次跑
 * 會一次繁體一次整段簡體**。對台灣的防災平台來說這是使用者直接看得到的問題，
 * 而且靠 prompt 措辭修不掉（prompt 已經寫了繁體中文仍會發生）。
 *
 * 對策與 `regulatory-guardrail`（擋捏造法規）、`llm-json`（強制合法 JSON）同一
 * 體系：**不信任模型自律，在呼叫端偵測並重試**。
 *
 * 偵測方式刻意用「簡化字獨有字集」而不是簡繁轉換表：
 *   - 只列**簡化後才出現、且在正體中文不會正常使用**的字
 *   - 兩岸同形字（例如「不」「人」「山」）一律不列，否則整篇都會誤報
 *   - 日文漢字有部分與簡化字同形（如「学」「国」「体」），但 LK 的輸出不預期
 *     出現日文，且誤報的代價只是多重試一次，遠低於漏報
 */

/**
 * 簡化字獨有字集（高頻優先）。
 *
 * 命中任一即視為簡體污染。清單刻意保守——寧可漏掉罕見字，也不要把
 * 正體中文正常用字誤判成簡體而讓每次呼叫都重試。
 */
const SIMPLIFIED_ONLY = new Set(
    // ⚠ 只列**簡化後字形與正體不同**的字。兩岸同形字（避、疏、散、警、防、
    //   救、查、置、示、種、別、急…）一律不得列入，否則正常的正體災防用語
    //   會整批誤報——這在開發時實際踩過一次。
    [
        // 高頻虛詞／常用動詞
        '们个这来时对说过还进条实发当经现开关点问题为无产处动务将',
        // 組織／流程／文書
        '队级组织给结统计设备样应该称职权责检验证书据认识资质',
        '讲论议谈计规则须师专业际转运输车辆机构电视频网络软盘显',
        // 醫療／教育／人員
        '医药卫护养营饮伤诊疗剂妇儿国学习练题测试图书馆导览',
        // 災防／應變（LK 主場）
        '难险类应响抢训练营区预报监测',
        // 動員／軍事
        '战军装弹导飞舰侦总参谋',
        // 產業／財務
        '农渔业场厂矿气钢铁铝铜币银钱账贷储债财审销',
        // 門部／阜部（簡化偏旁，誤報率低）
        '门闻间闲闭闪阅阔阶陆陈陕邓郑赵钟',
        // 其他高頻簡化字形
        '简单双边变让见觉买卖东长马鸟龙岁万亿传优众体丽举义乐',
        '纪红绿蓝线约丝纸细纯纵织缩纲绩绕绳织缴续纤',
    ]
        .join('')
        .split(''),
);

// 以「字集」方式列舉，跨行重複無妨（Set 自動去重）。

export interface SimplifiedDetection {
    /** 是否偵測到簡體 */
    detected: boolean;
    /** 命中的簡化字（去重，最多回傳前 20 個供日誌用） */
    hits: string[];
    /** 命中字數佔全文中文字數的比例，供閾值判斷 */
    ratio: number;
}

/**
 * 掃描文字是否含簡化字。
 *
 * @param minHits 需要幾個命中才算數。預設 1 —— 單一簡化字通常就代表模型
 *                在該段切換了語言模式，而且誤報成本只是重試一次。
 */
export function detectSimplified(text: string, minHits = 1): SimplifiedDetection {
    if (!text) return { detected: false, hits: [], ratio: 0 };

    const hits: string[] = [];
    const seen = new Set<string>();
    let cjkCount = 0;

    for (const ch of text) {
        const code = ch.codePointAt(0)!;
        // CJK 統一表意文字基本區
        if (code >= 0x4e00 && code <= 0x9fff) cjkCount++;
        if (SIMPLIFIED_ONLY.has(ch) && !seen.has(ch)) {
            seen.add(ch);
            hits.push(ch);
        }
    }

    return {
        detected: hits.length >= minHits,
        hits: hits.slice(0, 20),
        ratio: cjkCount > 0 ? hits.length / cjkCount : 0,
    };
}

/**
 * 重試時附加的指示。刻意寫得比原 prompt 更硬，並點名常見的錯法。
 */
export const ZH_TW_RETRY_INSTRUCTION =
    '\n\n【重要】上一次回覆包含簡體字。請**全部改用臺灣正體中文**重新回答一次：' +
    '用「這、個、們、時、發、開、關、應、對、實、產、處、動、務、級、給、結、認、證、據」' +
    '這類正體字形，不得出現任何簡化字，也不得使用中國大陸用語。內容與格式維持不變。';

/**
 * 把重試指示接到原 prompt 後面。
 */
export function withZhTwRetry(prompt: string): string {
    return prompt + ZH_TW_RETRY_INSTRUCTION;
}
