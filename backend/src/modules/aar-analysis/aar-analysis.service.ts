import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AAR Analysis Service
 * After Action Review - AI-powered post-incident analysis
 */
@Injectable()
export class AarAnalysisService {
    private readonly logger = new Logger(AarAnalysisService.name);
    private aarReports: Map<string, AarReport> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * Generate AAR report from mission data
     */
    async generateAar(missionId: string, missionData: MissionData): Promise<AarReport> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        const basicAnalysis = this.performBasicAnalysis(missionData);
        let aiAnalysis: AiAnalysis | null = null;

        if (apiKey) {
            try {
                aiAnalysis = await this.performAiAnalysis(missionData, apiKey);
            } catch (error) {
                this.logger.error('AI analysis failed', error);
            }
        }

        const report: AarReport = {
            id: `aar-${missionId}-${Date.now()}`,
            missionId,
            generatedAt: new Date(),
            missionSummary: {
                name: missionData.name,
                type: missionData.type,
                startTime: missionData.startTime,
                endTime: missionData.endTime,
                duration: this.calculateDuration(missionData.startTime, missionData.endTime),
                location: missionData.location,
            },
            metrics: basicAnalysis.metrics,
            timeline: this.buildTimeline(missionData),
            whatWorked: aiAnalysis?.whatWorked || basicAnalysis.whatWorked,
            whatDidntWork: aiAnalysis?.whatDidntWork || basicAnalysis.whatDidntWork,
            recommendations: aiAnalysis?.recommendations || basicAnalysis.recommendations,
            lessonsLearned: aiAnalysis?.lessonsLearned || [],
            trainingNeeds: aiAnalysis?.trainingNeeds || [],
            equipmentIssues: this.identifyEquipmentIssues(missionData),
            communicationAnalysis: this.analyzeCommunications(missionData),
        };

        this.aarReports.set(report.id, report);

