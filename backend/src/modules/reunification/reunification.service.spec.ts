import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReunificationService } from './reunification.service';
import { MissingPerson, MissingPersonStatus } from './entities/missing-person.entity';

describe('ReunificationService', () => {
    let service: ReunificationService;
    let repo: any;

    const mockPerson: Partial<MissingPerson> = {
        id: 'mp-1',
        missionSessionId: 'mission-1',
        name: '王小明',
        age: 35,
        gender: '男',
        status: MissingPersonStatus.MISSING,
        queryCode: 'ABC12345',
        contactPhone: '0912345678',
        isPublic: true,
        foundAt: null as any,
        foundLocation: null as any,
    };

    beforeEach(async () => {
        repo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'mp-new', ...d })),
            save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
            findOne: jest.fn().mockResolvedValue({ ...mockPerson }),
            find: jest.fn().mockResolvedValue([mockPerson]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReunificationService,
                { provide: getRepositoryToken(MissingPerson), useValue: repo },
            ],
        }).compile();

        service = module.get<ReunificationService>(ReunificationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== createReport =====
    describe('createReport', () => {
        it('should create report with queryCode and MISSING status', async () => {
            const result = await service.createReport({ name: '李小花', missionSessionId: 'mission-1' });
            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
                status: MissingPersonStatus.MISSING,
                queryCode: expect.any(String),
            }));
            expect(repo.save).toHaveBeenCalled();
        });

        it('should generate an 8-char query code', async () => {
            const result = await service.createReport({ name: '張三' });
            const createArgs = repo.create.mock.calls[0][0];
            expect(createArgs.queryCode).toHaveLength(8);
        });
    });

    // ===== findByQueryCode =====
    describe('findByQueryCode', () => {
        it('should return found person info by query code', async () => {
            const result = await service.findByQueryCode('ABC12345');
            expect(result.found).toBe(true);
            expect(result.status).toBe(MissingPersonStatus.MISSING);
            expect(result.name).toBe('王小明');
            expect(result.message).toContain('搜尋中');
        });

        it('should return not found for invalid code', async () => {
            repo.findOne.mockResolvedValueOnce(null);
            const result = await service.findByQueryCode('INVALID');
            expect(result.found).toBe(false);
            expect(result.message).toBe('查無此查詢碼');
        });

        it('should uppercase the query code', async () => {
            await service.findByQueryCode('abc12345');
            expect(repo.findOne).toHaveBeenCalledWith({
                where: { queryCode: 'ABC12345' },
            });
        });

        it('should return correct message for FOUND_SAFE', async () => {
            repo.findOne.mockResolvedValueOnce({ ...mockPerson, status: MissingPersonStatus.FOUND_SAFE });
            const result = await service.findByQueryCode('ABC12345');
            expect(result.message).toContain('平安');
        });

        it('should return correct message for FOUND_INJURED', async () => {
            repo.findOne.mockResolvedValueOnce({ ...mockPerson, status: MissingPersonStatus.FOUND_INJURED });
            const result = await service.findByQueryCode('ABC12345');
            expect(result.message).toContain('醫療');
        });

        it('should return correct message for REUNITED', async () => {
            repo.findOne.mockResolvedValueOnce({ ...mockPerson, status: MissingPersonStatus.REUNITED });
            const result = await service.findByQueryCode('ABC12345');
            expect(result.message).toContain('團聚');
        });
    });

    // ===== markFound =====
    describe('markFound', () => {
        it('should mark person as found safe', async () => {
            const result = await service.markFound('mp-1', MissingPersonStatus.FOUND_SAFE, {
                foundLocation: '台北市大安區',
            });
            expect(result.status).toBe(MissingPersonStatus.FOUND_SAFE);
            expect(result.foundAt).toBeDefined();
            expect(repo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException for missing id', async () => {
            repo.findOne.mockResolvedValueOnce(null);
            await expect(service.markFound('no-id', MissingPersonStatus.FOUND_SAFE, {}))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ===== markReunited =====
    describe('markReunited', () => {
        it('should mark person as reunited', async () => {
            const result = await service.markReunited('mp-1');
            expect(result.status).toBe(MissingPersonStatus.REUNITED);
        });
    });

    // ===== getByMission =====
    describe('getByMission', () => {
        it('should return all persons for mission', async () => {
            const result = await service.getByMission('mission-1');
            expect(repo.find).toHaveBeenCalledWith({
                where: { missionSessionId: 'mission-1' },
                order: { status: 'ASC', createdAt: 'DESC' },
            });
            expect(result).toHaveLength(1);
        });
    });

    // ===== getStats =====
    describe('getStats', () => {
        it('should return count by status', async () => {
            repo.find.mockResolvedValueOnce([
                { status: MissingPersonStatus.MISSING },
                { status: MissingPersonStatus.MISSING },
                { status: MissingPersonStatus.FOUND_SAFE },
                { status: MissingPersonStatus.REUNITED },
            ]);
            const stats = await service.getStats('mission-1');
            expect(stats.total).toBe(4);
            expect(stats.missing).toBe(2);
            expect(stats.foundSafe).toBe(1);
            expect(stats.reunited).toBe(1);
        });
    });
});
