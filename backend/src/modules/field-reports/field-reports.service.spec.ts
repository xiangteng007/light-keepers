import { FieldReportsService } from './field-reports.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('FieldReportsService', () => {
    let service: FieldReportsService;
    let reportRepo: Record<string, jest.Mock>;
    let auditService: Record<string, jest.Mock>;
    let gateway: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    const mockReport = {
        id: 'fr1', missionSessionId: 'ms1', type: 'hazard',
        severity: 3, message: '道路塌陷', version: 1,
        reporterUserId: 'u1', updatedAt: new Date(),
    };
    const mockUser = { uid: 'u1', displayName: 'Alice' };

    beforeEach(() => {
        queryBuilder = {
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ generatedMaps: [mockReport] }),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        reportRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...mockReport })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
        };
        auditService = { log: jest.fn().mockResolvedValue(undefined) };
        gateway = {
            emitReportCreated: jest.fn(),
            emitReportUpdated: jest.fn(),
        };
        service = new FieldReportsService(reportRepo as any, auditService as any, gateway as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('create', () => {
        it('should create field report with PostGIS', async () => {
            const result = await service.create('ms1', {
                type: 'hazard', category: 'road', severity: 3,
                message: '道路塌陷', latitude: 25.03, longitude: 121.56,
            } as any, mockUser);
            expect(queryBuilder.insert).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
            expect(gateway.emitReportCreated).toHaveBeenCalled();
        });
    });

    describe('findBySession', () => {
        it('should return paginated results', async () => {
            queryBuilder.getMany.mockResolvedValueOnce([mockReport]);
            const result = await service.findBySession('ms1', {});
            expect(result.data.length).toBe(1);
            expect(result.hasMore).toBe(false);
        });

        it('should handle hasMore when over limit', async () => {
            const manyReports = Array.from({ length: 101 }, (_, i) => ({
                ...mockReport, id: `fr${i}`, updatedAt: new Date(),
            }));
            queryBuilder.getMany.mockResolvedValueOnce(manyReports);
            const result = await service.findBySession('ms1', { limit: 100 } as any);
            expect(result.hasMore).toBe(true);
            expect(result.data.length).toBe(100);
        });
    });

    describe('update', () => {
        it('should update report with version check', async () => {
            const result = await service.update('fr1', { message: '已修復' } as any, 1, mockUser);
            expect(reportRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
            expect(gateway.emitReportUpdated).toHaveBeenCalled();
        });

        it('should throw NotFoundException for missing report', async () => {
            reportRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.update('bad', {} as any, 1, mockUser))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException for version mismatch', async () => {
            await expect(service.update('fr1', {} as any, 999, mockUser))
                .rejects.toThrow(ConflictException);
        });
    });

    describe('findById', () => {
        it('should return report', async () => {
            const result = await service.findById('fr1');
            expect(result).toBeDefined();
        });
    });

    describe('softDelete', () => {
        it('should soft-delete and audit', async () => {
            await service.softDelete('fr1', mockUser);
            expect(reportRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
        });

        it('should throw for not found', async () => {
            reportRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.softDelete('bad', mockUser)).rejects.toThrow(NotFoundException);
        });
    });
});
