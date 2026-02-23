import { VehicleService } from './vehicle.service';
import { NotFoundException } from '@nestjs/common';

describe('VehicleService', () => {
    let service: VehicleService;
    let repo: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    const mockVehicle = {
        id: 'vh1', volunteerId: 'v1', licensePlate: 'ABC-1234',
        vehicleType: 'car', isActive: true, brand: 'Toyota',
    };

    beforeEach(() => {
        queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        repo = {
            create: jest.fn().mockImplementation(d => ({ id: 'vh1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([mockVehicle]),
            findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...mockVehicle })),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        service = new VehicleService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('findByVolunteer', () => {
        it('should return volunteer vehicles', async () => {
            const result = await service.findByVolunteer('v1');
            expect(result.length).toBe(1);
        });
    });

    describe('findOne', () => {
        it('should return vehicle', async () => {
            const result = await service.findOne('vh1');
            expect(result.licensePlate).toBe('ABC-1234');
        });

        it('should throw for not found', async () => {
            repo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create vehicle', async () => {
            const result = await service.create({
                volunteerId: 'v1', licensePlate: 'XYZ-9999', vehicleType: 'motorcycle' as any,
            });
            expect(repo.create).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update vehicle', async () => {
            const result = await service.update('vh1', { brand: 'Honda' });
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('deactivate', () => {
        it('should soft-delete vehicle', async () => {
            const result = await service.deactivate('vh1');
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getExpiringInsurance', () => {
        it('should query expiring vehicle insurance', async () => {
            const result = await service.getExpiringInsurance(30);
            expect(queryBuilder.where).toHaveBeenCalled();
        });
    });

    describe('getVehicleTypes', () => {
        it('should return vehicle types', () => {
            const types = service.getVehicleTypes();
            expect(types.length).toBeGreaterThanOrEqual(6);
        });
    });

    describe('getVehiclePurposes', () => {
        it('should return vehicle purposes', () => {
            const purposes = service.getVehiclePurposes();
            expect(purposes.length).toBeGreaterThanOrEqual(5);
        });
    });
});
