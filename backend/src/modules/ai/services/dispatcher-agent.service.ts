/**
 * Dispatcher Agent Service
 * 
 * AI-powered task assignment and resource optimization
 * v1.0: Smart dispatch suggestions, fatigue monitoring, START triage
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DispatchSuggestion {
    taskId: string;
    suggestedAssignees: {
        volunteerId: string;
        name: string;
        score: number;
        reasons: string[];
        warnings?: string[];
    }[];
    alternativeAssignments?: {
        volunteerId: string;
        name: string;
        reason: string;
    }[];
    estimatedCompletionTime?: string;
    priorityLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface FatigueAlert {
    volunteerId: string;
    volunteerName: string;
    alertLevel: 'warning' | 'critical';
    hoursWorked: number;
    lastRestPeriod: string;
    recommendation: string;
}

export interface TriageResult {
    patientId: string;
    category: 'immediate' | 'delayed' | 'minor' | 'deceased';
    priority: number;
    assessment: string;
    recommendedAction: string;
}

@Injectable()
export class DispatcherAgentService {
    private readonly logger = new Logger(DispatcherAgentService.name);
    private readonly aiProvider: 'gemini' | 'openai' | 'mock';
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.aiProvider = this.configService.get<'gemini' | 'openai' | 'mock'>('AI_PROVIDER', 'mock');
        this.apiKey = this.configService.get<string>('AI_API_KEY', '');

        if (this.aiProvider !== 'mock' && !this.apiKey) {
            this.logger.warn('AI API key not configured, falling back to mock mode');
            (this as any).aiProvider = 'mock';
        }
    }

    /**
     * Get smart dispatch suggestions for a task
     */
    async getSuggestions(taskData: {
        taskId: string;
        taskType: string;
        location: string;
        requiredSkills: string[];
        urgency: string;
        estimatedDuration: number;
    }, availableVolunteers: {
        id: string;
        name: string;
        skills: string[];
        location: string;
        hoursWorkedToday: number;
        lastAssignment: string;
    }[]): Promise<DispatchSuggestion> {
        this.logger.log(`Generating dispatch suggestions for task ${taskData.taskId}`);

        if (this.aiProvider === 'mock') {
            return this.getMockSuggestions(taskData, availableVolunteers);
        }

        // TODO: Integrate with Gemini or OpenAI
        // For now, use heuristic-based suggestions
        return this.getHeuristicSuggestions(taskData, availableVolunteers);
    }

    /**
     * Monitor volunteer fatigue levels
     */
    async checkFatigue(volunteers: {
        id: string;
        name: string;
        hoursWorkedToday: number;
        hoursWorkedWeek: number;
        lastRestPeriod: Date;
    }[]): Promise<FatigueAlert[]> {
        const alerts: FatigueAlert[] = [];

        for (const volunteer of volunteers) {
            let alertLevel: 'warning' | 'critical' | null = null;
            let recommendation = '';

            if (volunteer.hoursWorkedToday >= 12) {
                alertLevel = 'critical';
                recommendation = '建議立即安排休息，已超過建議工時上限';
            } else if (volunteer.hoursWorkedToday >= 8) {
                alertLevel = 'warning';
                recommendation = '接近建議工時上限，請考慮輪替';
            } else if (volunteer.hoursWorkedWeek >= 48) {
                alertLevel = 'warning';
                recommendation = '本週工時已達上限，建議明日開始休息';
            }

            if (alertLevel) {
                alerts.push({
                    volunteerId: volunteer.id,
                    volunteerName: volunteer.name,
                    alertLevel,
                    hoursWorked: volunteer.hoursWorkedToday,
                    lastRestPeriod: volunteer.lastRestPeriod.toISOString(),
                    recommendation,
                });
            }
        }

        return alerts;
    }

    /**
     * START triage assessment
     */
    async assessTriage(patients: {
        id: string;
        canWalk: boolean;
        isBreathing: boolean;
        respiratoryRate?: number;
        capillaryRefill?: number;
        canFollowCommands: boolean;
        description?: string;
    }[]): Promise<TriageResult[]> {
        return patients.map(patient => {
            let category: TriageResult['category'];
            let priority: number;
            let assessment: string;
            let recommendedAction: string;

            // START Triage Algorithm
            if (patient.canWalk) {
                category = 'minor';
                priority = 4;
                assessment = '患者可行走，列為輕傷';
                recommendedAction = '安置於輕傷區域，安排後續追蹤';
            } else if (!patient.isBreathing) {
                category = 'deceased';
                priority = 0;
                assessment = '無呼吸無反應';
                recommendedAction = '確認死亡，移至遺體收容區';
            } else if (patient.respiratoryRate && patient.respiratoryRate > 30) {
                category = 'immediate';
                priority = 1;
                assessment = '呼吸過快，需立即處置';
                recommendedAction = '優先送醫，監控生命徵象';
            } else if (patient.capillaryRefill && patient.capillaryRefill > 2) {
                category = 'immediate';
                priority = 1;
                assessment = '循環功能異常';
                recommendedAction = '止血、保暖、優先送醫';
            } else if (!patient.canFollowCommands) {
                category = 'immediate';
                priority = 1;
                assessment = '意識不清';
                recommendedAction = '維持呼吸道暢通，優先送醫';
            } else {
                category = 'delayed';
                priority = 2;
                assessment = '生命徵象穩定但無法行動';
                recommendedAction = '安置於延遲處理區，持續觀察';
            }

            return {
                patientId: patient.id,
                category,
                priority,
                assessment,
                recommendedAction,
            };
        });
    }

    // ===== Private Methods =====

    private getMockSuggestions(
        taskData: any,
        volunteers: any[]
    ): DispatchSuggestion {
        const scored = volunteers
            .map(v => ({
                volunteerId: v.id,
                name: v.name,
                score: Math.random() * 100,
                reasons: this.generateMockReasons(v, taskData),
                warnings: v.hoursWorkedToday > 6 ? ['工時接近上限'] : undefined,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        return {
            taskId: taskData.taskId,
            suggestedAssignees: scored,
            estimatedCompletionTime: `${taskData.estimatedDuration || 60} 分鐘`,
            priorityLevel: taskData.urgency as any || 'medium',
        };
    }

    private getHeuristicSuggestions(
        taskData: any,
        volunteers: any[]
    ): DispatchSuggestion {
        const scored = volunteers.map(v => {
            let score = 50;
            const reasons: string[] = [];
            const warnings: string[] = [];

            // Skill matching
            const matchedSkills = (v.skills || []).filter(
                (s: string) => (taskData.requiredSkills || []).includes(s)
            );
            score += matchedSkills.length * 20;
            if (matchedSkills.length > 0) {
                reasons.push(`具備 ${matchedSkills.join(', ')} 技能`);
            }

            // Location proximity (simplified)
            if (v.location === taskData.location) {
                score += 30;
                reasons.push('位於任務地點附近');
            }

            // Fatigue consideration
            if (v.hoursWorkedToday > 8) {
                score -= 30;
                warnings.push('工時已超過 8 小時');
            } else if (v.hoursWorkedToday > 6) {
                score -= 10;
                warnings.push('工時接近上限');
            }

            // Recent assignment penalty
            if (v.lastAssignment) {
                const lastTime = new Date(v.lastAssignment).getTime();
                const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
                if (hoursSince < 1) {
                    score -= 15;
                    reasons.push('近期剛完成任務');
                }
            }

            return {
                volunteerId: v.id,
                name: v.name,
                score: Math.max(0, Math.min(100, score)),
                reasons,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return {
            taskId: taskData.taskId,
            suggestedAssignees: scored,
            estimatedCompletionTime: `${taskData.estimatedDuration || 60} 分鐘`,
            priorityLevel: this.mapUrgencyToPriority(taskData.urgency),
        };
    }

    private generateMockReasons(volunteer: any, task: any): string[] {
        const reasons = ['系統推薦'];
        if (Math.random() > 0.5) reasons.push('技能匹配');
        if (Math.random() > 0.5) reasons.push('距離較近');
        if (Math.random() > 0.7) reasons.push('過往表現優異');
        return reasons;
    }

    private mapUrgencyToPriority(urgency: string): DispatchSuggestion['priorityLevel'] {
        const map: Record<string, DispatchSuggestion['priorityLevel']> = {
            'critical': 'critical',
            'high': 'high',
            'medium': 'medium',
            'low': 'low',
        };
        return map[urgency] || 'medium';
    }
}
