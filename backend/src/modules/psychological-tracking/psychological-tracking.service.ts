import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Psychological Tracking Service
 * Post-disaster mental health monitoring for victims and volunteers
 */
@Injectable()
export class PsychologicalTrackingService {
    private readonly logger = new Logger(PsychologicalTrackingService.name);

    private profiles: Map<string, PsychProfile> = new Map();
    private assessments: Map<string, MentalHealthAssessment[]> = new Map();
    private followUps: Map<string, FollowUp[]> = new Map();

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create psychological profile
     */
    createProfile(data: ProfileCreation): PsychProfile {
        const profile: PsychProfile = {
            id: `psych-${Date.now()}`,
            personId: data.personId,
            personName: data.personName,
            type: data.type,
            incidentId: data.incidentId,
            riskLevel: 'unknown',
            currentStatus: 'monitoring',
            assessments: [],
            interventions: [],
            createdAt: new Date(),
            lastContact: null,
        };

        this.profiles.set(profile.id, profile);
        this.assessments.set(profile.id, []);
        this.followUps.set(profile.id, []);

        return profile;
    }

    /**
     * Conduct mental health assessment
     */
    async conductAssessment(profileId: string, answers: AssessmentAnswers): Promise<MentalHealthAssessment> {
        const profile = this.profiles.get(profileId);
        if (!profile) throw new Error('Profile not found');

        const scores = this.calculateMentalHealthScores(answers);
        const riskLevel = this.determineRiskLevel(scores);

        const assessment: MentalHealthAssessment = {
            id: `mha-${Date.now()}`,
            profileId,
            scores,
            overallScore: this.calculateOverallScore(scores),
            riskLevel,
            symptoms: this.identifySymptoms(scores),
            recommendations: await this.generateRecommendations(scores, riskLevel),
            assessedAt: new Date(),
            assessedBy: 'system',
        };

        const profileAssessments = this.assessments.get(profileId) || [];
        profileAssessments.push(assessment);
        this.assessments.set(profileId, profileAssessments);

        profile.riskLevel = riskLevel;
        profile.assessments.push(assessment.id);
        profile.lastContact = new Date();

        // Trigger alerts for high risk
        if (riskLevel === 'high' || riskLevel === 'critical') {
            this.eventEmitter.emit('psych.high_risk', { profile, assessment });
        }

        return assessment;
    }

    /**
     * Get assessment questionnaire
     */
    getQuestionnaire(type: 'phq9' | 'gad7' | 'ptsd' | 'brief'): Question[] {
        const questionnaires: Record<string, Question[]> = {
            phq9: [
                { id: 'phq1', text: '對事物缺乏興趣或樂趣', scale: 4 },
                { id: 'phq2', text: '感覺心情低落、沮喪或絕望', scale: 4 },
                { id: 'phq3', text: '入睡困難、睡眠中斷或睡太多', scale: 4 },
                { id: 'phq4', text: '感覺疲倦或精力不足', scale: 4 },
                { id: 'phq5', text: '胃口不佳或暴飲暴食', scale: 4 },
                { id: 'phq6', text: '覺得自己很糟或讓家人失望', scale: 4 },
                { id: 'phq7', text: '難以專注', scale: 4 },
                { id: 'phq8', text: '動作或說話緩慢或坐立不安', scale: 4 },
                { id: 'phq9', text: '有傷害自己的想法', scale: 4, critical: true },
            ],
            gad7: [
                { id: 'gad1', text: '感覺緊張、焦慮或不安', scale: 4 },
                { id: 'gad2', text: '無法停止或控制擔憂', scale: 4 },
                { id: 'gad3', text: '過度擔憂各種事情', scale: 4 },
                { id: 'gad4', text: '難以放鬆', scale: 4 },
                { id: 'gad5', text: '坐立不安、無法靜止', scale: 4 },
                { id: 'gad6', text: '容易煩躁或易怒', scale: 4 },
                { id: 'gad7', text: '感覺害怕、好像有可怕的事會發生', scale: 4 },
            ],
            ptsd: [
                { id: 'ptsd1', text: '反覆出現災害相關的惡夢或閃回', scale: 5 },
                { id: 'ptsd2', text: '刻意避免想起災害', scale: 5 },
                { id: 'ptsd3', text: '變得過度警覺', scale: 5 },
                { id: 'ptsd4', text: '容易受驚嚇', scale: 5 },
                { id: 'ptsd5', text: '對活動失去興趣', scale: 5 },
                { id: 'ptsd6', text: '感覺與他人疏離', scale: 5 },
            ],
            brief: [
                { id: 'b1', text: '過去一週整體心情如何？', scale: 5 },
                { id: 'b2', text: '睡眠品質如何？', scale: 5 },
                { id: 'b3', text: '是否有人可以傾訴？', scale: 2 },
                { id: 'b4', text: '是否需要專業協助？', scale: 2 },
            ],
        };

        return questionnaires[type] || questionnaires.brief;
    }

