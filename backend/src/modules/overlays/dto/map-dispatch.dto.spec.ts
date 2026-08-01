import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
    CreateRallyPointDto,
    CreateSectorDto,
    DispatchFromBboxDto,
    UpdateSectorStatusDto,
} from './map-dispatch.dto';
import { SectorType } from '../entities/sector.entity';
import { RallyPointType } from '../entities/rally-point.entity';

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

describe('map-dispatch DTO（P0 輸入驗證）', () => {
    describe('CreateSectorDto', () => {
        const valid = {
            sectorCode: 'AO-1',
            name: '南區搜索',
            sectorType: SectorType.SEARCH_AREA,
            geometry: { type: 'Polygon', coordinates: [[[121, 25], [121.1, 25], [121.1, 25.1], [121, 25]]] },
        };

        it('接受合法的責任區', async () => {
            await expect(pipe.transform({ ...valid }, meta(CreateSectorDto))).resolves.toBeDefined();
        });

        it('擋掉不存在的 sectorType', async () => {
            await expect(
                pipe.transform({ ...valid, sectorType: 'wherever' }, meta(CreateSectorDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉錯誤的 GeoJSON 型別（會寫進 PostGIS 欄位）', async () => {
            await expect(
                pipe.transform(
                    { ...valid, geometry: { type: 'Point', coordinates: [121, 25] } },
                    meta(CreateSectorDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉夾帶的 createdBy（伺服器以 JWT 決定）', async () => {
            await expect(
                pipe.transform({ ...valid, createdBy: 'someone-else' }, meta(CreateSectorDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('UpdateSectorStatusDto', () => {
        it('擋掉不存在的狀態值', async () => {
            await expect(
                pipe.transform({ status: 'done-ish' }, meta(UpdateSectorStatusDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('CreateRallyPointDto', () => {
        const valid = {
            name: '第一集結點',
            pointType: RallyPointType.STAGING,
            geometry: { type: 'Point', coordinates: [121.5, 25.03] },
        };

        it('接受合法的集結點', async () => {
            await expect(pipe.transform({ ...valid }, meta(CreateRallyPointDto))).resolves.toBeDefined();
        });

        it('擋掉座標數量錯誤的 Point', async () => {
            await expect(
                pipe.transform(
                    { ...valid, geometry: { type: 'Point', coordinates: [121.5] } },
                    meta(CreateRallyPointDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉負數的容納人數', async () => {
            await expect(
                pipe.transform({ ...valid, capacity: -10 }, meta(CreateRallyPointDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('DispatchFromBboxDto', () => {
        const valid = {
            bbox: { minLng: 121, minLat: 25, maxLng: 121.2, maxLat: 25.2 },
            teamId: 'team-1',
            teamName: '搜救一隊',
            taskTitle: '南區清查',
        };

        it('接受合法的框選派遣', async () => {
            await expect(pipe.transform({ ...valid }, meta(DispatchFromBboxDto))).resolves.toBeDefined();
        });

        it('擋掉超出範圍的經緯度', async () => {
            await expect(
                pipe.transform(
                    { ...valid, bbox: { ...valid.bbox, maxLat: 999 } },
                    meta(DispatchFromBboxDto),
                ),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉缺少 bbox 的請求', async () => {
            const { bbox: _bbox, ...withoutBbox } = valid;
            await expect(pipe.transform(withoutBbox, meta(DispatchFromBboxDto))).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });
    });
});
