import { Test, TestingModule } from '@nestjs/testing';
import { CoreJwtGuard } from '../shared/guards';
import { SkillsController, VehiclesController, InsuranceController, PointsController, CheckInController, ExpiryNotificationController } from './vms.controller';
import { SkillService } from './entities/skill.service';
import { VehicleService } from './entities/vehicle.service';
import { InsuranceService } from './entities/insurance.service';
import { PointsService } from './entities/points.service';
import { CheckInService } from './entities/checkin.service';
import { ExpiryNotificationService } from './entities/expiry-notification.service';

describe('VMS Controllers', () => {
    describe('SkillsController', () => {
        let controller: SkillsController;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [SkillsController],
                providers: [{ provide: SkillService, useValue: {
                    findAll: jest.fn().mockResolvedValue([]),
                    getCategories: jest.fn().mockReturnValue([]),
                    findOne: jest.fn().mockResolvedValue({}),
                    create: jest.fn().mockResolvedValue({}),
                    update: jest.fn().mockResolvedValue({}),
                    seedDefaultSkills: jest.fn().mockResolvedValue(undefined),
                } }],
            }).overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true }).compile();
            controller = module.get(SkillsController);
        });
        it('should be defined', () => expect(controller).toBeDefined());
        it('findAll', async () => expect(await controller.findAll()).toEqual([]));
        it('getCategories', () => expect(controller.getCategories()).toEqual([]));
        it('findOne', async () => expect(await controller.findOne('1')).toBeDefined());
        it('create', async () => expect(await controller.create({} as any)).toBeDefined());
        it('update', async () => expect(await controller.update('1', {} as any)).toBeDefined());
        it('seedSkills', async () => expect((await controller.seedSkills()).success).toBe(true));
    });

    describe('VehiclesController', () => {
        let controller: VehiclesController;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [VehiclesController],
                providers: [{ provide: VehicleService, useValue: {
                    findByVolunteer: jest.fn().mockResolvedValue([]),
                    getVehicleTypes: jest.fn().mockReturnValue([]),
                    getVehiclePurposes: jest.fn().mockReturnValue([]),
                    getExpiringInsurance: jest.fn().mockResolvedValue([]),
                    findOne: jest.fn().mockResolvedValue({}),
                    create: jest.fn().mockResolvedValue({}),
                    update: jest.fn().mockResolvedValue({}),
                    deactivate: jest.fn().mockResolvedValue({}),
                } }],
            }).overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true }).compile();
            controller = module.get(VehiclesController);
        });
        it('should be defined', () => expect(controller).toBeDefined());
        it('findByVolunteer', async () => expect(await controller.findByVolunteer('v1')).toEqual([]));
        it('getVehicleTypes', () => expect(controller.getVehicleTypes()).toEqual([]));
        it('getVehiclePurposes', () => expect(controller.getVehiclePurposes()).toEqual([]));
        it('getExpiringInsurance', async () => expect(await controller.getExpiringInsurance()).toEqual([]));
        it('findOne', async () => expect(await controller.findOne('1')).toBeDefined());
        it('create', async () => expect(await controller.create({} as any)).toBeDefined());
        it('update', async () => expect(await controller.update('1', {} as any)).toBeDefined());
        it('deactivate', async () => expect(await controller.deactivate('1')).toBeDefined());
    });

    describe('InsuranceController', () => {
        let controller: InsuranceController;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [InsuranceController],
                providers: [{ provide: InsuranceService, useValue: {
                    findByVolunteer: jest.fn().mockResolvedValue([]),
                    findActiveByVolunteer: jest.fn().mockResolvedValue([]),
                    getInsuranceTypes: jest.fn().mockReturnValue([]),
                    getExpiring: jest.fn().mockResolvedValue([]),
                    checkCoverage: jest.fn().mockResolvedValue({}),
                    findOne: jest.fn().mockResolvedValue({}),
                    create: jest.fn().mockResolvedValue({}),
                    update: jest.fn().mockResolvedValue({}),
                    deactivate: jest.fn().mockResolvedValue({}),
                } }],
            }).overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true }).compile();
            controller = module.get(InsuranceController);
        });
        it('should be defined', () => expect(controller).toBeDefined());
        it('findByVolunteer', async () => expect(await controller.findByVolunteer('v1')).toEqual([]));
        it('findActiveByVolunteer', async () => expect(await controller.findActiveByVolunteer('v1')).toEqual([]));
        it('getInsuranceTypes', () => expect(controller.getInsuranceTypes()).toEqual([]));
        it('getExpiring', async () => expect(await controller.getExpiring()).toEqual([]));
        it('checkCoverage', async () => expect(await controller.checkCoverage({ volunteerId: 'v1' })).toBeDefined());
        it('findOne', async () => expect(await controller.findOne('1')).toBeDefined());
        it('create', async () => expect(await controller.create({} as any)).toBeDefined());
        it('update', async () => expect(await controller.update('1', {} as any)).toBeDefined());
        it('deactivate', async () => expect(await controller.deactivate('1')).toBeDefined());
    });

    describe('PointsController', () => {
        let controller: PointsController;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [PointsController],
                providers: [{ provide: PointsService, useValue: {
                    findByVolunteer: jest.fn().mockResolvedValue([]),
                    getVolunteerSummary: jest.fn().mockResolvedValue({}),
                    getYearlySummary: jest.fn().mockResolvedValue({}),
                    create: jest.fn().mockResolvedValue({}),
                    recordTaskPoints: jest.fn().mockResolvedValue({}),
                    recordTrainingPoints: jest.fn().mockResolvedValue({}),
                    adjustPoints: jest.fn().mockResolvedValue({}),
                    exportReport: jest.fn().mockResolvedValue([]),
                } }],
            }).overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true }).compile();
            controller = module.get(PointsController);
        });
        it('should be defined', () => expect(controller).toBeDefined());
        it('findByVolunteer', async () => expect(await controller.findByVolunteer('v1')).toEqual([]));
        it('getVolunteerSummary', async () => expect(await controller.getVolunteerSummary('v1')).toBeDefined());
        it('getYearlySummary', async () => expect(await controller.getYearlySummary('v1', '2024')).toBeDefined());
        it('createRecord', async () => expect(await controller.createRecord({} as any)).toBeDefined());
        it('recordTaskPoints', async () => expect(await controller.recordTaskPoints({ volunteerId: 'v1', taskId: 't1', hours: 5 })).toBeDefined());
        it('recordTrainingPoints', async () => expect(await controller.recordTrainingPoints({ volunteerId: 'v1', hours: 3, description: 'test' })).toBeDefined());
        it('adjustPoints', async () => expect(await controller.adjustPoints({ volunteerId: 'v1', points: 10, description: 'adj', recordedBy: 'admin' })).toBeDefined());
        it('exportReport', async () => expect(await controller.exportReport('2024-01-01', '2024-12-31')).toEqual([]));
    });

    describe('CheckInController', () => {
        let controller: CheckInController;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [CheckInController],
                providers: [{ provide: CheckInService, useValue: {
                    checkIn: jest.fn().mockResolvedValue({}),
                    checkOut: jest.fn().mockResolvedValue({}),
                    getCheckInStatus: jest.fn().mockResolvedValue({}),
                    getActiveCheckIns: jest.fn().mockResolvedValue([]),
                    cancelCheckIn: jest.fn().mockResolvedValue(undefined),
                } }],
            }).overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true }).compile();
            controller = module.get(CheckInController);
        });
        it('should be defined', () => expect(controller).toBeDefined());
        it('checkIn', async () => expect(await controller.checkIn({} as any)).toBeDefined());
        it('checkOut', async () => expect(await controller.checkOut({} as any)).toBeDefined());
        it('getStatus', async () => expect(await controller.getStatus('v1')).toBeDefined());
        it('getActiveCheckIns', async () => expect(await controller.getActiveCheckIns()).toEqual([]));
        it('cancelCheckIn', async () => expect(await controller.cancelCheckIn('v1')).toEqual({ success: true }));
    });

    describe('ExpiryNotificationController', () => {
        let controller: ExpiryNotificationController;
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                controllers: [ExpiryNotificationController],
                providers: [{ provide: ExpiryNotificationService, useValue: {
                    getExpiringItems: jest.fn().mockResolvedValue([]),
                    getExpiringItemsForVolunteer: jest.fn().mockResolvedValue([]),
                    getTodayNotifications: jest.fn().mockResolvedValue([]),
                    sendLineNotifications: jest.fn().mockResolvedValue(3),
                } }],
            }).overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true }).compile();
            controller = module.get(ExpiryNotificationController);
        });
        it('should be defined', () => expect(controller).toBeDefined());
        it('getExpiringItems', async () => expect(await controller.getExpiringItems()).toEqual([]));
        it('getExpiringItemsForVolunteer', async () => expect(await controller.getExpiringItemsForVolunteer('v1')).toEqual([]));
        it('getTodayNotifications', async () => expect(await controller.getTodayNotifications()).toEqual([]));
        it('sendLineNotifications', async () => expect(await controller.sendLineNotifications()).toBe(3));
    });
});
