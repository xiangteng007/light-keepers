import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseUseCase } from './base.usecase';
import { AiJob } from '../entities';
import { GeminiProvider } from '../providers/gemini.provider';
import { FieldReport } from '../../field-reports/entities';

/**
 * Output schema for report clustering
 */
export interface ClusterOutput {
    clusters: Array<{
        reportIds: string[];
        centroid: { lat: number; lng: number };
        mergeSuggestion: string;
        reason: string;
        confidence: number;
    }>;
}

const CLUSTER_SCHEMA = {
    type: 'object',
    properties: {
        clusters: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    reportIds: { type: 'array', items: { type: 'string' } },
                    centroid: {
                        type: 'object',
                        properties: {
                            lat: { type: 'number' },
                            lng: { type: 'number' },
                        },
                    },
                    mergeSuggestion: { type: 'string' },
                    reason: { type: 'string' },
                    confidence: { type: 'integer', minimum: 0, maximum: 100 },
                },
            },
        },
    },
    required: ['clusters'],
};

const CLUSTER_PROMPT = `
You are analyzing multiple field reports from a disaster response mission to identify duplicates and related reports that should be merged.

Reports:
{{reports}}

Your task:
1. Identify groups of reports that describe the same incident
2. Consider: location proximity (within 500m), time proximity (within 10 min), similar descriptions
3. For each cluster, explain why they should be merged
4. Provide a suggested merge description
5. Rate confidence (0-100)

Only group reports if you're confident they describe the same incident.
Output valid JSON matching the schema.
`.trim();

@Injectable()
export class ReportClusterUseCase extends BaseUseCase {
    readonly useCaseId = 'report.cluster.v1';

    constructor(
        private gemini: GeminiProvider,
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
    ) {
        super();
    }

    async execute(job: AiJob): Promise<ClusterOutput> {
        // entityId contains comma-separated report IDs
        const reportIds = job.entityId.includes(',')
            ? job.entityId.split(',')
            : [job.entityId];

        const reports = await this.reportRepo.findByIds(reportIds);
        if (reports.length < 2) {
            return { clusters: [] };
        }

        const reportsText = reports.map(r => {
            const coords = this.extractCoordinates(r.geom);
            return `ID: ${r.id}\nType: ${r.type}\nMessage: ${this.truncate(r.message, 200)}\nLocation: (${coords?.lat ?? 0}, ${coords?.lng ?? 0})\nTime: ${r.createdAt.toISOString()}`;
        }).join('\n---\n');

        const prompt = this.buildPrompt(CLUSTER_PROMPT, {
            reports: reportsText,
        });

        const result = await this.gemini.run({
            useCaseId: this.useCaseId,
            prompt,
            schema: CLUSTER_SCHEMA,
            maxOutputTokens: 1024,
        });

        return result.outputJson as ClusterOutput;
    }

    async fallback(job: AiJob): Promise<ClusterOutput> {
        const reportIds = job.entityId.includes(',')
            ? job.entityId.split(',')
            : [job.entityId];

        const reports = await this.reportRepo.findByIds(reportIds);
        if (reports.length < 2) {
            return { clusters: [] };
        }

        return this.distanceBasedClustering(reports);
    }

    /**
     * Simple distance and time based clustering
     */
    private distanceBasedClustering(reports: FieldReport[]): ClusterOutput {
        const clusters: ClusterOutput['clusters'] = [];
        const used = new Set<string>();

        for (const report of reports) {
            if (used.has(report.id)) continue;

            const reportCoords = this.extractCoordinates(report.geom);
            if (!reportCoords) continue;

            const nearby = reports.filter(r => {
                if (used.has(r.id) || r.id === report.id) return false;
                if (r.type !== report.type) return false;

                const rCoords = this.extractCoordinates(r.geom);
                if (!rCoords) return false;

                const distance = this.haversineDistance(
                    reportCoords.lat, reportCoords.lng,
                    rCoords.lat, rCoords.lng,
                );
                if (distance > 500) return false; // 500m

                const timeDiff = Math.abs(
                    new Date(report.createdAt).getTime() - new Date(r.createdAt).getTime(),
                );
                if (timeDiff > 600000) return false; // 10 min

                return true;
            });

            if (nearby.length > 0) {
                const clusterReports = [report, ...nearby];
                const centroid = this.calculateCentroid(clusterReports);

                clusters.push({
                    reportIds: clusterReports.map(r => r.id),
                    centroid,
                    mergeSuggestion: `合併 ${clusterReports.length} 筆 ${report.type} 類型報告`,
                    reason: '位置相近 (500m 內)，時間相近 (10 分鐘內)',
                    confidence: 50,
                });

                clusterReports.forEach(r => used.add(r.id));
            }
        }

        return { clusters };
    }

    /**
     * Haversine distance in meters
     */
    private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // Earth radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    private toRad(deg: number): number {
        return deg * Math.PI / 180;
    }

    private calculateCentroid(reports: FieldReport[]): { lat: number; lng: number } {
        let sumLat = 0, sumLng = 0, count = 0;
        for (const r of reports) {
            const coords = this.extractCoordinates(r.geom);
            if (coords) {
                sumLat += coords.lat;
                sumLng += coords.lng;
                count++;
            }
        }
        return count > 0
            ? { lat: sumLat / count, lng: sumLng / count }
            : { lat: 0, lng: 0 };
    }

    /**
     * Extract lat/lng from PostGIS geometry
     */
    private extractCoordinates(geom: any): { lat: number; lng: number } | null {
        if (!geom) return null;

        if (geom.coordinates) {
            return { lng: geom.coordinates[0], lat: geom.coordinates[1] };
        }

        if (typeof geom === 'string' && geom.startsWith('POINT')) {
            const match = geom.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
            if (match) {
                return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
            }
        }

        return null;
    }
}
