import { Injectable, Logger } from '@nestjs/common';

/**
 * Shift Calendar Service
 * Visual shift scheduling
 */
@Injectable()
export class ShiftCalendarService {
    private readonly logger = new Logger(ShiftCalendarService.name);
    private shifts: Map<string, Shift> = new Map();
    private shiftTemplates: Map<string, ShiftTemplate> = new Map();

    constructor() {
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates() {
        this.shiftTemplates.set('morning', { id: 'morning', name: '早班', startTime: '06:00', endTime: '14:00', color: '#FFB74D' });
        this.shiftTemplates.set('afternoon', { id: 'afternoon', name: '午班', startTime: '14:00', endTime: '22:00', color: '#64B5F6' });
        this.shiftTemplates.set('night', { id: 'night', name: '晚班', startTime: '22:00', endTime: '06:00', color: '#9575CD' });
    }

    /**
     * 建立班次
     */
    createShift(input: ShiftInput): Shift {
        const shift: Shift = {
            id: `shift-${Date.now()}`,
            date: input.date,
            templateId: input.templateId,
            volunteerId: input.volunteerId,
            volunteerName: input.volunteerName,
            status: 'scheduled',
            notes: input.notes,
            createdAt: new Date(),
        };

        this.shifts.set(shift.id, shift);
        return shift;
    }

    /**
     * 取得日曆檢視
     */
    getCalendarView(startDate: Date, endDate: Date): CalendarDay[] {
        const days: CalendarDay[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const dayShifts = Array.from(this.shifts.values()).filter((s) => s.date === dateStr);

            days.push({
                date: dateStr,
                dayOfWeek: current.getDay(),
                shifts: dayShifts.map((s) => ({
                    ...s,
                    template: this.shiftTemplates.get(s.templateId),
                })),
                totalVolunteers: dayShifts.length,
            });

            current.setDate(current.getDate() + 1);
        }

        return days;
    }

    /**
     * 取得志工排班
     */
    getVolunteerSchedule(volunteerId: string, month: number, year: number): Shift[] {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        return Array.from(this.shifts.values()).filter((s) =>
            s.volunteerId === volunteerId && s.date >= startDate && s.date <= endDate);
    }

    /**
     * 更新班次
     */
    updateShift(shiftId: string, updates: Partial<ShiftInput>): Shift | null {
        const shift = this.shifts.get(shiftId);
        if (!shift) return null;

        if (updates.volunteerId) shift.volunteerId = updates.volunteerId;
        if (updates.volunteerName) shift.volunteerName = updates.volunteerName;
        if (updates.templateId) shift.templateId = updates.templateId;
        if (updates.notes) shift.notes = updates.notes;

        return shift;
    }

    /**
     * 刪除班次
     */
    deleteShift(shiftId: string): boolean {
        return this.shifts.delete(shiftId);
    }

    /**
     * 交換班次
     */
    swapShifts(shiftId1: string, shiftId2: string): boolean {
        const shift1 = this.shifts.get(shiftId1);
        const shift2 = this.shifts.get(shiftId2);

        if (!shift1 || !shift2) return false;

        const tempVol = shift1.volunteerId;
        const tempName = shift1.volunteerName;

        shift1.volunteerId = shift2.volunteerId;
        shift1.volunteerName = shift2.volunteerName;
        shift2.volunteerId = tempVol;
        shift2.volunteerName = tempName;

        return true;
    }

    /**
     * 複製排班
     */
    copyWeekSchedule(sourceWeekStart: Date, targetWeekStart: Date): number {
        const sourceEnd = new Date(sourceWeekStart);
        sourceEnd.setDate(sourceEnd.getDate() + 6);

        const sourceShifts = Array.from(this.shifts.values()).filter((s) => {
            const d = new Date(s.date);
            return d >= sourceWeekStart && d <= sourceEnd;
        });

        const dayDiff = Math.floor((targetWeekStart.getTime() - sourceWeekStart.getTime()) / 86400000);

        for (const shift of sourceShifts) {
            const newDate = new Date(shift.date);
            newDate.setDate(newDate.getDate() + dayDiff);

            this.createShift({
                date: newDate.toISOString().split('T')[0],
                templateId: shift.templateId,
                volunteerId: shift.volunteerId,
                volunteerName: shift.volunteerName,
            });
        }

        return sourceShifts.length;
    }

    /**
     * 取得空缺
     */
    getVacancies(date: string): Vacancy[] {
        const dayShifts = Array.from(this.shifts.values()).filter((s) => s.date === date);
        const vacancies: Vacancy[] = [];

        for (const [_, template] of this.shiftTemplates) {
            const filled = dayShifts.filter((s) => s.templateId === template.id).length;
            const required = 5; // TODO: 從設定讀取

            if (filled < required) {
                vacancies.push({
                    date,
                    templateId: template.id,
                    templateName: template.name,
                    required,
                    filled,
                    shortage: required - filled,
                });
            }
        }

        return vacancies;
    }

    /**
     * 取得班次模板
     */
    getTemplates(): ShiftTemplate[] {
        return Array.from(this.shiftTemplates.values());
    }
}

// Types
export interface ShiftTemplate { id: string; name: string; startTime: string; endTime: string; color: string; }
export interface ShiftInput { date: string; templateId: string; volunteerId: string; volunteerName: string; notes?: string; }
export interface Shift { id: string; date: string; templateId: string; volunteerId: string; volunteerName: string; status: string; notes?: string; createdAt: Date; }
export interface CalendarDay { date: string; dayOfWeek: number; shifts: any[]; totalVolunteers: number; }
export interface Vacancy { date: string; templateId: string; templateName: string; required: number; filled: number; shortage: number; }

