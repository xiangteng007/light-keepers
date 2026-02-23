import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntakeService } from './intake.service';
import { IntakeReport, IntakeReportStatus, IntakeReportType } from './entities/intake-report.entity';
import { MissionSession } from '../mission-sessions/entities/mission-session.entity';

describe('IntakeService', () => {
    let service: IntakeService;
    let intakeRepo: {
        create: jest.Mock;
        save: jest.Mock;
        findOne: jest.Mock;
        find: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let incidentRepo: {
        create: jest.Mock;
        save: jest.Mock;
        findOne: jest.Mock;
    };
    let eventEmitter: { emit: jest.Mock };
    let mockQb: any;

    beforeEach(async () => {
        mockQb = {
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };

        intakeRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'ir-1', ...d })),
            save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'ir-1', ...d })),
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };
        incidentRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'inc-1', ...d })),
            save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'inc-1', ...d })),
            findOne: jest.fn().mockResolvedValue(null),
        };
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IntakeService,
                { provide: getRepositoryToken(IntakeReport), useValue: intakeRepo },
                { provide: getRepositoryToken(MissionSession), useValue: incidentRepo },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<IntakeService>(IntakeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createIntake', () => {
        const dto = {
            title: '地震通報',
            description: '規模5.5地震',
            sourceType: IntakeReportType.CITIZEN,
        } as any;

        it('should create new incident when no incidentId', async () => {
            const result = await service.createIntake(dto, 'reporter-1');
            expect(result.isNewIncident).toBe(true);
            expect(result.incidentId).toBe('inc-1');
            expect(result.intakeId).toBe('ir-1');
            expect(incidentRepo.create).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('incidents.created', expect.any(Object));
            expect(eventEmitter.emit).toHaveBeenCalledWith('intake.submitted', expect.any(Object));
        });

        it('should link to existing incident when incidentId provided', async () => {
            incidentRepo.findOne.mockResolvedValueOnce({ id: 'inc-existing' });
            const result = await service.createIntake({ ...dto, incidentId: 'inc-existing' });
            expect(result.isNewIncident).toBe(false);
            expect(result.incidentId).toBe('inc-existing');
        });

        it('should throw when incidentId not found', async () => {
            await expect(service.createIntake({ ...dto, incidentId: 'bad-id' }))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findAll', () => {
        it('should return reports with default limit', async () => {
            await service.findAll();
            expect(mockQb.take).toHaveBeenCalledWith(50);
            expect(mockQb.skip).toHaveBeenCalledWith(0);
        });

        it('should apply status filter', async () => {
            await service.findAll({ status: IntakeReportStatus.RECEIVED });
            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'intake.status = :status',
                { status: IntakeReportStatus.RECEIVED },
            );
        });

        it('should apply sourceType filter', async () => {
            await service.findAll({ sourceType: IntakeReportType.CITIZEN });
            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'intake.sourceType = :sourceType',
                { sourceType: IntakeReportType.CITIZEN },
            );
        });
    });

    describe('findOne', () => {
        it('should throw NotFoundException', async () => {
            await expect(service.findOne('no-id')).rejects.toThrow(NotFoundException);
        });

        it('should return report with incident relation', async () => {
            intakeRepo.findOne.mockResolvedValueOnce({ id: 'ir-1', title: '通報' });
            const result = await service.findOne('ir-1');
            expect(result.title).toBe('通報');
        });
    });

    describe('findByIncident', () => {
        it('should return reports for incident', async () => {
            intakeRepo.find.mockResolvedValueOnce([{ id: 'ir-1' }, { id: 'ir-2' }]);
            const result = await service.findByIncident('inc-1');
            expect(result).toHaveLength(2);
        });
    });

    describe('updateStatus', () => {
        it('should update report status', async () => {
            intakeRepo.findOne.mockResolvedValueOnce({ id: 'ir-1', status: IntakeReportStatus.RECEIVED });
            const result = await service.updateStatus('ir-1', IntakeReportStatus.RECEIVED);
            expect(intakeRepo.save).toHaveBeenCalled();
        });
    });
});
