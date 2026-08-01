import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AirRaidSheltersService } from './air-raid-shelters.service';
import { AirRaidShelter } from './entities/air-raid-shelter.entity';

describe('AirRaidSheltersService', () => {
    let service: AirRaidSheltersService;
    let repo: jest.Mocked<Repository<AirRaidShelter>>;

    const shelter = (overrides: Partial<AirRaidShelter> = {}): AirRaidShelter => ({
        id: 's1',
        sourceId: 'ARS-001',
        name: '測試防空避難處所',
        city: '臺北市',
        district: '中正區',
        address: '臺北市中正區忠孝東路一段1號',
        latitude: 25.0452,
        longitude: 121.5197,
        capacity: 100,
        basementLevels: 1,
        managingOrg: '測試管委會',
        contactPhone: '02-0000-0000',
        isActive: true,
        isGeocoded: false,
        lastImportedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AirRaidSheltersService,
                {
                    provide: getRepositoryToken(AirRaidShelter),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get(AirRaidSheltersService);
        repo = module.get(getRepositoryToken(AirRaidShelter));
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('findAll queries only active shelters', async () => {
        repo.find.mockResolvedValue([shelter()]);
        const result = await service.findAll();
        expect(repo.find).toHaveBeenCalledWith(
            expect.objectContaining({ where: { isActive: true } }),
        );
        expect(result).toHaveLength(1);
    });

    it('findNearby filters by radius and sorts by distance', async () => {
        const near = shelter({ id: 'near', latitude: 25.0452, longitude: 121.5197 });
        const far = shelter({ id: 'far', latitude: 22.6273, longitude: 120.3014 }); // Kaohsiung
        repo.find.mockResolvedValue([far, near]);

        const result = await service.findNearby(25.0452, 121.5197, 5);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('near');
    });

    it('findNearby excludes shelters without coordinates', async () => {
        repo.find.mockResolvedValue([shelter({ latitude: null as unknown as number, longitude: null as unknown as number })]);
        const result = await service.findNearby(25.0452, 121.5197, 5);
        expect(result).toHaveLength(0);
    });

    it('importFromCsv parses and upserts rows', async () => {
        repo.findOne.mockResolvedValue(null);
        repo.create.mockImplementation((entity) => entity as AirRaidShelter);
        repo.save.mockImplementation(async (entity) => entity as AirRaidShelter);

        const csv = '縣市,鄉鎮市區,地址,場所名稱,容納人數,地下樓層,管理單位,聯絡電話,緯度,經度\n' +
            '臺北市,中正區,臺北市中正區忠孝東路一段1號,忠孝大樓地下停車場,350,2,忠孝大樓管理委員會,02-0000-0000,25.0452,121.5197\n';

        const summary = await service.importFromCsv(csv);

        expect(summary.totalRows).toBe(1);
        expect(summary.inserted).toBe(1);
        expect(repo.save).toHaveBeenCalledTimes(1);
    });
});
