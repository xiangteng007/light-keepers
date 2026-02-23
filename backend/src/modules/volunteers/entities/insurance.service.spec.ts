import { InsuranceService } from './insurance.service';
import { NotFoundException } from '@nestjs/common';

describe('InsuranceService', () => {
    let service: InsuranceService;
    let repo: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    const mockInsurance = {
        id: 'i1', volunteerId: 'v1', insuranceType: 'personal',
        insuranceCompany: 'TestCo', isActive: true,
        validFrom: new Date('2026-01-01'), validTo: new Date('2027-01-01'),
        coversTasks: [],
    };

    beforeEach(() => {
        queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        repo = {
            create: jest.fn().mockImplementation(d => ({ id: 'i1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockInsurance]),
            findOne: jest.fn().mockResolvedValue(mockInsurance),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        service = new InsuranceService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('findByVolunteer', () => {
        it('should return all insurance for volunteer', async () => {
            const result = await service.findByVolunteer('v1');
            expect(result.length).toBe(1);
        });
    });

    describe('findActiveByVolunteer', () => {
        it('should return active insurance', async () => {
            const result = await service.findActiveByVolunteer('v1');
            expect(repo.find).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return insurance', async () => {
            const result = await service.findOne('i1');
            expect(result.id).toBe('i1');
        });

        it('should throw for not found', async () => {
            repo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create insurance', async () => {
            const result = await service.create({
                volunteerId: 'v1', insuranceType: 'group' as any,
                insuranceCompany: 'TestCo', validFrom: new Date(), validTo: new Date(),
            });
            expect(repo.create).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update insurance', async () => {
            const result = await service.update('i1', { insuranceCompany: 'NewCo' });
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('deactivate', () => {
        it('should deactivate insurance', async () => {
            const result = await service.deactivate('i1');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('checkCoverage', () => {
        it('should check coverage without task type', async () => {
            repo.find.mockResolvedValueOnce([mockInsurance]);
            const result = await service.checkCoverage('v1');
            expect(result.hasCoverage).toBeDefined();
        });
    });

    describe('getExpiring', () => {
        it('should return expiring insurance', async () => {
            const result = await service.getExpiring(30);
            expect(queryBuilder.where).toHaveBeenCalled();
        });
    });

    describe('getInsuranceTypes', () => {
        it('should return insurance types', () => {
            const types = service.getInsuranceTypes();
            expect(types.length).toBeGreaterThanOrEqual(3);
            expect(types[0].code).toBeDefined();
            expect(types[0].name).toBeDefined();
        });
    });
});
