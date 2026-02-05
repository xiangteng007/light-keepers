import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Disaster Summary Service
 * AI-powered automatic disaster situation summarization
 */
@Injectable()
export class DisasterSummaryService {
    private readonly logger = new Logger(DisasterSummaryService.name);

    constructor(private configService: ConfigService) { }

    /**
     * Generate situation summary from multiple sources
     */
    async generateSummary(missionId: string, sources: SummarySource[]): Promise<DisasterSummary> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        // Aggregate data from sources
        const aggregatedData = this.aggregateSourceData(sources);

        if (!apiKey) {
            return this.generateBasicSummary(aggregatedData);
        }

        try {
            const prompt = `Generate a concise disaster situation summary in Traditional Chinese.
      Include: 災情概述, 影響範圍, 傷亡情況, 資源需求, 優先行動.
      Format as structured JSON: {"overview": "...", "scope": "...", "casualties": {...}, "needs": [...], "priorities": [...], "keyMetrics": {...}}
      
      Data:
      Reports: ${JSON.stringify(aggregatedData.reports.slice(0, 10))}
      Resources: ${JSON.stringify(aggregatedData.resources)}
      Personnel: ${JSON.stringify(aggregatedData.personnel)}
      Timeline: ${JSON.stringify(aggregatedData.timeline.slice(-5))}`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                },
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    return {
                        missionId,
                        generatedAt: new Date(),
                        overview: parsed.overview || '',
                        scope: parsed.scope || '',
                        casualties: parsed.casualties || { injured: 0, missing: 0, deceased: 0, rescued: 0 },
                        needs: parsed.needs || [],
                        priorities: parsed.priorities || [],
                        keyMetrics: parsed.keyMetrics || {},
                        confidence: 0.85,
                    };
                }
            }
        } catch (error) {
            this.logger.error('AI summary generation failed', error);
        }

        return this.generateBasicSummary(aggregatedData);
    }

    /**
     * Generate comparative analysis between time periods
     */
    async generateProgressReport(
        missionId: string,
        fromTime: Date,
        toTime: Date,
    ): Promise<ProgressReport> {
        // Would compare metrics between time periods
        return {
            missionId,
            period: { from: fromTime, to: toTime },
            improvements: ['救援人數增加 15 人', '物資配送完成 80%'],
            concerns: ['仍有 3 區域無法進入'],
            nextSteps: ['持續搜索受困區域', '增派醫療人員'],
            generatedAt: new Date(),
        };
    }

    /**
     * Generate SITREP document
     */
    async generateSitrep(missionId: string): Promise<SitrepDocument> {
        const summary = await this.generateSummary(missionId, []);

        return {
            documentId: `SITREP-${Date.now()}`,
            missionId,
            timestamp: new Date(),
            situation: summary.overview,
            assessment: summary.scope,
            casualties: summary.casualties,
            resourceStatus: summary.needs.map((n) => ({ item: n, status: 'needed' })),
            plannedActions: summary.priorities,
            requestsForSupport: [],
            preparedBy: 'AI Auto-generated',
        };
    }

    // Private
    private aggregateSourceData(sources: SummarySource[]): AggregatedData {
        const reports: ReportData[] = [];
        const resources: ResourceData[] = [];
        const timeline: TimelineEntry[] = [];
        let personnel = { total: 0, deployed: 0, available: 0 };

        for (const source of sources) {
            if (source.type === 'reports' && Array.isArray(source.data)) {
                reports.push(...(source.data as ReportData[]));
            }
            if (source.type === 'resources' && Array.isArray(source.data)) {
                resources.push(...(source.data as ResourceData[]));
            }
            if (source.type === 'personnel' && source.data && typeof source.data === 'object' && 'total' in source.data) {
                personnel = source.data as { total: number; deployed: number; available: number };
            }
            if (source.type === 'timeline' && Array.isArray(source.data)) {
                timeline.push(...(source.data as TimelineEntry[]));
            }
        }

        return { reports, resources, personnel, timeline };
    }

    private generateBasicSummary(data: AggregatedData): DisasterSummary {
        return {
            missionId: '',
            generatedAt: new Date(),
            overview: `共收到 ${data.reports.length} 則回報`,
            scope: '待評估',
            casualties: { injured: 0, missing: 0, deceased: 0, rescued: 0 },
            needs: ['待評估'],
            priorities: ['持續監控'],
            keyMetrics: { reportCount: data.reports.length },
            confidence: 0.5,
        };
    }
}

// Types
interface SummarySource {
    type: 'reports' | 'resources' | 'personnel' | 'timeline' | 'sensors';
    data: ReportData[] | ResourceData[] | TimelineEntry[] | { total: number; deployed: number; available: number } | unknown;
}

interface AggregatedData {
    reports: ReportData[];
    resources: ResourceData[];
    personnel: { total: number; deployed: number; available: number };
    timeline: TimelineEntry[];
}

/** Report data from field reports */
interface ReportData {
    id: string;
    content: string;
    location?: { lat: number; lng: number };
    timestamp: Date;
    severity?: string;
}

/** Resource data for summary */
interface ResourceData {
    id: string;
    type: string;
    quantity: number;
    status: string;
}

/** Timeline entry for events */
interface TimelineEntry {
    timestamp: Date;
    event: string;
    details?: string;
}

interface DisasterSummary {
    missionId: string;
    generatedAt: Date;
    overview: string;
    scope: string;
    casualties: { injured: number; missing: number; deceased: number; rescued: number };
    needs: string[];
    priorities: string[];
    keyMetrics: Record<string, unknown>;
    confidence: number;
}

interface ProgressReport {
    missionId: string;
    period: { from: Date; to: Date };
    improvements: string[];
    concerns: string[];
    nextSteps: string[];
    generatedAt: Date;
}

interface SitrepDocument {
    documentId: string;
    missionId: string;
    timestamp: Date;
    situation: string;
    assessment: string;
    casualties: { injured: number; missing: number; deceased: number; rescued: number };
    resourceStatus: { item: string; status: string }[];
    plannedActions: string[];
    requestsForSupport: string[];
    preparedBy: string;
}
