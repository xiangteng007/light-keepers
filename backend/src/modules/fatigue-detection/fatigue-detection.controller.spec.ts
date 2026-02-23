import { Test, TestingModule } from '@nestjs/testing';
import { FatigueDetectionController } from './fatigue-detection.controller';
import { FatigueDetectionService } from './fatigue-detection.service';

describe('FatigueDetectionController', () => {
    let controller: FatigueDetectionController;

    beforeEach(async () => {
        const service = {
            getFatigueLevel: jest.fn().mockReturnValue({ score: 65, level: 'moderate' }),
            getVolunteersNeedingRest: jest.fn().mockReturnValue([{ id: 'v1', score: 90 }]),
            canSchedule: jest.fn().mockReturnValue({ allowed: true }),
            getThresholds: jest.fn().mockReturnValue({ maxHoursPerDay: 12, restMinHours: 8 }),
            recordDuty: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [FatigueDetectionController],
            providers: [{ provide: FatigueDetectionService, useValue: service }],
        }).compile();

        controller = module.get<FatigueDetectionController>(FatigueDetectionController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getVolunteerFatigue returns fatigue level', () => {
        const result = controller.getVolunteerFatigue('v1');
        expect(result).toBeDefined();
    });

    it('getVolunteersNeedingRest returns list', () => {
        const result = controller.getVolunteersNeedingRest();
        expect(result).toBeDefined();
    });

    it('validateShift validates proposed shift', () => {
        const result = controller.validateShift({
            volunteerId: 'v1', date: '2026-01-15',
            startTime: '08:00', endTime: '16:00', hours: 8,
        });
        expect(result).toBeDefined();
    });

    it('getThresholds returns thresholds', () => {
        const result = controller.getThresholds();
        expect(result).toBeDefined();
    });

    it('recordDuty records duty and returns success', () => {
        const result = controller.recordDuty({
            volunteerId: 'v1', startTime: '2026-01-15T08:00:00', endTime: '2026-01-15T16:00:00',
        });
        expect(result.success).toBe(true);
    });
});
