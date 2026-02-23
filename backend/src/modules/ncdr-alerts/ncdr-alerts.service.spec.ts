import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NcdrAlertsService } from './ncdr-alerts.service';
import { NcdrAlert } from './entities/ncdr-alert.entity';
import { LineBotService } from '../line-bot/line-bot.service';

describe('NcdrAlertsService', () => {
    let service: NcdrAlertsService;
    let alertRepo: any;

    const mockAlert: Partial<NcdrAlert> = {
        id: 'alert-1',
        alertTypeId: 36,
        alertTypeName: '地震速報',
        title: 'M5.2地震',
        severity: '嚴重' as any,
        isActive: true,
        latitude: 23.9,
        longitude: 121.5,
        sourceLink: 'https://example.com/cap.xml',
    };

    beforeEach(async () => {
        const qb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([[mockAlert], 1]),
            getMany: jest.fn().mockResolvedValue([mockAlert]),
            getCount: jest.fn().mockResolvedValue(5),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([{ typeId: 36, typeName: '地震速報', count: '5' }]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 3 }),
            delete: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NcdrAlertsService,
                {
                    provide: getRepositoryToken(NcdrAlert),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockAlert),
                        save: jest.fn().mockResolvedValue(mockAlert),
                        find: jest.fn().mockResolvedValue([mockAlert]),
                        findOne: jest.fn().mockResolvedValue(mockAlert),
                        count: jest.fn().mockResolvedValue(10),
                        delete: jest.fn().mockResolvedValue({ affected: 5 }),
                        createQueryBuilder: jest.fn().mockReturnValue(qb),
                    },
                },
                {
                    provide: LineBotService,
                    useValue: {
                        pushMessage: jest.fn().mockResolvedValue(undefined),
                        broadcast: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('test-cwa-key'),
                    },
                },
            ],
        }).compile();

        service = module.get<NcdrAlertsService>(NcdrAlertsService);
        alertRepo = module.get(getRepositoryToken(NcdrAlert));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Alert Type Definitions =====
    describe('getAlertTypes', () => {
        it('should return alert type definitions', () => {
            const types = service.getAlertTypes();
            expect(types).toBeInstanceOf(Array);
            expect(types.length).toBeGreaterThan(0);
            expect(types[0]).toHaveProperty('id');
            expect(types[0]).toHaveProperty('name');
        });
    });

    describe('getCoreAlertTypes', () => {
        it('should return core alert type IDs', () => {
            const coreIds = service.getCoreAlertTypes();
            expect(coreIds).toBeInstanceOf(Array);
            expect(coreIds.length).toBeGreaterThan(0);
            coreIds.forEach((id) => expect(typeof id).toBe('number'));
        });
    });

    // ===== Query =====
    describe('findAll', () => {
        it('should return paginated alerts', async () => {
            const result = await service.findAll({ page: 1, limit: 10 } as any);
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result.data).toEqual([mockAlert]);
        });

        it('should filter by type', async () => {
            const result = await service.findAll({ alertTypeId: 36, page: 1, limit: 10 } as any);
            expect(alertRepo.createQueryBuilder).toHaveBeenCalled();
            expect(result.data).toBeDefined();
        });
    });

    describe('findWithLocation', () => {
        it('should return alerts with coordinates', async () => {
            const result = await service.findWithLocation();
            expect(result).toEqual([mockAlert]);
        });

        it('should filter by types', async () => {
            const result = await service.findWithLocation([36]);
            expect(alertRepo.createQueryBuilder).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    // ===== Stats =====
    describe('getStats', () => {
        it('should return alert statistics', async () => {
            const result = await service.getStats();
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('active');
            expect(result).toHaveProperty('byType');
            expect(result).toHaveProperty('lastSyncTime');
        });
    });

    // ===== Maintenance =====
    describe('deactivateExpiredAlerts', () => {
        it('should deactivate expired alerts', async () => {
            const result = await service.deactivateExpiredAlerts();
            expect(typeof result).toBe('number');
        });
    });

    describe('clearAllAlerts', () => {
        it('should clear all alerts via QueryBuilder', async () => {
            const result = await service.clearAllAlerts();
            expect(result).toHaveProperty('deleted');
            expect(alertRepo.createQueryBuilder).toHaveBeenCalled();
        });
    });
});
