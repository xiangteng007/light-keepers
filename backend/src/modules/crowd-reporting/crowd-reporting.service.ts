import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Crowd Reporting Service
 * Public disaster reporting with AI classification
 */
@Injectable()
export class CrowdReportingService {
    private readonly logger = new Logger(CrowdReportingService.name);

    // Reports storage
    private reports: Map<string, CrowdReport> = new Map();

    // Cluster detection
    private clusters: ReportCluster[] = [];

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Submit public disaster report
     */
    async submitReport(report: ReportSubmission): Promise<CrowdReport> {
        const crowdReport: CrowdReport = {
            id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...report,
            status: 'pending',
            classification: null,
            credibilityScore: 0,
            verifiedBy: null,
            clusterIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Auto-classify using AI
        crowdReport.classification = await this.classifyReport(report);

        // Calculate credibility score
        crowdReport.credibilityScore = await this.calculateCredibility(report);

        // Check for cluster membership
        await this.assignToCluster(crowdReport);

        this.reports.set(crowdReport.id, crowdReport);

        // Auto-verify high credibility reports
        if (crowdReport.credibilityScore > 80) {
            crowdReport.status = 'verified';
            this.eventEmitter.emit('crowd.report.verified', crowdReport);
        } else {
            this.eventEmitter.emit('crowd.report.pending', crowdReport);
        }

        this.logger.log(`Crowd report submitted: ${crowdReport.id}, score: ${crowdReport.credibilityScore}`);

        return crowdReport;
    }

    /**
     * Get reports in area
     */
    getReportsInArea(bounds: GeoBounds, filters?: ReportFilters): CrowdReport[] {
        return Array.from(this.reports.values()).filter((report) => {
            // Check bounds
            if (
                report.location.lat < bounds.south ||
                report.location.lat > bounds.north ||
                report.location.lng < bounds.west ||
                report.location.lng > bounds.east
            ) {
                return false;
            }

            // Apply filters
            if (filters?.type && report.classification?.type !== filters.type) {
                return false;
            }
            if (filters?.status && report.status !== filters.status) {
                return false;
            }
            if (filters?.minCredibility && report.credibilityScore < filters.minCredibility) {
                return false;
            }

            return true;
        });
    }

    /**
     * Get report clusters (aggregated incidents)
     */
    getReportClusters(): ReportCluster[] {
        return this.clusters;
    }

    /**
     * Verify report by responder
     */
    async verifyReport(reportId: string, verifierId: string, status: 'verified' | 'false'): Promise<CrowdReport> {
        const report = this.reports.get(reportId);
        if (!report) {
            throw new Error(`Report not found: ${reportId}`);
        }

        report.status = status;
        report.verifiedBy = verifierId;
        report.updatedAt = new Date();

        // Update cluster confidence
        for (const clusterId of report.clusterIds) {
            this.updateClusterConfidence(clusterId);
        }

        this.eventEmitter.emit(`crowd.report.${status}`, report);

        return report;
    }

    /**
     * Get trending disaster types
     */
    getTrendingTypes(hours: number = 6): TrendingType[] {
        const cutoff = new Date(Date.now() - hours * 3600000);
        const typeCounts: Map<string, number> = new Map();

        for (const report of this.reports.values()) {
            if (report.createdAt > cutoff && report.classification?.type) {
                const count = typeCounts.get(report.classification.type) || 0;
                typeCounts.set(report.classification.type, count + 1);
            }
        }

        return Array.from(typeCounts.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }

    // Private methods
    private async classifyReport(report: ReportSubmission): Promise<ReportClassification> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            return this.classifyHeuristic(report);
        }

        try {
            const prompt = `Classify this disaster report into one of: flood, fire, earthquake, landslide, typhoon, accident, infrastructure, other.
      Also rate severity 1-5 and extract any specific hazards.
      Return JSON only: {"type": "...", "severity": 1-5, "hazards": [...]}
      
      Report: ${report.description}
      Location type: ${report.locationType || 'unknown'}`;

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
                        type: parsed.type || 'other',
                        severity: parsed.severity || 3,
                        hazards: parsed.hazards || [],
                        confidence: 0.85,
                    };
                }
            }
        } catch (error) {
            this.logger.error('AI classification failed', error);
        }

        return this.classifyHeuristic(report);
    }

    private classifyHeuristic(report: ReportSubmission): ReportClassification {
        const text = report.description.toLowerCase();

        const typeKeywords: Record<string, string[]> = {
            flood: ['淹水', '水災', '積水', 'flood', 'water'],
            fire: ['火災', '失火', '著火', 'fire', 'smoke'],
            earthquake: ['地震', '搖晃', 'earthquake', 'shake'],
            landslide: ['土石流', '落石', '坍方', 'landslide', 'debris'],
            typhoon: ['颱風', '強風', '狂風', 'typhoon', 'storm'],
            accident: ['車禍', '事故', '碰撞', 'accident', 'crash'],
        };

        for (const [type, keywords] of Object.entries(typeKeywords)) {
            if (keywords.some((kw) => text.includes(kw))) {
                return { type, severity: 3, hazards: [], confidence: 0.7 };
            }
        }

        return { type: 'other', severity: 2, hazards: [], confidence: 0.5 };
    }

    private async calculateCredibility(report: ReportSubmission): Promise<number> {
        let score = 50; // Base score

        // Has photo: +20
        if (report.photos && report.photos.length > 0) {
            score += 20;
        }

        // Has video: +15
        if (report.videos && report.videos.length > 0) {
            score += 15;
        }

        // Detailed description: +10
        if (report.description.length > 100) {
            score += 10;
        }

        // Reporter is registered user: +15
        if (report.reporterId) {
            score += 15;
        }

        // Multiple reports in same area (corroboration)
        const nearbyCount = await this.countNearbyReports(report.location);
        score += Math.min(nearbyCount * 5, 20);

        return Math.min(score, 100);
    }

    private async countNearbyReports(location: GeoPoint): Promise<number> {
        const radius = 0.01; // ~1km
        let count = 0;

        for (const report of this.reports.values()) {
            const distance = Math.abs(report.location.lat - location.lat) +
                Math.abs(report.location.lng - location.lng);
            if (distance < radius) count++;
        }

        return count;
    }

    private async assignToCluster(report: CrowdReport): Promise<void> {
        const clusterRadius = 0.005; // ~500m

        for (const cluster of this.clusters) {
            const distance = Math.abs(cluster.center.lat - report.location.lat) +
                Math.abs(cluster.center.lng - report.location.lng);

            if (distance < clusterRadius && cluster.type === report.classification?.type) {
                cluster.reportIds.push(report.id);
                report.clusterIds.push(cluster.id);
                this.updateClusterCenter(cluster);
                return;
            }
        }

        // Create new cluster
        const newCluster: ReportCluster = {
            id: `cluster-${Date.now()}`,
            center: report.location,
            type: report.classification?.type || 'unknown',
            reportIds: [report.id],
            confidence: report.credibilityScore,
            createdAt: new Date(),
        };

        this.clusters.push(newCluster);
        report.clusterIds.push(newCluster.id);
    }

    private updateClusterCenter(cluster: ReportCluster): void {
        const reports = cluster.reportIds
            .map((id) => this.reports.get(id))
            .filter(Boolean) as CrowdReport[];

        if (reports.length === 0) return;

        cluster.center = {
            lat: reports.reduce((sum, r) => sum + r.location.lat, 0) / reports.length,
            lng: reports.reduce((sum, r) => sum + r.location.lng, 0) / reports.length,
        };
    }

    private updateClusterConfidence(clusterId: string): void {
        const cluster = this.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;

        const reports = cluster.reportIds
            .map((id) => this.reports.get(id))
            .filter(Boolean) as CrowdReport[];

        const verifiedCount = reports.filter((r) => r.status === 'verified').length;
        cluster.confidence = (verifiedCount / reports.length) * 100;
    }
}

// Type definitions
interface GeoPoint {
    lat: number;
    lng: number;
}

interface GeoBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

interface ReportSubmission {
    reporterId?: string;
    description: string;
    location: GeoPoint;
    locationType?: string;
    photos?: string[];
    videos?: string[];
    contactInfo?: string;
}

interface ReportClassification {
    type: string;
    severity: number;
    hazards: string[];
    confidence: number;
}

interface CrowdReport extends ReportSubmission {
    id: string;
    status: 'pending' | 'verified' | 'false' | 'duplicate';
    classification: ReportClassification | null;
    credibilityScore: number;
    verifiedBy: string | null;
    clusterIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface ReportCluster {
    id: string;
    center: GeoPoint;
    type: string;
    reportIds: string[];
    confidence: number;
    createdAt: Date;
}

interface ReportFilters {
    type?: string;
    status?: string;
    minCredibility?: number;
}

interface TrendingType {
    type: string;
    count: number;
}
