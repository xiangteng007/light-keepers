import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateEvacuationPlanDto } from './evacuation-plan.dto';

const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
});

const meta = { type: 'body' as const, metatype: CreateEvacuationPlanDto, data: undefined };

describe('CreateEvacuationPlanDto', () => {
    it('accepts a plan with only a locationId and empty plan object', async () => {
        // service 對每個 plan 欄位都有預設值，故空 plan 應合法
        await expect(
            pipe.transform({ locationId: 'loc-1', plan: {} }, meta),
        ).resolves.toBeDefined();
    });

    it('accepts a fully populated nested plan', async () => {
        const body = {
            locationId: 'loc-1',
            plan: {
                name: '花蓮辦公室撤離計畫',
                triggers: [
                    { type: 'earthquake', threshold: '震度 5 級以上', authorizedBy: ['u1'] },
                ],
                routes: [
                    {
                        id: 'r1',
                        name: '主要路線',
                        primary: true,
                        waypoints: [{ lat: 23.99, lon: 121.6, description: '大門' }],
                        estimatedTimeMinutes: 8,
                    },
                ],
                assemblyPoints: [
                    {
                        id: 'a1',
                        name: '中央公園',
                        latitude: 23.98,
                        longitude: 121.61,
                        capacity: 200,
                        facilities: ['廁所'],
                        contacts: ['u2'],
                    },
                ],
                contacts: [
                    { name: '王小明', role: '安全官', phone: '0912345678', available24h: true },
                ],
            },
        };

        await expect(pipe.transform(body, meta)).resolves.toMatchObject(body);
    });

    it('rejects an invalid trigger type inside the nested array', async () => {
        await expect(
            pipe.transform(
                {
                    locationId: 'loc-1',
                    plan: { triggers: [{ type: 'volcano', authorizedBy: ['u1'] }] },
                },
                meta,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    /** 座標會進入 haversine 距離計算，非法值會導致 NaN 並選出任意集結點。 */
    it('rejects an out-of-range latitude on an assembly point', async () => {
        await expect(
            pipe.transform(
                {
                    locationId: 'loc-1',
                    plan: {
                        assemblyPoints: [
                            {
                                id: 'a1',
                                name: 'X',
                                latitude: 999,
                                longitude: 121.6,
                                capacity: 10,
                                facilities: [],
                                contacts: [],
                            },
                        ],
                    },
                },
                meta,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects server-generated fields inside plan', async () => {
        await expect(
            pipe.transform({ locationId: 'loc-1', plan: { id: 'forced' } }, meta),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
