import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateSitrepDto, GenerateSitrepDto, UpdateSitrepDto } from './sitrep.dto';
import {
    CreateOperationalPeriodDto,
    UpdateOperationalPeriodDto,
} from './operational-period.dto';
import { UpdateAarDto } from './aar.dto';

/** 與 `main.ts` 的全域設定一致 */
const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
});

const meta = (metatype: unknown) => ({
    type: 'body' as const,
    metatype: metatype as new () => unknown,
    data: undefined,
});

describe('作戰情資 DTO（P0 輸入驗證）', () => {
    describe('CreateSitrepDto', () => {
        const valid = {
            periodStart: '2026-08-02T00:00:00.000Z',
            periodEnd: '2026-08-02T12:00:00.000Z',
        };

        it('接受合法的報告區間', async () => {
            await expect(pipe.transform({ ...valid }, meta(CreateSitrepDto))).resolves.toMatchObject(valid);
        });

        it('擋掉非日期的 periodStart（未驗證時會變成 Invalid Date 寫進 DB）', async () => {
            await expect(
                pipe.transform({ ...valid, periodStart: 'not-a-date' }, meta(CreateSitrepDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉非 UUID 的 operationalPeriodId', async () => {
            await expect(
                pipe.transform({ ...valid, operationalPeriodId: '../../etc/passwd' }, meta(CreateSitrepDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉夾帶的額外欄位（例如想直接指定 createdBy）', async () => {
            await expect(
                pipe.transform({ ...valid, createdBy: 'someone-else' }, meta(CreateSitrepDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('GenerateSitrepDto', () => {
        it('兩個時間都是必填', async () => {
            await expect(
                pipe.transform({ periodStart: '2026-08-02T00:00:00.000Z' }, meta(GenerateSitrepDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('UpdateSitrepDto', () => {
        it('接受完整的巢狀結構', async () => {
            const payload = {
                summary: '第一作戰週期情勢摘要',
                keyEvents: [
                    { time: '2026-08-02T03:00:00.000Z', description: '南區搜索完成', severity: 3 },
                ],
                resourceStatus: [
                    { resourceType: '救護車', available: 2, deployed: 3, requested: 1 },
                ],
                casualties: { minor: 4, severe: 1, deceased: 0 },
                nextActions: ['擴大搜索範圍'],
                requests: [{ type: '人力', description: '需要 10 名志工', priority: 1 }],
            };
            await expect(pipe.transform(payload, meta(UpdateSitrepDto))).resolves.toMatchObject({
                summary: payload.summary,
            });
        });

        it('擋掉巢狀陣列元素裡的未知欄位（whitelist 必須下探到子物件）', async () => {
            await expect(
                pipe.transform(
                    {
                        keyEvents: [
                            {
                                time: '2026-08-02T03:00:00.000Z',
                                description: 'x',
                                injected: 'payload',
                            },
                        ],
                    },
                    meta(UpdateSitrepDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉超出 1-5 範圍的 severity', async () => {
            await expect(
                pipe.transform(
                    { keyEvents: [{ time: '2026-08-02T03:00:00.000Z', description: 'x', severity: 99 }] },
                    meta(UpdateSitrepDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉負數的傷亡人數', async () => {
            await expect(
                pipe.transform({ casualties: { deceased: -5 } }, meta(UpdateSitrepDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉非數字的傷亡人數', async () => {
            await expect(
                pipe.transform({ casualties: { deceased: 'many' } }, meta(UpdateSitrepDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉資源狀態的負數量', async () => {
            await expect(
                pipe.transform(
                    { resourceStatus: [{ resourceType: '救護車', available: -1, deployed: 0, requested: 0 }] },
                    meta(UpdateSitrepDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('CreateOperationalPeriodDto', () => {
        const valid = { startTime: '2026-08-02T00:00:00.000Z' };

        it('接受只有起始時間的最小輸入', async () => {
            await expect(pipe.transform({ ...valid }, meta(CreateOperationalPeriodDto))).resolves.toMatchObject(valid);
        });

        it('擋掉目標的非法 status', async () => {
            await expect(
                pipe.transform(
                    {
                        ...valid,
                        objectives: [
                            { id: 'o1', priority: 1, description: 'x', measurable: 'y', status: 'whatever' },
                        ],
                    },
                    meta(CreateOperationalPeriodDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('接受合法的目標', async () => {
            await expect(
                pipe.transform(
                    {
                        ...valid,
                        objectives: [
                            { id: 'o1', priority: 1, description: '搜索南區', measurable: '完成 100%', status: 'pending' },
                        ],
                    },
                    meta(CreateOperationalPeriodDto),
                ),
            ).resolves.toBeDefined();
        });
    });

    describe('UpdateOperationalPeriodDto', () => {
        it('擋掉超出 1-5 的風險評估分數', async () => {
            await expect(
                pipe.transform(
                    {
                        riskAssessment: [
                            { id: 'r1', hazard: '餘震', likelihood: 9, consequence: 3, mitigation: '撤離' },
                        ],
                    },
                    meta(UpdateOperationalPeriodDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('接受合法的風險評估與資源配置', async () => {
            await expect(
                pipe.transform(
                    {
                        riskAssessment: [
                            { id: 'r1', hazard: '餘震', likelihood: 4, consequence: 3, mitigation: '撤離' },
                        ],
                        resourceAllocation: [{ resourceType: '發電機', quantity: 2 }],
                    },
                    meta(UpdateOperationalPeriodDto),
                ),
            ).resolves.toBeDefined();
        });
    });

    describe('UpdateAarDto', () => {
        it('擋掉非法的決策檢討結果', async () => {
            await expect(
                pipe.transform(
                    {
                        decisionsReview: [
                            {
                                decisionId: 'd1',
                                timestamp: '2026-08-02T00:00:00.000Z',
                                description: 'x',
                                rationale: 'y',
                                outcome: 'great-success',
                            },
                        ],
                    },
                    meta(UpdateAarDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉非法的經驗學習分類', async () => {
            await expect(
                pipe.transform(
                    {
                        lessonsLearned: [
                            {
                                id: 'l1',
                                category: 'not-a-category',
                                observation: 'x',
                                impact: 'y',
                                recommendation: 'z',
                                priority: 'high',
                                status: 'identified',
                            },
                        ],
                    },
                    meta(UpdateAarDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('接受合法的復盤內容', async () => {
            await expect(
                pipe.transform(
                    {
                        executiveSummary: '本次任務摘要',
                        lessonsLearned: [
                            {
                                id: 'l1',
                                category: 'communications',
                                observation: '通聯中斷 20 分鐘',
                                impact: '南區延遲派遣',
                                recommendation: '增設中繼台',
                                priority: 'high',
                                status: 'identified',
                            },
                        ],
                        successes: ['傷患後送零延誤'],
                    },
                    meta(UpdateAarDto),
                ),
            ).resolves.toBeDefined();
        });
    });
});
