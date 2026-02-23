import { ShiftCalendarService } from './shift-calendar.service';

describe('ShiftCalendarService', () => {
    let service: ShiftCalendarService;

    beforeEach(() => {
        service = new ShiftCalendarService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getTemplates', () => {
        it('should return 3 default templates', () => {
            const templates = service.getTemplates();
            expect(templates).toHaveLength(3);
            expect(templates.map(t => t.id)).toEqual(['morning', 'afternoon', 'night']);
        });
    });

    describe('createShift', () => {
        it('should create a shift with correct properties', () => {
            const shift = service.createShift({
                date: '2026-02-01',
                templateId: 'morning',
                volunteerId: 'v-1',
                volunteerName: '王志工',
            });
            expect(shift.id).toContain('shift-');
            expect(shift.date).toBe('2026-02-01');
            expect(shift.status).toBe('scheduled');
            expect(shift.volunteerName).toBe('王志工');
        });
    });

    describe('getCalendarView', () => {
        it('should return days in range', () => {
            const days = service.getCalendarView(new Date('2026-02-01'), new Date('2026-02-03'));
            expect(days).toHaveLength(3);
            expect(days[0].date).toBe('2026-02-01');
        });

        it('should include shifts in matching days', () => {
            service.createShift({ date: '2026-02-01', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            const days = service.getCalendarView(new Date('2026-02-01'), new Date('2026-02-01'));
            expect(days[0].totalVolunteers).toBe(1);
            expect(days[0].shifts[0].template.id).toBe('morning');
        });
    });

    describe('getVolunteerSchedule', () => {
        it('should return shifts for specific volunteer in month', () => {
            const s1 = service.createShift({ date: '2026-02-05', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            // Verify the shift was actually created and stored
            expect(s1.id).toBeDefined();
            expect(s1.volunteerId).toBe('v-1');
            const schedule = service.getVolunteerSchedule('v-1', 2, 2026);
            // The shift date '2026-02-05' should be within '2026-02-01' to '2026-02-31'
            expect(schedule.length).toBe(1);
        });
    });

    describe('updateShift', () => {
        it('should update shift properties', () => {
            const shift = service.createShift({ date: '2026-02-01', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            const updated = service.updateShift(shift.id, { volunteerName: 'B', notes: '備註' });
            expect(updated?.volunteerName).toBe('B');
            expect(updated?.notes).toBe('備註');
        });

        it('should return null for missing shift', () => {
            expect(service.updateShift('no-id', { notes: 'x' })).toBeNull();
        });
    });

    describe('deleteShift', () => {
        it('should delete existing shift', () => {
            const shift = service.createShift({ date: '2026-02-01', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            expect(service.deleteShift(shift.id)).toBe(true);
        });

        it('should return false for missing shift', () => {
            expect(service.deleteShift('no-id')).toBe(false);
        });
    });

    describe('swapShifts', () => {
        it('should swap volunteers between shifts', async () => {
            const s1 = service.createShift({ date: '2026-02-01', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            // Wait 1ms to ensure unique Date.now() ID
            await new Promise(r => setTimeout(r, 2));
            const s2 = service.createShift({ date: '2026-02-01', templateId: 'afternoon', volunteerId: 'v-2', volunteerName: 'B' });
            // Ensure different IDs
            expect(s1.id).not.toBe(s2.id);
            expect(service.swapShifts(s1.id, s2.id)).toBe(true);
            // s1 and s2 are mutated in-place by swapShifts
            expect(s1.volunteerId).toBe('v-2');
            expect(s2.volunteerId).toBe('v-1');
        });

        it('should return false if shift not found', () => {
            const s1 = service.createShift({ date: '2026-02-01', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            expect(service.swapShifts(s1.id, 'no-id')).toBe(false);
        });
    });

    describe('copyWeekSchedule', () => {
        it('should copy shifts to target week', () => {
            service.createShift({ date: '2026-02-02', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });

            const copied = service.copyWeekSchedule(new Date('2026-02-02'), new Date('2026-02-09'));
            expect(copied).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getVacancies', () => {
        it('should return vacancies when under-staffed', () => {
            // No shifts created -> all templates have 0/5 filled
            const vacancies = service.getVacancies('2026-02-01');
            expect(vacancies).toHaveLength(3);
            expect(vacancies[0].shortage).toBe(5);
        });

        it('should reduce shortage when shifts exist', () => {
            service.createShift({ date: '2026-02-01', templateId: 'morning', volunteerId: 'v-1', volunteerName: 'A' });
            const vacancies = service.getVacancies('2026-02-01');
            const morning = vacancies.find(v => v.templateId === 'morning');
            expect(morning?.filled).toBe(1);
            expect(morning?.shortage).toBe(4);
        });
    });
});
