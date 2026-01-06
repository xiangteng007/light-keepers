import { Injectable, Logger } from '@nestjs/common';

/**
 * Smart Scheduling Service
 * AI-based volunteer dispatch based on skills and location
 */
@Injectable()
export class SmartSchedulingService {
    private readonly logger = new Logger(SmartSchedulingService.name);

    /**
     * 智慧派遣建議
     */
    suggestDispatch(incident: IncidentInfo): DispatchSuggestion {
        const candidates = this.findAvailableVolunteers(incident);
        const scored = this.scoreAndRank(candidates, incident);

        return {
            incidentId: incident.id,
            suggestedTeam: scored.slice(0, incident.requiredCount),
            backupTeam: scored.slice(incident.requiredCount, incident.requiredCount + 3),
            estimatedResponseTime: this.calculateEta(scored[0], incident),
            confidence: this.calculateConfidence(scored, incident),
            reasoning: this.explainSelection(scored[0], incident),
        };
    }

    /**
     * 自動排班
     */
    generateSchedule(period: SchedulePeriod): ScheduleResult {
        const days = this.getDaysInPeriod(period);
        const schedule: DaySchedule[] = [];

        for (const day of days) {
            const shifts = this.generateDayShifts(day);
            schedule.push({ date: day, shifts });
        }

        return {
            period,
            schedule,
            coverage: this.calculateCoverage(schedule),
            gaps: this.identifyGaps(schedule),
            generatedAt: new Date(),
        };
    }

    /**
     * 尋找替補人員
     */
    findBackup(originalVolunteerId: string, shift: ShiftInfo): BackupSuggestion[] {
        // 找出相同技能且有空的志工
        const candidates = this.findSimilarVolunteers(originalVolunteerId);
        return candidates.map((c, i) => ({
            rank: i + 1,
            volunteerId: c.id,
            volunteerName: c.name,
            matchScore: c.score,
            distance: c.distance,
            available: c.available,
        }));
    }

    /**
     * 預測人力需求
     */
    predictStaffingNeeds(region: string, date: Date): StaffingPrediction {
        const dayOfWeek = date.getDay();
        const month = date.getMonth();

        // 基於歷史資料和季節性
        const baseNeed = 20;
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0;
        const seasonalMultiplier = month >= 5 && month <= 9 ? 1.3 : 1.0; // 颱風季

        return {
            region,
            date,
            predictedIncidents: Math.round(10 * seasonalMultiplier),
            recommendedStaff: Math.round(baseNeed * weekendMultiplier * seasonalMultiplier),
            bySkill: {
                medical: Math.round(5 * seasonalMultiplier),
                rescue: Math.round(8 * seasonalMultiplier),
                logistics: Math.round(4 * seasonalMultiplier),
                communication: Math.round(3 * seasonalMultiplier),
            },
            confidence: 0.75,
        };
    }

    // Private methods
    private findAvailableVolunteers(incident: IncidentInfo): VolunteerCandidate[] {
        // 實際應查詢資料庫
        return [
            { id: 'v1', name: '王大明', skills: ['rescue', 'medical'], lat: 25.03, lng: 121.56, available: true },
            { id: 'v2', name: '李小華', skills: ['rescue'], lat: 25.04, lng: 121.55, available: true },
        ];
    }

    private scoreAndRank(candidates: VolunteerCandidate[], incident: IncidentInfo): RankedVolunteer[] {
        return candidates.map((c) => {
            const skillMatch = c.skills.some((s) => incident.requiredSkills.includes(s)) ? 30 : 0;
            const distance = 10; // km
            const distanceScore = Math.max(0, 30 - distance);

            return {
                ...c,
                score: skillMatch + distanceScore,
                distance,
                eta: distance * 3, // minutes
            };
        }).sort((a, b) => b.score - a.score);
    }

    private calculateEta(volunteer: RankedVolunteer | undefined, incident: IncidentInfo): number {
        return volunteer?.eta || 30;
    }

    private calculateConfidence(ranked: RankedVolunteer[], incident: IncidentInfo): number {
        if (ranked.length >= incident.requiredCount) return 0.9;
        if (ranked.length > 0) return 0.6;
        return 0.2;
    }

    private explainSelection(volunteer: RankedVolunteer | undefined, incident: IncidentInfo): string[] {
        if (!volunteer) return ['無可用人員'];
        return [
            `距離最近 (${volunteer.distance} km)`,
            `具備所需技能`,
            `預計 ${volunteer.eta} 分鐘抵達`,
        ];
    }

    private getDaysInPeriod(period: SchedulePeriod): Date[] {
        const days: Date[] = [];
        const current = new Date(period.startDate);
        while (current <= period.endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    }

    private generateDayShifts(date: Date): ShiftAssignment[] {
        return [
            { shift: 'morning', startTime: '06:00', endTime: '14:00', assignedCount: 5, requiredCount: 5 },
            { shift: 'afternoon', startTime: '14:00', endTime: '22:00', assignedCount: 5, requiredCount: 5 },
            { shift: 'night', startTime: '22:00', endTime: '06:00', assignedCount: 3, requiredCount: 3 },
        ];
    }

    private calculateCoverage(schedule: DaySchedule[]): number {
        let filled = 0, total = 0;
        for (const day of schedule) {
            for (const shift of day.shifts) {
                filled += shift.assignedCount;
                total += shift.requiredCount;
            }
        }
        return total > 0 ? (filled / total) * 100 : 0;
    }

    private identifyGaps(schedule: DaySchedule[]): ScheduleGap[] {
        const gaps: ScheduleGap[] = [];
        for (const day of schedule) {
            for (const shift of day.shifts) {
                if (shift.assignedCount < shift.requiredCount) {
                    gaps.push({ date: day.date, shift: shift.shift, shortage: shift.requiredCount - shift.assignedCount });
                }
            }
        }
        return gaps;
    }

    private findSimilarVolunteers(volunteerId: string): RankedVolunteer[] {
        return [];
    }
}

// Types
interface IncidentInfo {
    id: string; type: string; lat: number; lng: number;
    requiredSkills: string[]; requiredCount: number; urgency: string;
}
interface VolunteerCandidate {
    id: string; name: string; skills: string[];
    lat: number; lng: number; available: boolean;
}
interface RankedVolunteer extends VolunteerCandidate { score: number; distance: number; eta: number; }
interface DispatchSuggestion {
    incidentId: string; suggestedTeam: RankedVolunteer[];
    backupTeam: RankedVolunteer[]; estimatedResponseTime: number;
    confidence: number; reasoning: string[];
}
interface SchedulePeriod { startDate: Date; endDate: Date; }
interface ShiftAssignment { shift: string; startTime: string; endTime: string; assignedCount: number; requiredCount: number; }
interface DaySchedule { date: Date; shifts: ShiftAssignment[]; }
interface ScheduleGap { date: Date; shift: string; shortage: number; }
interface ScheduleResult { period: SchedulePeriod; schedule: DaySchedule[]; coverage: number; gaps: ScheduleGap[]; generatedAt: Date; }
interface ShiftInfo { date: Date; shift: string; }
interface BackupSuggestion { rank: number; volunteerId: string; volunteerName: string; matchScore: number; distance: number; available: boolean; }
interface StaffingPrediction {
    region: string; date: Date; predictedIncidents: number;
    recommendedStaff: number; bySkill: Record<string, number>; confidence: number;
}
