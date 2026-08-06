/**
 * 台灣災防／戰時動員法規語料來源註冊表
 *
 * 授權：全國法規資料庫（law.moj.gov.tw）全站採「政府資料開放授權條款－第 1 版」，
 *       無償、非專屬、可再授權、可重製改作，使用時應註明出處。
 *       見 https://law.moj.gov.tw/Service/Copyright.aspx
 *
 * ⚠ 只有 `fullText: true` 的來源會抓取條文全文。
 *   授權未確認的來源（例如《災害防救基本計畫》，行政院網站標示「© 行政院版權所有」，
 *   未見開放授權宣告）一律 `fullText: false`，只保留書目與官方連結，
 *   由問答層以「引用＋連結」方式呈現，不重製內文。
 */

/** 語料領域 —— domain 隔離的第一層，manuals 完全不共用 */
export const DOMAIN = {
    DISASTER: 'tw-disaster-regulation', // 災害防救
    WARTIME: 'tw-wartime-mobilization', // 戰時動員／民防
};

/** 區域代碼。中央法規一律 NATIONAL；地方自治法規帶縣市代碼。 */
export const REGION = {
    NATIONAL: 'NATIONAL',
    TPE: 'TPE', // 臺北市
    NWT: 'NWT', // 新北市
    TXG: 'TXG', // 臺中市
    KHH: 'KHH', // 高雄市
    HUA: 'HUA', // 花蓮縣
};

export const REGION_LABEL = {
    NATIONAL: '中央（全國適用）',
    TPE: '臺北市',
    NWT: '新北市',
    TXG: '臺中市',
    KHH: '高雄市',
    HUA: '花蓮縣',
};

const moj = (pcode) => `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${pcode}`;

/**
 * 中央法規（全國法規資料庫，開放授權，抓全文）
 */
export const MOJ_SOURCES = [
    // ── 災害防救 ──────────────────────────────────────────────
    {
        pcode: 'D0120014',
        name: '災害防救法',
        level: '法律',
        domain: DOMAIN.DISASTER,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('D0120014'),
    },
    {
        pcode: 'D0120021',
        name: '災害防救法施行細則',
        level: '命令',
        domain: DOMAIN.DISASTER,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('D0120021'),
    },
    {
        pcode: 'D0120001',
        name: '消防法',
        level: '法律',
        domain: DOMAIN.DISASTER,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('D0120001'),
    },

    // ── 戰時動員／民防（owner 拍板新增之 domain）─────────────────
    {
        pcode: 'D0080118',
        name: '民防法',
        level: '法律',
        domain: DOMAIN.WARTIME,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('D0080118'),
    },
    {
        pcode: 'F0070013',
        name: '全民防衛動員準備法',
        level: '法律',
        domain: DOMAIN.WARTIME,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('F0070013'),
    },
    {
        pcode: 'F0070022',
        name: '全民防衛動員準備法施行細則',
        level: '命令',
        domain: DOMAIN.WARTIME,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('F0070022'),
    },
    {
        pcode: 'F0070012',
        name: '全民防衛動員準備實施辦法',
        level: '命令',
        domain: DOMAIN.WARTIME,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('F0070012'),
    },
    {
        pcode: 'F0080014',
        name: '全民國防教育法',
        level: '法律',
        domain: DOMAIN.WARTIME,
        region: REGION.NATIONAL,
        fullText: true,
        url: moj('F0080014'),
    },
];

/**
 * 授權未確認 —— 只登錄書目與官方連結，**不重製內文**。
 *
 * 《災害防救基本計畫》由中央災害防救會報核定，性質為計畫而非法規，
 * 不在全國法規資料庫，行政院網站頁尾標示「© 行政院版權所有」，
 * 未見政府資料開放授權宣告。依 owner 決策，改採「引用＋官方連結」。
 */
export const REFERENCE_ONLY_SOURCES = [
    {
        id: 'cdprc-basic-plan',
        name: '災害防救基本計畫',
        level: '計畫',
        domain: DOMAIN.DISASTER,
        region: REGION.NATIONAL,
        fullText: false,
        issuer: '行政院中央災害防救會報',
        url: 'https://cdprc.ey.gov.tw/Page/D99BAB0D863D6ACB',
        licenceNote:
            '授權未確認（行政院網站標示「© 行政院版權所有」，未見開放授權宣告）。' +
            '本系統僅登錄書目與官方連結，不重製內文。',
        summary:
            '《災害防救基本計畫》為國家層級之災害防救計畫，由中央災害防救委員會擬訂、' +
            '中央災害防救會報核定後由行政院函送各中央災害防救業務主管機關及地方政府據以實施；' +
            '各級政府之災害防救業務計畫與地區災害防救計畫均須以本計畫為上位依據。' +
            '依災害防救法施行細則，本計畫應定期檢討（每五年），必要時得隨時檢討。' +
            '現行版本分期核定（98-102、103-107、108-112、113-117 年），全文請至官方連結查閱。',
    },
];

/**
 * 地方自治法規 —— 結構已就緒，來源逐縣市不同，P3 先做代表性縣市。
 *
 * ⚠ 各縣市法規系統的網址格式與 HTML 結構皆不同，無法沿用 MOJ 的解析器。
 *   本表先登錄「入口與取得方式」，實際抓取需逐縣市寫 adapter。
 *   未完成抓取者以 `status: 'pending'` 標示，不會產生 chunk。
 */
export const LOCAL_SOURCES = [
    {
        region: REGION.TPE,
        name: '臺北市法規查詢系統',
        entryUrl: 'https://laws.gov.taipei/',
        domain: DOMAIN.DISASTER,
        status: 'pending',
        note: '需寫專屬 adapter；市級災防自治條例與作業要點散在多個分類。',
    },
    {
        region: REGION.NWT,
        name: '新北市政府法規查詢系統',
        entryUrl: 'https://web.law.ntpc.gov.tw/',
        domain: DOMAIN.DISASTER,
        status: 'pending',
    },
    {
        region: REGION.TXG,
        name: '臺中市政府法規全球資訊網',
        entryUrl: 'https://lawsearch.taichung.gov.tw/',
        domain: DOMAIN.DISASTER,
        status: 'pending',
    },
    {
        region: REGION.KHH,
        name: '高雄市政府法規資料庫',
        entryUrl: 'https://outlaw.kcg.gov.tw/',
        domain: DOMAIN.DISASTER,
        status: 'pending',
    },
    {
        region: REGION.HUA,
        name: '花蓮縣政府法規資料庫',
        entryUrl: 'https://law.hl.gov.tw/',
        domain: DOMAIN.DISASTER,
        status: 'pending',
    },
];

export const SOURCE_ATTRIBUTION =
    '資料來源：全國法規資料庫（法務部），採政府資料開放授權條款－第 1 版。';
