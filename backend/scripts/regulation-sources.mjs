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
    TYC: 'TYC', // 桃園市
    TXG: 'TXG', // 臺中市
    TNN: 'TNN', // 臺南市
    KHH: 'KHH', // 高雄市
    HUA: 'HUA', // 花蓮縣
};

export const REGION_LABEL = {
    NATIONAL: '中央（全國適用）',
    TPE: '臺北市',
    NWT: '新北市',
    TYC: '桃園市',
    TXG: '臺中市',
    TNN: '臺南市',
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

/** 來源性質：法規 vs 計畫 —— 授權與法律效力完全不同，不可混為一談 */
export const SOURCE_TYPE = { REGULATION: 'regulation', PLAN: 'plan' };

/**
 * 災害防救計畫三層階層 —— 直接來自災害防救法本文（已對本系統語料逐條核對）：
 *
 *   §17 基本計畫：中央災害防救委員會擬訂 → 中央災害防救會報核定 → 行政院函送
 *   §19 業務計畫：①公共事業 →中央目的事業主管機關核定
 *                ②中央災害防救業務主管機關 →中央災害防救會報核定
 *   §20 地區計畫：①直轄市、縣（市）政府
 *                ②鄉（鎮、市）、山地原住民區公所
 *                並明定下級不得牴觸上級（§20 II、V）
 *
 * 檢討週期（施行細則）：基本 5 年（§6）／業務 2 年（§7）／地區 2 年（§8）。
 * ⚠ 母法 §17 只寫「應定期檢討」，**五年是施行細則 §6 才定的**，引用時勿張冠李戴。
 */
export const PLAN_LEVEL = {
    BASIC: 'basic-plan',
    OPERATIONAL: 'operational-plan',
    REGIONAL: 'regional-plan',
};

/** 內容四範疇（本法 §18 計畫內容、施行細則 §6 檢討事項） */
export const SCOPE = {
    MITIGATION: 'mitigation',
    PREPAREDNESS: 'preparedness',
    RESPONSE: 'response',
    RECOVERY: 'recovery',
};

/**
 * 授權未確認 —— 只登錄書目與官方連結，**不重製內文**。
 *
 * 《災害防救基本計畫》性質為**計畫非法規**，因此不在全國法規資料庫，
 * 權威來源為行政院中央災害防救會報（cdprc.ey.gov.tw），該站頁尾標示
 * 「© 行政院版權所有」，未見政府資料開放授權宣告 → 依 owner 決策採
 * 「摘要＋官方連結」，不重製全文。
 */
export const REFERENCE_ONLY_SOURCES = [
    {
        id: 'cdprc-basic-plan',
        name: '災害防救基本計畫',
        level: '計畫',
        sourceType: SOURCE_TYPE.PLAN,
        planLevel: PLAN_LEVEL.BASIC,
        planVersion: '113-117',
        planVersionNote: '現行版本＝民國 113–117 年計畫（前版 108–112）',
        reviewCycleYears: 5,
        legalBasis: '災害防救法第 17 條（檢討週期見同法施行細則第 6 條）',
        scopeTags: [SCOPE.MITIGATION, SCOPE.PREPAREDNESS, SCOPE.RESPONSE, SCOPE.RECOVERY],
        domain: DOMAIN.DISASTER,
        region: REGION.NATIONAL,
        subRegion: null,
        fullText: false,
        issuer: '行政院中央災害防救會報',
        url: 'https://cdprc.ey.gov.tw/Page/D99BAB0D863D6ACB',
        licenceNote:
            '授權未確認（行政院網站標示「© 行政院版權所有」，未見開放授權宣告）。' +
            '本系統僅登錄書目與官方連結，不重製內文。',
        summary:
            '《災害防救基本計畫》為全國上位之災害防救計畫，法源為災害防救法第 17 條：' +
            '由中央災害防救委員會擬訂，經中央災害防救會報核定後，由行政院函送各中央災害防救' +
            '業務主管機關及直轄市、縣（市）政府據以辦理。其下為兩層：中央各業務主管機關與' +
            '公共事業依第 19 條擬訂「災害防救業務計畫」（按災種），直轄市、縣（市）政府及' +
            '鄉（鎮、市）、山地原住民區公所依第 20 條擬訂「地區災害防救計畫」，且下級計畫' +
            '不得牴觸上級計畫。內容範疇涵蓋減災、整備、災害應變與災後復原重建。' +
            '依施行細則第 6 條，中央災害防救委員會每五年應通盤檢討本計畫，必要時得隨時辦理。' +
            '現行版本為民國 113–117 年計畫（前版 108–112）。全文請至官方連結查閱。',
    },
];

/**
 * 計畫階層的下兩層 —— 結構先立起來，內容待 owner 圈範圍後再 ingest。
 *
 * 刻意**不**把三層混成一堆：基本／業務／地區三者的擬訂機關、核定程序、
 * 檢討週期、適用範圍都不同，混在一起檢索會讓使用者分不清哪一份管到自己。
 */
export const PLAN_HIERARCHY_SOURCES = [
    {
        id: 'cdprc-operational-plans',
        name: '災害防救業務計畫',
        sourceType: SOURCE_TYPE.PLAN,
        planLevel: PLAN_LEVEL.OPERATIONAL,
        reviewCycleYears: 2,
        legalBasis: '災害防救法第 19 條（檢討週期見同法施行細則第 7 條）',
        domain: DOMAIN.DISASTER,
        region: REGION.NATIONAL,
        issuer: '中央災害防救業務主管機關／公共事業',
        url: 'https://cdprc.ey.gov.tw/Page/87848400D3DF0831',
        status: 'pending',
        note:
            '按災種分別擬訂（水災、震災、土石流、火災…），可作 domain 之下的 tag。' +
            '各部會分別發布，授權需逐份確認，尚未 ingest。',
    },
    {
        id: 'local-regional-plans',
        name: '地區災害防救計畫',
        sourceType: SOURCE_TYPE.PLAN,
        planLevel: PLAN_LEVEL.REGIONAL,
        reviewCycleYears: 2,
        legalBasis: '災害防救法第 20 條（檢討週期見同法施行細則第 8 條）',
        domain: DOMAIN.DISASTER,
        issuer: '直轄市、縣（市）政府／鄉（鎮、市）、山地原住民區公所',
        status: 'pending',
        note:
            '兩級：①直轄市、縣（市）②鄉（鎮、市）、山地原住民區。' +
            '對應資料模型的 region（縣市）與 subRegion（鄉鎮市）。' +
            '各地方政府分別發布，尚未 ingest。',
    },
];

/**
 * 六都地區災害防救計畫（災防法 §20 第一級：直轄市）。
 *
 * 🔴 授權：地區計畫與基本計畫同屬「計畫非法規」，**不適用**全國法規資料庫的
 *    開放授權。逐個確認結果：權威彙整在行政院中央災害防救會報（cdprc.ey.gov.tw，
 *    頁尾「© 行政院版權所有」），各市消防局網站亦僅提供 PDF 下載而無開放授權宣告。
 *    **六都全數授權未確認** → 依 owner 決策一律 `fullText: false`：
 *    只登錄書目、發布機關、法源與官方連結，不重製任何計畫內文。
 *
 * subRegion 留 null —— 這一層是市級；§20 IV 的鄉（鎮、市）、山地原住民區
 * 是第二級，欄位已就緒但尚未 ingest。
 */
const regionalPlan = (region, name, cityUrl, cdprcUrl) => ({
    id: `regional-plan-${region.toLowerCase()}`,
    name,
    level: '計畫',
    sourceType: SOURCE_TYPE.PLAN,
    planLevel: PLAN_LEVEL.REGIONAL,
    planVersion: null,
    reviewCycleYears: 2,
    legalBasis: '災害防救法第 20 條（檢討週期見同法施行細則第 8 條）',
    scopeTags: [SCOPE.MITIGATION, SCOPE.PREPAREDNESS, SCOPE.RESPONSE, SCOPE.RECOVERY],
    domain: DOMAIN.DISASTER,
    region,
    subRegion: null,
    fullText: false,
    issuer: `${REGION_LABEL[region]}災害防救會報`,
    url: cityUrl,
    indexUrl: cdprcUrl,
    licenceNote:
        '授權未確認（計畫非法規，不適用全國法規資料庫開放授權；' +
        '中央彙整頁與市府網站均未見開放授權宣告）。僅登錄書目與官方連結，不重製內文。',
    summary:
        `《${name}》為 ${REGION_LABEL[region]} 依災害防救法第 20 條擬訂之地區災害防救計畫，` +
        `由該市災害防救會報核定後實施，並報中央災害防救會報備查；` +
        `依同法規定不得牴觸災害防救基本計畫及相關災害防救業務計畫。` +
        `內容範疇涵蓋減災、整備、災害應變與災後復原重建。` +
        `依施行細則第 8 條每二年應檢討一次，必要時得隨時辦理。` +
        `全文請至官方連結查閱（本系統未重製內文）。`,
});

const CDPRC_REGIONAL_INDEX = 'https://cdprc.ey.gov.tw/Page/AF2F253C2D2B5F3E';

export const REGIONAL_PLAN_SOURCES = [
    regionalPlan(
        REGION.TPE,
        '臺北市地區災害防救計畫',
        'https://www.119.gov.taipei/cp.aspx?n=23217FE9ADB86215',
        CDPRC_REGIONAL_INDEX,
    ),
    regionalPlan(
        REGION.NWT,
        '新北市地區災害防救計畫',
        'https://www.fire.ntpc.gov.tw/',
        CDPRC_REGIONAL_INDEX,
    ),
    regionalPlan(
        REGION.TYC,
        '桃園市地區災害防救計畫',
        'https://www.tyfd.gov.tw/',
        CDPRC_REGIONAL_INDEX,
    ),
    regionalPlan(
        REGION.TXG,
        '臺中市地區災害防救計畫',
        'https://www.fire.taichung.gov.tw/content/index.asp?Parser=1,10,234,53',
        CDPRC_REGIONAL_INDEX,
    ),
    regionalPlan(
        REGION.TNN,
        '臺南市地區災害防救計畫',
        'https://cdprc.ey.gov.tw/Page/C10B9C4A41D6D55F/df7f6ecd-f753-4dc0-ac18-c00b11456f1e',
        CDPRC_REGIONAL_INDEX,
    ),
    regionalPlan(
        REGION.KHH,
        '高雄市地區災害防救計畫',
        'https://fdkc.kcg.gov.tw/cp.aspx?n=AB42C8E0810857BC',
        CDPRC_REGIONAL_INDEX,
    ),
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
