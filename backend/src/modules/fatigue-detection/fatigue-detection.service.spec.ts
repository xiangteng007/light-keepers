import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FatigueDetectionService } from './fatigue-detection.service';

describe('FatigueDetectionService', () => {
    let service: FatigueDetectionService;
    let eventEmitter: { emit: jest.Mock };

    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FatigueDetectionService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<FatigueDetectionService>(FatigueDetectionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== getFatigueLevel =====
    describe('getFatigueLevel', () => {
        it('should return fresh for unknown volunteer', () => {
            const result = service.getFatigueLevel('unknown');
            expect(result.level).toBe('fresh');
            expect(result.score).toBe(0);
            expect(result.recommendations).toContain('可正常值勤');
        });

        it('should return low after short duty', () => {
            service.recordDuty('vol-1', hoursAgo(6), hoursAgo(1));
            const result = service.getFatigueLevel('vol-1');
            expect(result.score).toBeGreaterThan(0);
            expect(['low', 'moderate']).toContain(result.level);
        });

        it('should return high/critical after long duty', () => {
            // 24 hrs: 13 hours duty
            service.recordDuty('vol-2', hoursAgo(14), hoursAgo(1));
            const result = service.getFatigueLevel('vol-2');
            expect(result.score).toBeGreaterThanOrEqual(25);
        });
    });

    // ===== recordDuty =====
    describe('recordDuty', () => {
        it('should record duty and update last24HoursHours', () => {
            service.recordDuty('vol-1', hoursAgo(4), hoursAgo(0));
            const assessment = service.getFatigueLevel('vol-1');
            expect(assessment.record).toBeDefined();
        });

        it('should emit fatigue.critical for extreme overwork', () => {
            // 14 hours in last 24h => score 40, then need 7-day high too
            service.recordDuty('vol-x', hoursAgo(14), hoursAgo(0));
            // This alone gives score 40 (>12h=40). Need more to hit critical(70).
            // Add consecutive days: today counted
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            for (let d = 1; d <= 7; d++) {
                const dayStart = new Date(todayStart.getTime() - d * 86400000 + 3600000);
                const dayEnd = new Date(dayStart.getTime() + 10 * 3600000);
                service.recordDuty('vol-x', dayStart, dayEnd);
            }
            // Now vol-x has 7+ consecutive days (30) + high 24h hours (40) + high 7-day hours (30) = 100 => critical
            expect(eventEmitter.emit).toHaveBeenCalledWith('fatigue.critical', expect.objectContaining({
                volunteerId: 'vol-x',
            }));
        });
    });

    // ===== getVolunteersNeedingRest =====
    describe('getVolunteersNeedingRest', () => {
        it('should return empty when no overworked volunteers', () => {
            const result = service.getVolunteersNeedingRest();
            expect(result).toHaveLength(0);
        });

        it('should include high/critical volunteers', () => {
            // Push vol-a to high: 14h in 24h
            service.recordDuty('vol-a', hoursAgo(14), hoursAgo(0));
            // Push further with 7-day hours
            for (let d = 1; d <= 6; d++) {
                const s = new Date(now.getTime() - d * 86400000);
                const e = new Date(s.getTime() + 8 * 3600000);
                service.recordDuty('vol-a', s, e);
            }
            const rest = service.getVolunteersNeedingRest();
            expect(rest.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ===== canSchedule =====
    describe('canSchedule', () => {
        it('should allow scheduling fresh volunteer', () => {
            const result = service.canSchedule('new-vol', { date: now, startTime: '08:00', endTime: '16:00', hours: 8 });
            expect(result.canSchedule).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should warn when weekly hours would exceed 40', () => {
            // Give vol-b 38 hours this week
            for (let d = 0; d < 5; d++) {
                const s = new Date(now.getTime() - d * 86400000);
                const e = new Date(s.getTime() + 7.6 * 3600000);
                service.recordDuty('vol-b', s, e);
            }
            const result = service.canSchedule('vol-b', { date: now, startTime: '08:00', endTime: '16:00', hours: 8 });
            expect(result.canSchedule).toBe(false);
            expect(result.issues.some(i => i.includes('40'))).toBe(true);
        });
    });

    // ===== getThresholds =====
    describe('getThresholds', () => {
        it('should return fatigue thresholds', () => {
            const thresholds = service.getThresholds();
            expect(thresholds.maxConsecutiveDays).toBe(5);
            expect(thresholds.maxWeeklyHours).toBe(40);
            expect(thresholds.maxDailyHours).toBe(12);
            expect(thresholds.minRestBetweenShifts).toBe(8);
        });
    });
});
