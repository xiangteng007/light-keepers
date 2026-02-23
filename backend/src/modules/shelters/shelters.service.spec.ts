import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SheltersService } from './shelters.service';
import {
    Shelter,
    ShelterStatus,
    ShelterEvacuee,
    EvacueeStatus,
    ShelterHealthScreening,
    ShelterDailyReport,
} from './entities/shelter.entity';

describe('SheltersService', () => {
    let service: SheltersService;
    let shelterRepo: any;
    let evacueeRepo: any;
    let screeningRepo: any;
    let reportRepo: any;

    const mockShelter: Partial<Shelter> = {
        id: 'shelter-1',
        name: '中正區避難所',
        address: '台北市中正區中山南路1號',
        capacity: 200,
        currentOccupancy: 50,
        status: ShelterStatus.OPEN,
        latitude: 25.033,
        longitude: 121.517,
    };

    const mockEvacuee: Partial<ShelterEvacuee> = {
        id: 'evacuee-1',
        name: '王大明',
        idNumber: 'A1***6789',
        shelterId: 'shelter-1',
        status: EvacueeStatus.CHECKED_IN,
        queryCode: 'QC-A1B2C3',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SheltersService,
                {
                    provide: getRepositoryToken(Shelter),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockShelter),
                        save: jest.fn().mockResolvedValue(mockShelter),
                        find: jest.fn().mockResolvedValue([mockShelter]),
                        findOne: jest.fn().mockResolvedValue(mockShelter),
                    },
                },
                {
                    provide: getRepositoryToken(ShelterEvacuee),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockEvacuee),
                        save: jest.fn().mockResolvedValue(mockEvacuee),
                        find: jest.fn().mockResolvedValue([mockEvacuee]),
                        findOne: jest.fn().mockResolvedValue(mockEvacuee),
                        count: jest.fn().mockResolvedValue(5),
                    },
                },
                {
                    provide: getRepositoryToken(ShelterHealthScreening),
                    useValue: {
                        save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 'screen-1', ...s })),
                        find: jest.fn().mockResolvedValue([]),
                        count: jest.fn().mockResolvedValue(0),
                    },
                },
                {
                    provide: getRepositoryToken(ShelterDailyReport),
                    useValue: {
                        save: jest.fn().mockImplementation((r) => Promise.resolve({ id: 'report-1', ...r })),
                        find: jest.fn().mockResolvedValue([]),
                        findOne: jest.fn().mockResolvedValue(null),
                    },
                },
            ],
        }).compile();

        service = module.get<SheltersService>(SheltersService);
        shelterRepo = module.get(getRepositoryToken(Shelter));
        evacueeRepo = module.get(getRepositoryToken(ShelterEvacuee));
        screeningRepo = module.get(getRepositoryToken(ShelterHealthScreening));
        reportRepo = module.get(getRepositoryToken(ShelterDailyReport));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== CRUD =====
    describe('create', () => {
        it('should create a shelter', async () => {
            const dto = { name: '中正區避難所', address: '台北市', capacity: 200 };
            const result = await service.create(dto as any);
            expect(shelterRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('findAll', () => {
        it('should return all shelters', async () => {
            const result = await service.findAll();
            expect(result).toEqual([mockShelter]);
        });
    });

    describe('findById', () => {
        it('should return a shelter by id', async () => {
            const result = await service.findById('shelter-1');
            expect(result).toEqual(mockShelter);
        });

        it('should throw NotFoundException', async () => {
            shelterRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByStatus', () => {
        it('should return shelters by status', async () => {
            const result = await service.findByStatus(ShelterStatus.OPEN);
            expect(shelterRepo.find).toHaveBeenCalled();
            expect(result).toEqual([mockShelter]);
        });
    });

    // ===== Activation =====
    describe('activate', () => {
        it('should activate a shelter', async () => {
            const standby = { ...mockShelter, status: ShelterStatus.STANDBY };
            shelterRepo.findOne.mockResolvedValueOnce(standby);
            const result = await service.activate('shelter-1', { capacity: 200 } as any, 'admin-1');
            expect(shelterRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('deactivate', () => {
        it('should deactivate a shelter with no evacuees', async () => {
            shelterRepo.findOne.mockResolvedValueOnce({ ...mockShelter, currentOccupancy: 0 });
            const result = await service.deactivate('shelter-1');
            expect(shelterRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should reject if shelter has evacuees', async () => {
            // mockShelter has currentOccupancy: 50
            await expect(service.deactivate('shelter-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ===== Check-in / Check-out =====
    describe('checkIn', () => {
        it('should check in an evacuee', async () => {
            // Shelter is OPEN and not at capacity
            const dto = { name: '王大明', idNumber: 'A123456789' };
            const result = await service.checkIn('shelter-1', dto as any, 'admin-1');
            expect(evacueeRepo.save).toHaveBeenCalled();
            expect(shelterRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should reject if shelter is not open', async () => {
            shelterRepo.findOne.mockResolvedValueOnce({ ...mockShelter, status: ShelterStatus.INACTIVE });
            await expect(service.checkIn('shelter-1', { name: 'test' } as any, 'admin-1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('checkOut', () => {
        it('should check out a checked-in evacuee', async () => {
            // evacuee mock already has CHECKED_IN status
            const result = await service.checkOut('shelter-1', 'evacuee-1', 'admin-1');
            expect(evacueeRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw if evacuee not found', async () => {
            evacueeRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.checkOut('shelter-1', 'nonexistent', 'admin-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should reject if already checked out', async () => {
            evacueeRepo.findOne.mockResolvedValueOnce({ ...mockEvacuee, status: EvacueeStatus.CHECKED_OUT });
            await expect(service.checkOut('shelter-1', 'evacuee-1', 'admin-1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('getEvacuees', () => {
        it('should return evacuees for a shelter', async () => {
            const result = await service.getEvacuees('shelter-1');
            expect(result).toEqual([mockEvacuee]);
        });
    });

    // ===== Query Code =====
    describe('queryByCode', () => {
        it('should find evacuee by query code', async () => {
            evacueeRepo.findOne.mockResolvedValueOnce({ ...mockEvacuee, shelter: mockShelter });
            const result = await service.queryByCode('QC-A1B2C3');
            expect(result.found).toBe(true);
            expect(result.evacuee).toBeDefined();
        });

        it('should return found: false for invalid code', async () => {
            evacueeRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.queryByCode('INVALID');
            expect(result.found).toBe(false);
        });
    });

    // ===== Health Screening =====
    describe('createHealthScreening', () => {
        it('should create a health screening', async () => {
            const dto = { temperature: 36.5, bloodPressure: '120/80' };
            const result = await service.createHealthScreening('shelter-1', 'evacuee-1', dto as any, 'admin-1');
            expect(screeningRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw if evacuee not found', async () => {
            evacueeRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.createHealthScreening('shelter-1', 'nonexistent', {} as any, 'admin-1'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('getHealthScreenings', () => {
        it('should return screenings', async () => {
            const result = await service.getHealthScreenings('shelter-1');
            expect(screeningRepo.find).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    // ===== Bed Assignment =====
    describe('assignBed', () => {
        it('should assign a bed', async () => {
            const dto = { bedNumber: 'A-01', zone: 'A' };
            const result = await service.assignBed('shelter-1', 'evacuee-1', dto as any);
            expect(evacueeRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    // ===== Daily Reports =====
    describe('createDailyReport', () => {
        it('should create a daily report', async () => {
            const dto = { notes: '今日無異常' };
            const result = await service.createDailyReport('shelter-1', dto as any, 'admin-1');
            expect(reportRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should reject if report already exists today', async () => {
            reportRepo.findOne.mockResolvedValueOnce({ id: 'existing' });
            await expect(service.createDailyReport('shelter-1', {} as any, 'admin-1'))
                .rejects.toThrow(ConflictException);
        });
    });

    describe('getDailyReports', () => {
        it('should return daily reports', async () => {
            const result = await service.getDailyReports('shelter-1');
            expect(reportRepo.find).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });
});