    /**
     * Schedule follow-up
     */
    scheduleFollowUp(profileId: string, config: FollowUpConfig): FollowUp {
        const followUp: FollowUp = {
            id: `fu-${Date.now()}`,
            profileId,
            type: config.type,
            scheduledAt: config.scheduledAt,
            method: config.method,
            assignedTo: config.assignedTo,
            status: 'scheduled',
            notes: null,
            completedAt: null,
        };

        const profileFollowUps = this.followUps.get(profileId) || [];
        profileFollowUps.push(followUp);
        this.followUps.set(profileId, profileFollowUps);

        return followUp;
    }

    /**
     * Complete follow-up
     */
    completeFollowUp(followUpId: string, notes: string, outcome: string): FollowUp {
        for (const followUps of this.followUps.values()) {
            const followUp = followUps.find((f) => f.id === followUpId);
            if (followUp) {
                followUp.status = 'completed';
                followUp.notes = notes;
                followUp.completedAt = new Date();

                const profile = this.profiles.get(followUp.profileId);
                if (profile) {
                    profile.lastContact = new Date();
                }

                return followUp;
            }
        }
        throw new Error('Follow-up not found');
    }

    /**
     * Get persons needing attention
     */
    getHighRiskProfiles(): PsychProfile[] {
        return Array.from(this.profiles.values())
            .filter((p) => p.riskLevel === 'high' || p.riskLevel === 'critical')
            .sort((a, b) => {
                const riskOrder = { critical: 0, high: 1 };
                return (riskOrder[a.riskLevel as 'critical' | 'high'] || 2) -
                    (riskOrder[b.riskLevel as 'critical' | 'high'] || 2);
            });
    }

    /**
     * Get overdue follow-ups
     */
    getOverdueFollowUps(): FollowUp[] {
        const now = new Date();
        const overdue: FollowUp[] = [];

        for (const followUps of this.followUps.values()) {
            for (const fu of followUps) {
                if (fu.status === 'scheduled' && fu.scheduledAt < now) {
                    overdue.push(fu);
                }
            }
        }

        return overdue.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }

    /**
     * Generate wellness report
     */
    getWellnessReport(incidentId: string): WellnessReport {
        const incidentProfiles = Array.from(this.profiles.values())
            .filter((p) => p.incidentId === incidentId);

        const riskDistribution = {
            critical: incidentProfiles.filter((p) => p.riskLevel === 'critical').length,
            high: incidentProfiles.filter((p) => p.riskLevel === 'high').length,
            moderate: incidentProfiles.filter((p) => p.riskLevel === 'moderate').length,
            low: incidentProfiles.filter((p) => p.riskLevel === 'low').length,
        };

        return {
            incidentId,
            totalTracked: incidentProfiles.length,
            riskDistribution,
            activeFollowUps: this.countActiveFollowUps(incidentProfiles),
            completedFollowUps: this.countCompletedFollowUps(incidentProfiles),
            generatedAt: new Date(),
        };
    }