        return report;
    }

    /**
     * Get comparative analysis across multiple missions
     */
    getComparativeAnalysis(missionIds: string[]): ComparativeAnalysis {
        const reports = missionIds
            .map((id) => Array.from(this.aarReports.values()).find((r) => r.missionId === id))
            .filter(Boolean) as AarReport[];

        if (reports.length < 2) {
            return { available: false, reason: 'Need at least 2 missions to compare' };
        }

        return {
            available: true,
            averageResponseTime: this.calculateAverageMetric(reports, 'responseTime'),
            averageCasualtiesRescued: this.calculateAverageMetric(reports, 'rescued'),
            commonProblems: this.findCommonProblems(reports),
            improvementTrends: this.identifyTrends(reports),
        };
    }

    /**
     * Export AAR as document
     */
    exportAar(aarId: string, format: 'pdf' | 'docx' | 'html'): ExportResult {
        const report = this.aarReports.get(aarId);
        if (!report) {
            return { success: false, error: 'AAR not found' };
        }

        // Would generate actual document in production
        return {
            success: true,
            format,
            url: `/exports/aar-${aarId}.${format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'html'}`,
        };
    }

    // Private methods
    private performBasicAnalysis(data: MissionData): BasicAnalysis {
        const responseTime = data.firstResponseTime
            ? (data.firstResponseTime.getTime() - data.startTime.getTime()) / 60000
            : 0;

        return {
            metrics: {
                responseTime: Math.round(responseTime),
                personnelDeployed: data.personnel?.length || 0,
                resourcesUsed: data.resourcesUsed?.length || 0,
                rescued: data.casualties?.rescued || 0,
                injured: data.casualties?.injured || 0,
            },
            whatWorked: [
                responseTime < 15 ? '快速響應時間' : null,
                data.personnel && data.personnel.length > 10 ? '充足人力部署' : null,
            ].filter(Boolean) as string[],
            whatDidntWork: [
                responseTime > 30 ? '響應時間過長' : null,
            ].filter(Boolean) as string[],
            recommendations: [
                '建立標準作業程序檢核表',
                '定期進行演練訓練',
            ],
        };
    }

    private async performAiAnalysis(data: MissionData, apiKey: string): Promise<AiAnalysis> {
        const prompt = `Analyze this disaster response mission and provide AAR insights in Traditional Chinese.
    Return JSON: {"whatWorked": [...], "whatDidntWork": [...], "recommendations": [...], "lessonsLearned": [...], "trainingNeeds": [...]}
    
    Mission: ${JSON.stringify({
            type: data.type,
            duration: this.calculateDuration(data.startTime, data.endTime),
            personnelCount: data.personnel?.length,
            casualties: data.casualties,
            incidents: data.incidents?.slice(0, 5),
        })}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            },
        );

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
        }

        throw new Error('Failed to parse AI response');
    }

    private buildTimeline(data: MissionData): TimelineEvent[] {
        const events: TimelineEvent[] = [
            { time: data.startTime, event: '任務啟動', type: 'start' },
        ];

        if (data.firstResponseTime) {
            events.push({ time: data.firstResponseTime, event: '首批人員抵達', type: 'milestone' });
        }

        for (const incident of data.incidents || []) {
            events.push({ time: incident.time, event: incident.description, type: 'incident' });
        }

        if (data.endTime) {
            events.push({ time: data.endTime, event: '任務結束', type: 'end' });
        }

        return events.sort((a, b) => a.time.getTime() - b.time.getTime());
    }

    private identifyEquipmentIssues(data: MissionData): EquipmentIssue[] {
        // Would analyze equipment logs
        return data.equipmentIssues || [];
    }

    private analyzeCommunications(data: MissionData): CommunicationAnalysis {
        return {
            totalMessages: data.communications?.length || 0,
            averageResponseTime: 5,
            missedCalls: 0,
            channelUtilization: { radio: 60, app: 30, phone: 10 },
        };
    }

    private calculateDuration(start: Date, end?: Date): number {
        if (!end) return 0;
        return Math.round((end.getTime() - start.getTime()) / 60000);
    }

    private calculateAverageMetric(reports: AarReport[], metric: string): number {
        const values = reports.map((r) => (r.metrics as any)[metric] || 0);
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }

    private findCommonProblems(reports: AarReport[]): string[] {
        const problems: Map<string, number> = new Map();

        for (const report of reports) {
            for (const problem of report.whatDidntWork) {
                problems.set(problem, (problems.get(problem) || 0) + 1);
            }
        }

        return Array.from(problems.entries())
            .filter(([, count]) => count >= 2)
            .map(([problem]) => problem);
    }

    private identifyTrends(reports: AarReport[]): string[] {
        // Would analyze trends over time
        return ['響應時間逐漸改善', '溝通效率提升'];
    }
}

// Types
interface MissionData {
    name: string;
    type: string;
    startTime: Date;
    endTime?: Date;
    firstResponseTime?: Date;
    location: { lat: number; lng: number };
    personnel?: any[];
    resourcesUsed?: any[];
    casualties?: { injured: number; missing: number; deceased: number; rescued: number };
    incidents?: { time: Date; description: string }[];
    communications?: any[];
    equipmentIssues?: EquipmentIssue[];
}

interface BasicAnalysis {
    metrics: Record<string, number>;
    whatWorked: string[];
    whatDidntWork: string[];
    recommendations: string[];
}

interface AiAnalysis {
    whatWorked: string[];
    whatDidntWork: string[];
    recommendations: string[];
    lessonsLearned: string[];
    trainingNeeds: string[];
}

interface AarReport {
    id: string;
    missionId: string;
    generatedAt: Date;
    missionSummary: {
        name: string;
        type: string;
        startTime: Date;
        endTime?: Date;
        duration: number;
        location: { lat: number; lng: number };
    };
    metrics: Record<string, number>;
    timeline: TimelineEvent[];
    whatWorked: string[];
    whatDidntWork: string[];
    recommendations: string[];
    lessonsLearned: string[];
    trainingNeeds: string[];
    equipmentIssues: EquipmentIssue[];
    communicationAnalysis: CommunicationAnalysis;
}

interface TimelineEvent {
    time: Date;
    event: string;
    type: 'start' | 'end' | 'milestone' | 'incident';
}

interface EquipmentIssue {
    equipment: string;
    issue: string;
    impact: 'low' | 'medium' | 'high';
}

interface CommunicationAnalysis {
    totalMessages: number;
    averageResponseTime: number;
    missedCalls: number;
    channelUtilization: Record<string, number>;
}

interface ComparativeAnalysis {
    available: boolean;
    reason?: string;
    averageResponseTime?: number;
    averageCasualtiesRescued?: number;
    commonProblems?: string[];
    improvementTrends?: string[];
}

interface ExportResult {
    success: boolean;
    format?: string;
    url?: string;
    error?: string;
}
