/**
 * 災害防救計畫三層階層的資料模型守衛。
 *
 * 這些不是我們自訂的分類，是災害防救法本文寫死的階層。測試同時作為
 * 「法源對照表」——若日後有人改動常數，測試會指出它與哪一條法條不符。
 *
 * 所有斷言的法條文字皆對本系統實際語料（backend/data/regulation-corpus.json）
 * 逐條核對過，非憑記憶。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    PlanLevel,
    PLAN_REVIEW_CYCLE_YEARS,
    PLAN_LEVEL_LABEL,
    ScopeTag,
    SCOPE_TAG_LABEL,
    SourceType,
    RegulationCorpus,
} from './regulation-rag.types';

const corpus: RegulationCorpus = JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'data', 'regulation-corpus.json'), 'utf8'),
);

const article = (lawId: string, no: string) =>
    corpus.chunks.find((c) => c.lawId === lawId && c.articleNo === no);

const DISASTER_ACT = 'D0120014';
const ENFORCEMENT_RULES = 'D0120021';

describe('災害防救計畫三層階層', () => {
    describe('法源對照（以語料原文為準）', () => {
        it('§17 基本計畫：中央災害防救委員會擬訂、中央災害防救會報核定', () => {
            const a = article(DISASTER_ACT, '17');
            expect(a).toBeDefined();
            expect(a!.text).toContain('災害防救基本計畫由中央災害防救委員會擬訂');
            expect(a!.text).toContain('經中央災害防救會報核定後');
        });

        it('🔴 §17 母法只寫「應定期檢討」，並未寫五年', () => {
            const a = article(DISASTER_ACT, '17');
            expect(a!.text).toContain('應定期檢討');
            expect(a!.text).not.toContain('五年');
        });

        it('五年是施行細則 §6 才定的，且列出四範疇', () => {
            const r = article(ENFORCEMENT_RULES, '6');
            expect(r!.text).toContain('每五年');
            expect(r!.text).toContain('檢討災害防救基本計畫');
            for (const kw of ['減災', '整備', '災害應變', '災後復原重建']) {
                expect(r!.text).toContain(kw);
            }
        });

        it('§19 業務計畫：公共事業與中央業務主管機關兩條路徑', () => {
            const a = article(DISASTER_ACT, '19');
            expect(a!.text).toContain('公共事業應依災害防救基本計畫擬訂災害防救業務計畫');
            expect(a!.text).toContain('中央災害防救業務主管機關');
        });

        it('§20 地區計畫：直轄市縣市與鄉鎮市／山地原住民區兩級，且下級不得牴觸上級', () => {
            const a = article(DISASTER_ACT, '20');
            expect(a!.text).toContain('直轄市、縣（市）政府應依災害防救基本計畫');
            expect(a!.text).toContain('鄉（鎮、市）、山地原住民區公所');
            expect(a!.text).toContain('不得牴觸');
        });

        it('檢討週期：基本 5 年（細則 §6）、業務 2 年（§7）、地區 2 年（§8）', () => {
            expect(article(ENFORCEMENT_RULES, '6')!.text).toContain('每五年');
            expect(article(ENFORCEMENT_RULES, '7')!.text).toContain('每二年');
            expect(article(ENFORCEMENT_RULES, '8')!.text).toContain('每二年');

            expect(PLAN_REVIEW_CYCLE_YEARS[PlanLevel.BASIC]).toBe(5);
            expect(PLAN_REVIEW_CYCLE_YEARS[PlanLevel.OPERATIONAL]).toBe(2);
            expect(PLAN_REVIEW_CYCLE_YEARS[PlanLevel.REGIONAL]).toBe(2);
        });
    });

    describe('三層不可混為一堆', () => {
        it('三層各有獨立代碼與標籤', () => {
            const levels = Object.values(PlanLevel);
            expect(new Set(levels).size).toBe(3);
            for (const l of levels) expect(PLAN_LEVEL_LABEL[l]).toBeTruthy();
        });

        it('四範疇標籤齊備', () => {
            expect(Object.values(ScopeTag)).toHaveLength(4);
            expect(SCOPE_TAG_LABEL[ScopeTag.MITIGATION]).toBe('減災');
            expect(SCOPE_TAG_LABEL[ScopeTag.RECOVERY]).toBe('災後復原重建');
        });
    });

    describe('語料中的基本計畫條目', () => {
        const plan = () => corpus.chunks.find((c) => c.id === 'ref:cdprc-basic-plan');

        it('標為計畫而非法規，且屬 basic-plan 層', () => {
            expect(plan()!.sourceType).toBe(SourceType.PLAN);
            expect(plan()!.planLevel).toBe(PlanLevel.BASIC);
        });

        it('版本標為現行 113-117，檢討週期 5 年，法源指向 §17', () => {
            expect(plan()!.planVersion).toBe('113-117');
            expect(plan()!.reviewCycleYears).toBe(5);
            expect(plan()!.legalBasis).toContain('第 17 條');
        });

        it('🔴 授權未確認 → referenceOnly，且來源為災防會網站而非全國法規資料庫', () => {
            expect(plan()!.referenceOnly).toBe(true);
            expect(plan()!.sourceUrl).toContain('cdprc.ey.gov.tw');
            expect(plan()!.sourceUrl).not.toContain('law.moj.gov.tw');
            expect(plan()!.licenceNote).toContain('授權未確認');
        });

        it('四範疇皆標記', () => {
            expect(plan()!.scopeTags).toEqual(
                expect.arrayContaining([
                    ScopeTag.MITIGATION,
                    ScopeTag.PREPAREDNESS,
                    ScopeTag.RESPONSE,
                    ScopeTag.RECOVERY,
                ]),
            );
        });
    });

    describe('法規類條目不得被誤標為計畫', () => {
        it('所有 MOJ 法規 chunk 的 sourceType 皆為 regulation、planLevel 為 null', () => {
            const regs = corpus.chunks.filter((c) => !c.referenceOnly);
            expect(regs.length).toBeGreaterThan(200);
            for (const r of regs) {
                expect(r.sourceType).toBe(SourceType.REGULATION);
                expect(r.planLevel).toBeNull();
            }
        });
    });

    describe('區域階層', () => {
        it('中央法規 region=NATIONAL、subRegion=null（鄉鎮層留給地區計畫）', () => {
            const nat = corpus.chunks.filter((c) => c.region === 'NATIONAL' && !c.referenceOnly);
            expect(nat.length).toBeGreaterThan(200);
            for (const c of nat) expect(c.subRegion ?? null).toBeNull();
        });
    });

    describe('sourceReport 揭露未 ingest 的兩層', () => {
        it('業務計畫與地區計畫登錄為 pending 且不產生 chunk', () => {
            const pending = corpus.sourceReport.filter((s) => s.status === 'pending');
            expect(pending.map((s) => s.planLevel)).toEqual(
                expect.arrayContaining([PlanLevel.OPERATIONAL, PlanLevel.REGIONAL]),
            );
            expect(corpus.chunks.some((c) => c.planLevel === PlanLevel.OPERATIONAL)).toBe(false);
            expect(corpus.chunks.some((c) => c.planLevel === PlanLevel.REGIONAL)).toBe(false);
        });
    });
});
