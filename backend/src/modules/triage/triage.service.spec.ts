import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TriageService } from './triage.service';
import { Victim, TriageLevel, TransportStatus } from './entities/victim.entity';
import { MedicalLog, TreatmentType } from './entities/medical-log.entity';

describe('TriageService', () => {
    let service: TriageService;
    let victimRepo: any;
    let medicalLogRepo: any;

    const mockVictim: Partial<Victim> = {
        id: 'victim-1',
        braceletId: 'NFC-001',
        missionSessionId: 'mission-1',
        triageLevel: TriageLevel.YELLOW,
        canWalk: false,
        breathing: true,
        respiratoryRate: 18,
        hasRadialPulse: true,
        capillaryRefillTime: 1.5,
        canFollowCommands: true,
        transportStatus: TransportStatus.PENDING,
    };

    const mockLog: Partial<MedicalLog> = {
        id: 'log-1',
        victimId: 'victim-1',
        type: TreatmentType.TRIAGE_ASSESSMENT,
        content: '初始檢傷評估: YELLOW',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TriageService,
                {
                    provide: getRepositoryToken(Victim),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'victim-1', ...dto })),
                        save: jest.fn().mockImplementation((v) => Promise.resolve(v)),
                        find: jest.fn().mockResolvedValue([mockVictim]),
                        findOne: jest.fn().mockResolvedValue(mockVictim),
                    },
                },
                {
                    provide: getRepositoryToken(MedicalLog),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'log-1', ...dto })),
                        save: jest.fn().mockImplementation((l) => Promise.resolve(l)),
                        find: jest.fn().mockResolvedValue([mockLog]),
                    },
                },
            ],
        }).compile();

        service = module.get<TriageService>(TriageService);
        victimRepo = module.get(getRepositoryToken(Victim));
        medicalLogRepo = module.get(getRepositoryToken(MedicalLog));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== START Triage Algorithm =====
    describe('calculateTriageLevel', () => {
        it('GREEN: can walk', () => {
            expect(service.calculateTriageLevel({ canWalk: true })).toBe(TriageLevel.GREEN);
        });

        it('BLACK: no breathing', () => {
            expect(service.calculateTriageLevel({ canWalk: false, breathing: false })).toBe(TriageLevel.BLACK);
        });

        it('RED: respiratory rate > 30', () => {
            expect(service.calculateTriageLevel({
                canWalk: false, breathing: true, respiratoryRate: 35,
            })).toBe(TriageLevel.RED);
        });

        it('RED: respiratory rate < 10', () => {
            expect(service.calculateTriageLevel({
                canWalk: false, breathing: true, respiratoryRate: 8,
            })).toBe(TriageLevel.RED);
        });

        it('RED: no radial pulse', () => {
            expect(service.calculateTriageLevel({
                canWalk: false, breathing: true, respiratoryRate: 18, hasRadialPulse: false,
            })).toBe(TriageLevel.RED);
        });

        it('RED: capillary refill > 2s', () => {
            expect(service.calculateTriageLevel({
                canWalk: false, breathing: true, respiratoryRate: 18,
                hasRadialPulse: true, capillaryRefillTime: 3,
            })).toBe(TriageLevel.RED);
        });

        it('RED: cannot follow commands', () => {
            expect(service.calculateTriageLevel({
                canWalk: false, breathing: true, respiratoryRate: 18,
                hasRadialPulse: true, capillaryRefillTime: 1.5, canFollowCommands: false,
            })).toBe(TriageLevel.RED);
        });

        it('YELLOW: passes all checks', () => {
            expect(service.calculateTriageLevel({
                canWalk: false, breathing: true, respiratoryRate: 18,
                hasRadialPulse: true, capillaryRefillTime: 1.5, canFollowCommands: true,
            })).toBe(TriageLevel.YELLOW);
        });
    });

    // ===== CRUD =====
    describe('createVictim', () => {
        it('should auto-calculate triage level and create victim', async () => {
            const dto = {
                missionSessionId: 'mission-1',
                canWalk: true,
                breathing: true,
                assessorId: 'user-1',
                assessorName: '急救員#1',
            };
            const result = await service.createVictim(dto as any);
            expect(victimRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ triageLevel: TriageLevel.GREEN }),
            );
            expect(result).toBeDefined();
        });

        it('should create medical log on victim creation', async () => {
            const dto = {
                missionSessionId: 'mission-1',
                canWalk: false,
                breathing: false,
            };
            await service.createVictim(dto as any);
            expect(medicalLogRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ type: TreatmentType.TRIAGE_ASSESSMENT }),
            );
        });
    });

    describe('getVictim', () => {
        it('should return victim by id', async () => {
            const result = await service.getVictim('victim-1');
            expect(result).toEqual(mockVictim);
        });

        it('should throw NotFoundException', async () => {
            victimRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.getVictim('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getVictimByBracelet', () => {
        it('should return victim by bracelet', async () => {
            const result = await service.getVictimByBracelet('NFC-001');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            victimRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.getVictimByBracelet('INVALID')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getVictimsByMission', () => {
        it('should return victims for a mission', async () => {
            const result = await service.getVictimsByMission('mission-1');
            expect(result).toEqual([mockVictim]);
        });
    });

    // ===== updateTriage =====
    describe('updateTriage', () => {
        it('should recalculate level on assessment update', async () => {
            const dto = { canWalk: true };
            const result = await service.updateTriage('victim-1', dto as any);
            expect(victimRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should use explicit triageLevel if provided', async () => {
            const dto = { triageLevel: TriageLevel.RED };
            await service.updateTriage('victim-1', dto as any);
            expect(victimRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ triageLevel: TriageLevel.RED }),
            );
        });

        it('should log level change', async () => {
            const dto = { canWalk: true }; // changes YELLOW → GREEN
            await service.updateTriage('victim-1', dto as any, 'user-1', '急救員');
            expect(medicalLogRepo.create).toHaveBeenCalled();
        });
    });

    // ===== Transport =====
    describe('startTransport', () => {
        it('should start transport', async () => {
            const dto = {
                hospitalId: 'hosp-1',
                hospitalName: '台大醫院',
                ambulanceId: 'AMB-01',
            };
            const result = await service.startTransport('victim-1', dto as any);
            expect(result.transportStatus).toBe(TransportStatus.IN_TRANSIT);
        });

        it('should reject if already in transit', async () => {
            victimRepo.findOne.mockResolvedValueOnce({
                ...mockVictim, transportStatus: TransportStatus.IN_TRANSIT,
            });
            await expect(service.startTransport('victim-1', {} as any))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('confirmArrival', () => {
        it('should confirm arrival', async () => {
            victimRepo.findOne.mockResolvedValueOnce({
                ...mockVictim, transportStatus: TransportStatus.IN_TRANSIT,
            });
            const result = await service.confirmArrival('victim-1');
            expect(result.transportStatus).toBe(TransportStatus.ARRIVED);
        });
    });

    // ===== Medical Logs =====
    describe('addMedicalLog', () => {
        it('should add medical log', async () => {
            const dto = { type: TreatmentType.MEDICATION, content: '給予止痛藥' };
            const result = await service.addMedicalLog('victim-1', dto as any);
            expect(medicalLogRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('getMedicalLogs', () => {
        it('should return logs for victim', async () => {
            const result = await service.getMedicalLogs('victim-1');
            expect(result).toEqual([mockLog]);
        });
    });

    // ===== Stats =====
    describe('getStats', () => {
        it('should return triage stats', async () => {
            victimRepo.find.mockResolvedValueOnce([
                { ...mockVictim, triageLevel: TriageLevel.RED, transportStatus: TransportStatus.PENDING },
                { ...mockVictim, triageLevel: TriageLevel.GREEN, transportStatus: TransportStatus.ARRIVED },
                { ...mockVictim, triageLevel: TriageLevel.YELLOW, transportStatus: TransportStatus.IN_TRANSIT },
            ]);
            const result = await service.getStats('mission-1');
            expect(result.total).toBe(3);
            expect(result.red).toBe(1);
            expect(result.green).toBe(1);
            expect(result.yellow).toBe(1);
            expect(result.pendingTransport).toBe(1);
            expect(result.inTransit).toBe(1);
            expect(result.arrived).toBe(1);
        });
    });
});