    // Private methods
    private calculateMentalHealthScores(answers: AssessmentAnswers): MentalHealthScores {
        return {
            depression: this.sumAnswers(answers, 'phq'),
            anxiety: this.sumAnswers(answers, 'gad'),
            ptsd: this.sumAnswers(answers, 'ptsd'),
            overall: this.sumAnswers(answers, ''),
        };
    }

    private sumAnswers(answers: AssessmentAnswers, prefix: string): number {
        return Object.entries(answers)
            .filter(([key]) => !prefix || key.startsWith(prefix))
            .reduce((sum, [, value]) => sum + value, 0);
    }

    private calculateOverallScore(scores: MentalHealthScores): number {
        return Math.round((scores.depression + scores.anxiety + scores.ptsd) / 3);
    }

    private determineRiskLevel(scores: MentalHealthScores): string {
        const max = Math.max(scores.depression, scores.anxiety, scores.ptsd);
        if (max >= 20) return 'critical';
        if (max >= 15) return 'high';
        if (max >= 10) return 'moderate';
        return 'low';
    }

    private identifySymptoms(scores: MentalHealthScores): string[] {
        const symptoms: string[] = [];
        if (scores.depression >= 10) symptoms.push('depressive_symptoms');
        if (scores.anxiety >= 10) symptoms.push('anxiety_symptoms');
        if (scores.ptsd >= 10) symptoms.push('ptsd_symptoms');
        return symptoms;
    }

    private async generateRecommendations(scores: MentalHealthScores, risk: string): Promise<string[]> {
        const recommendations: string[] = [];

        if (risk === 'critical') {
            recommendations.push('建議立即轉介專業心理師');
            recommendations.push('安排每日關懷電話');
        } else if (risk === 'high') {
            recommendations.push('建議安排專業心理諮詢');
            recommendations.push('安排每週追蹤');
        } else if (risk === 'moderate') {
            recommendations.push('持續監測，每兩週追蹤');
            recommendations.push('提供自我照顧資源');
        } else {
            recommendations.push('維持社會支持連結');
        }

        return recommendations;
    }

    private countActiveFollowUps(profiles: PsychProfile[]): number {
        let count = 0;
        for (const profile of profiles) {
            const fus = this.followUps.get(profile.id) || [];
            count += fus.filter((f) => f.status === 'scheduled').length;
        }
        return count;
    }

    private countCompletedFollowUps(profiles: PsychProfile[]): number {
        let count = 0;
        for (const profile of profiles) {
            const fus = this.followUps.get(profile.id) || [];
            count += fus.filter((f) => f.status === 'completed').length;
        }
        return count;
    }
}

// Types
interface ProfileCreation {
    personId: string;
    personName: string;
    type: 'victim' | 'volunteer' | 'responder';
    incidentId: string;
}

interface PsychProfile {
    id: string;
    personId: string;
    personName: string;
    type: string;
    incidentId: string;
    riskLevel: string;
    currentStatus: string;
    assessments: string[];
    interventions: string[];
    createdAt: Date;
    lastContact: Date | null;
}

interface Question {
    id: string;
    text: string;
    scale: number;
    critical?: boolean;
}

type AssessmentAnswers = Record<string, number>;

interface MentalHealthScores {
    depression: number;
    anxiety: number;
    ptsd: number;
    overall: number;
}

interface MentalHealthAssessment {
    id: string;
    profileId: string;
    scores: MentalHealthScores;
    overallScore: number;
    riskLevel: string;
    symptoms: string[];
    recommendations: string[];
    assessedAt: Date;
    assessedBy: string;
}

interface FollowUpConfig {
    type: 'phone' | 'visit' | 'video' | 'message';
    scheduledAt: Date;
    method: string;
    assignedTo?: string;
}

interface FollowUp {
    id: string;
    profileId: string;
    type: string;
    scheduledAt: Date;
    method: string;
    assignedTo?: string;
    status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
    notes: string | null;
    completedAt: Date | null;
}

interface WellnessReport {
    incidentId: string;
    totalTracked: number;
    riskDistribution: { critical: number; high: number; moderate: number; low: number };
    activeFollowUps: number;
    completedFollowUps: number;
    generatedAt: Date;
}
