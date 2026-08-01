import { Repository } from 'typeorm';
import { parseAirRaidShelterCsv, upsertAirRaidShelters, AirRaidShelterCsvRow } from './air-raid-shelters.importer';
import { AirRaidShelter } from './entities/air-raid-shelter.entity';

const SAMPLE_CSV = `編號,縣市,鄉鎮市區,地址,場所名稱,容納人數,地下樓層,管理單位,聯絡電話,緯度,經度
ARS-001,臺北市,中正區,臺北市中正區忠孝東路一段1號,忠孝大樓地下停車場,350,2,忠孝大樓管理委員會,02-2311-0001,25.0452,121.5197
ARS-002,新北市,板橋區,新北市板橋區文化路二段182號,文化社區活動中心地下室,200,1,板橋區公所,02-2960-0002,25.0147,121.4627
ARS-003,臺中市,西區,臺中市西區英才路600號,英才國宅地下停車場,150,1,英才國宅管理委員會,04-2301-0003,,
`;

describe('parseAirRaidShelterCsv', () => {
    it('parses data.gov.tw style CSV rows', () => {
        const rows = parseAirRaidShelterCsv(SAMPLE_CSV);
        expect(rows).toHaveLength(3);
        expect(rows[0]).toMatchObject({
            sourceId: 'ARS-001',
            name: '忠孝大樓地下停車場',
            city: '臺北市',
            district: '中正區',
            address: '臺北市中正區忠孝東路一段1號',
            capacity: 350,
            basementLevels: 2,
            managingOrg: '忠孝大樓管理委員會',
            contactPhone: '02-2311-0001',
            latitude: 25.0452,
            longitude: 121.5197,
        });
    });

    it('leaves coordinates null when CSV omits them', () => {
        const rows = parseAirRaidShelterCsv(SAMPLE_CSV);
        const row = rows.find((r) => r.sourceId === 'ARS-003');
        expect(row?.latitude).toBeNull();
        expect(row?.longitude).toBeNull();
    });

    it('skips rows without an address (address is the upsert dedupe key)', () => {
        const csv = '縣市,地址,場所名稱\n臺北市,,無地址測試\n';
        const rows = parseAirRaidShelterCsv(csv);
        expect(rows).toHaveLength(0);
    });

    it('falls back to address as name when name column is missing', () => {
        const csv = '地址\n臺北市中正區某路1號\n';
        const rows = parseAirRaidShelterCsv(csv);
        expect(rows[0].name).toBe('臺北市中正區某路1號');
    });
});

describe('upsertAirRaidShelters', () => {
    function makeRepoMock(existing: AirRaidShelter | null = null) {
        return {
            findOne: jest.fn().mockResolvedValue(existing),
            create: jest.fn((entity) => entity as AirRaidShelter),
            save: jest.fn(async (entity) => entity as AirRaidShelter),
        } as unknown as jest.Mocked<Repository<AirRaidShelter>>;
    }

    const row = (overrides: Partial<AirRaidShelterCsvRow> = {}): AirRaidShelterCsvRow => ({
        sourceId: 'ARS-001',
        name: '測試設施',
        city: '臺北市',
        district: '中正區',
        address: '臺北市中正區忠孝東路一段1號',
        capacity: 100,
        basementLevels: 1,
        managingOrg: '測試單位',
        contactPhone: '02-0000-0000',
        latitude: 25.0452,
        longitude: 121.5197,
        ...overrides,
    });

    it('inserts a new shelter when address does not already exist', async () => {
        const repo = makeRepoMock(null);
        const summary = await upsertAirRaidShelters(repo, [row()]);

        expect(summary.inserted).toBe(1);
        expect(summary.updated).toBe(0);
        expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('updates an existing shelter with the same address (dedupe by address)', async () => {
        const existing = {
            id: 'existing-1',
            address: row().address,
            capacity: 1,
        } as AirRaidShelter;
        const repo = makeRepoMock(existing);

        const summary = await upsertAirRaidShelters(repo, [row({ capacity: 999 })]);

        expect(summary.inserted).toBe(0);
        expect(summary.updated).toBe(1);
        expect(repo.findOne).toHaveBeenCalledWith({ where: { address: row().address } });
        expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ capacity: 999 }));
    });

    it('records addresses with missing coordinates when no geocode fn is provided', async () => {
        const repo = makeRepoMock(null);
        const summary = await upsertAirRaidShelters(repo, [row({ latitude: null, longitude: null })]);

        expect(summary.missingCoordinates).toEqual([row().address]);
    });

    it('uses the provided geocode function to fill in missing coordinates', async () => {
        const repo = makeRepoMock(null);
        const geocode = jest.fn().mockResolvedValue({ lat: 1.23, lng: 4.56 });

        const summary = await upsertAirRaidShelters(repo, [row({ latitude: null, longitude: null })], { geocode });

        expect(geocode).toHaveBeenCalledWith(row().address);
        expect(summary.missingCoordinates).toHaveLength(0);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ latitude: 1.23, longitude: 4.56, isGeocoded: true }),
        );
    });

    it('counts a row as skipped when save throws', async () => {
        const repo = makeRepoMock(null);
        (repo.save as jest.Mock).mockRejectedValueOnce(new Error('db error'));

        const summary = await upsertAirRaidShelters(repo, [row()]);

        expect(summary.skipped).toBe(1);
        expect(summary.inserted).toBe(0);
    });
});
