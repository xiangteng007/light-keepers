import { Test, TestingModule } from '@nestjs/testing';
import { ShiftCalendarController } from './shift-calendar.controller';
import { ShiftCalendarService } from './shift-calendar.service';

describe('ShiftCalendarController', () => {
    let controller: ShiftCalendarController;
    let service: ShiftCalendarService;

    const mockService = {
        getCalendarView: jest.fn(),
        getVolunteerSchedule: jest.fn(),
        createShift: jest.fn(),
        updateShift: jest.fn(),
        deleteShift: jest.fn(),
        swapShifts: jest.fn(),
        copyWeekSchedule: jest.fn(),
        getVacancies: jest.fn(),
        getTemplates: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShiftCalendarController],
            providers: [
                { provide: ShiftCalendarService, useValue: mockService },
            ],
        }).compile();

        controller = module.get<ShiftCalendarController>(ShiftCalendarController);
        service = module.get<ShiftCalendarService>(ShiftCalendarService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getCalendarView', () => {
        it('should return calendar data for date range', async () => {
            const calendarData = [{ date: '2026-01-07', shifts: [] }];
            mockService.getCalendarView.mockResolvedValue(calendarData);

            const result = await controller.getCalendarView('2026-01-01', '2026-01-31');

            expect(service.getCalendarView).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
            expect(result).toEqual(calendarData);
        });
    });

    describe('getVolunteerSchedule', () => {
        it('should return volunteer schedule for month', async () => {
            const schedule = [{ shiftId: 's1', date: '2026-01-07' }];
            mockService.getVolunteerSchedule.mockResolvedValue(schedule);

            const result = await controller.getVolunteerSchedule('v1', 1, 2026);

            expect(service.getVolunteerSchedule).toHaveBeenCalledWith('v1', 1, 2026);
            expect(result).toEqual(schedule);
        });
    });

    describe('createShift', () => {
        it('should create a new shift', async () => {
            const dto = { date: '2026-01-08', templateId: 't1', volunteerId: 'v1', volunteerName: 'John' };
            const newShift = { id: 's1', ...dto };
            mockService.createShift.mockResolvedValue(newShift);

            const result = await controller.createShift(dto);

            expect(service.createShift).toHaveBeenCalledWith(dto);
            expect(result).toEqual(newShift);
        });
    });

    describe('updateShift', () => {
        it('should update existing shift', async () => {
            const updates = { status: 'confirmed' };
            const updatedShift = { id: 's1', status: 'confirmed' };
            mockService.updateShift.mockResolvedValue(updatedShift);

            const result = await controller.updateShift('s1', updates);

            expect(service.updateShift).toHaveBeenCalledWith('s1', updates);
            expect(result).toEqual(updatedShift);
        });
    });

    describe('deleteShift', () => {
        it('should delete shift by ID', async () => {
            mockService.deleteShift.mockResolvedValue(true);

            const result = await controller.deleteShift('s1');

            expect(service.deleteShift).toHaveBeenCalledWith('s1');
            expect(result).toEqual({ deleted: true });
        });
    });

    describe('swapShifts', () => {
        it('should swap two shifts', async () => {
            mockService.swapShifts.mockResolvedValue(true);

            const result = await controller.swapShifts({ shiftId1: 's1', shiftId2: 's2' });

            expect(service.swapShifts).toHaveBeenCalledWith('s1', 's2');
            expect(result).toEqual({ success: true });
        });
    });

    describe('copyWeekSchedule', () => {
        it('should copy week schedule', async () => {
            mockService.copyWeekSchedule.mockResolvedValue(5);

            const result = await controller.copyWeekSchedule({
                sourceWeekStart: '2026-01-06',
                targetWeekStart: '2026-01-13',
            });

            expect(service.copyWeekSchedule).toHaveBeenCalledWith('2026-01-06', '2026-01-13');
            expect(result).toEqual({ copiedCount: 5 });
        });
    });

    describe('getVacancies', () => {
        it('should return vacancies for a date', async () => {
            const vacancies = [{ templateId: 't1', needed: 2 }];
            mockService.getVacancies.mockResolvedValue(vacancies);

            const result = await controller.getVacancies('2026-01-08');

            expect(service.getVacancies).toHaveBeenCalledWith('2026-01-08');
            expect(result).toEqual(vacancies);
        });
    });

    describe('getTemplates', () => {
        it('should return all shift templates', async () => {
            const templates = [{ id: 't1', name: '早班' }];
            mockService.getTemplates.mockResolvedValue(templates);

            const result = await controller.getTemplates();

            expect(service.getTemplates).toHaveBeenCalled();
            expect(result).toEqual(templates);
        });
    });
});
