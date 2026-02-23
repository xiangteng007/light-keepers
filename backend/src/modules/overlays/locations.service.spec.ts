import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';
import { LocationAlias } from './entities/location-alias.entity';

describe('LocationsService', () => {
    let service: LocationsService;
    const mockLoc = {
        id: 'loc1', source: 'gov', sourceId: 's1', name: 'Test', category: 'shelter',
        geometry: { type: 'Point', coordinates: [121.5, 25.0] },
        address: 'A st', city: 'Taipei', district: 'Daan', props: {}, version: 1,
        updatedAt: new Date(), aliases: [{ alias: 'Alt Name' }],
    };

    const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLoc]),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LocationsService,
                { provide: getRepositoryToken(Location), useValue: {
                    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
                    find: jest.fn().mockResolvedValue([mockLoc]),
                    findOne: jest.fn().mockResolvedValue(null),
                    create: jest.fn().mockReturnValue(mockLoc),
                    save: jest.fn().mockResolvedValue(mockLoc),
                } },
                { provide: getRepositoryToken(LocationAlias), useValue: {
                    create: jest.fn().mockReturnValue({}),
                    save: jest.fn().mockResolvedValue({}),
                    delete: jest.fn().mockResolvedValue({}),
                } },
            ],
        }).compile();
        service = module.get(LocationsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('search returns location DTOs', async () => {
        const result = await service.search({ q: 'shelter' });
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Test');
    });

    it('getChanges returns updated locations', async () => {
        const result = await service.getChanges({ since: '2024-01-01' });
        expect(result.length).toBe(1);
    });

    it('import processes locations', async () => {
        const result = await service.import({
            source: 'gov',
            locations: [{ name: 'New', category: 'hospital', latitude: 25, longitude: 121 }],
        } as any);
        expect(result.count).toBe(1);
    });
});
