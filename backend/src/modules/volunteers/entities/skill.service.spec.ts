import { SkillService } from './skill.service';
import { NotFoundException } from '@nestjs/common';

describe('SkillService', () => {
    let service: SkillService;
    let repo: Record<string, jest.Mock>;

    const mockSkill = { id: 'sk1', code: 'WATER_RESCUE', name: '水域救援', category: 'water', isActive: true, sortOrder: 1 };

    beforeEach(() => {
        repo = {
            create: jest.fn().mockImplementation(d => ({ id: 'sk1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockSkill]),
            findOne: jest.fn().mockImplementation(({ where }) => {
                if (where?.id === 'sk1' || where?.code === 'WATER_RESCUE') return Promise.resolve({ ...mockSkill });
                return Promise.resolve(null);
            }),
        };
        service = new SkillService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('findAll', () => {
        it('should return active skills', async () => {
            const result = await service.findAll();
            expect(result.length).toBe(1);
        });
    });

    describe('findByCategory', () => {
        it('should return skills by category', async () => {
            const result = await service.findByCategory('water' as any);
            expect(repo.find).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return skill', async () => {
            const result = await service.findOne('sk1');
            expect(result.code).toBe('WATER_RESCUE');
        });

        it('should throw for not found', async () => {
            await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create new skill', async () => {
            repo.findOne.mockResolvedValueOnce(null); // findByCode returns null
            const result = await service.create({
                code: 'DIVING', name: '潛水', category: 'water' as any,
            });
            expect(repo.create).toHaveBeenCalled();
        });

        it('should throw for duplicate code', async () => {
            await expect(service.create({
                code: 'WATER_RESCUE', name: 'Dup', category: 'water' as any,
            })).rejects.toThrow();
        });
    });

    describe('update', () => {
        it('should update skill', async () => {
            const result = await service.update('sk1', { name: '水域救援v2' });
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('deactivate / activate', () => {
        it('should deactivate skill', async () => {
            const result = await service.deactivate('sk1');
            expect(repo.save).toHaveBeenCalled();
        });

        it('should activate skill', async () => {
            const result = await service.activate('sk1');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getCategories', () => {
        it('should return category list', () => {
            const cats = service.getCategories();
            expect(cats.length).toBeGreaterThanOrEqual(7);
            expect(cats[0].code).toBeDefined();
        });
    });

    describe('seedDefaultSkills', () => {
        it('should seed skills without duplicates', async () => {
            repo.findOne.mockResolvedValue(null);
            await service.seedDefaultSkills();
            expect(repo.save).toHaveBeenCalled();
        });
    });
});
