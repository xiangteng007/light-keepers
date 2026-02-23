import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuConfigService } from './menu-config.service';
import { MenuConfig } from './menu-config.entity';

describe('MenuConfigService', () => {
    let service: MenuConfigService;
    let repo: {
        find: jest.Mock;
        findOne: jest.Mock;
        upsert: jest.Mock;
    };

    beforeEach(async () => {
        repo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MenuConfigService,
                { provide: getRepositoryToken(MenuConfig), useValue: repo },
            ],
        }).compile();

        service = module.get<MenuConfigService>(MenuConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAll', () => {
        it('should return menu items ordered by ASC', async () => {
            repo.find.mockResolvedValueOnce([
                { id: '1', label: 'Dashboard', order: 1 },
                { id: '2', label: 'Events', order: 2 },
            ]);
            const result = await service.getAll();
            expect(result).toHaveLength(2);
            expect(repo.find).toHaveBeenCalledWith({ order: { order: 'ASC' } });
        });
    });

    describe('updateAll', () => {
        it('should upsert items and return updated list', async () => {
            const items = [
                { id: '1', label: 'Dashboard', order: 0 },
                { id: '2', label: 'Events', order: 1 },
            ];
            repo.find.mockResolvedValueOnce(items);
            const result = await service.updateAll(items);
            expect(repo.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: '1', label: 'Dashboard' }),
                ]),
                ['id'],
            );
            expect(result).toHaveLength(2);
        });

        it('should use index as fallback order', async () => {
            const items = [
                { id: '1', label: 'A', order: undefined as any },
                { id: '2', label: 'B', order: undefined as any },
            ];
            repo.find.mockResolvedValueOnce([]);
            await service.updateAll(items);
            expect(repo.upsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: '1', order: 0 }),
                    expect.objectContaining({ id: '2', order: 1 }),
                ]),
                ['id'],
            );
        });
    });

    describe('getById', () => {
        it('should return item by id', async () => {
            repo.findOne.mockResolvedValueOnce({ id: '1', label: 'Dashboard' });
            const result = await service.getById('1');
            expect(result?.label).toBe('Dashboard');
        });

        it('should return null when not found', async () => {
            const result = await service.getById('nonexistent');
            expect(result).toBeNull();
        });
    });
});
