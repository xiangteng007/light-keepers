/**
 * Anomaly Detection Service
 * AI-powered detection of unusual patterns and behaviors
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface Anomaly {
    id: string;
    type: AnomalyType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
    affectedEntity?: string;
    metrics?: Record<string, number>;
    recommendation?: string;
}

export type AnomalyType =
    | 'spike_in_reports'
    | 'unusual_location'
    | 'suspicious_pattern'
    | 'resource_anomaly'
    | 'user_behavior';

export interface AnomalyConfig {
    spikeThreshold: number; // Standard deviations
    locationRadius: number; // km
    minSampleSize: number;
    lookbackDays: number;
}

const DEFAULT_CONFIG: AnomalyConfig = {
    spikeThreshold: 2.5,
    locationRadius: 10,
    minSampleSize: 30,
    lookbackDays: 30,
};

@Injectable()
export class AnomalyDetectionService {
    private readonly logger = new Logger(AnomalyDetectionService.name);
    private config: AnomalyConfig = DEFAULT_CONFIG;

    constructor(private dataSource: DataSource) { }

    // ==================== Main Detection ====================

    /**
     * Run full anomaly detection scan
     */
    async detectAnomalies(): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        try {
            // Detect various anomaly types in parallel
            const [spikes, locations, patterns, resources] = await Promise.all([
                this.detectReportSpikes(),
                this.detectUnusualLocations(),
                this.detectSuspiciousPatterns(),
                this.detectResourceAnomalies(),
            ]);

            anomalies.push(...spikes, ...locations, ...patterns, ...resources);

            // Sort by severity
            return this.sortBySeverity(anomalies);
        } catch (error) {
            this.logger.error('Anomaly detection failed', error);
            return [];
        }
    }

    /**
     * Detect spikes in incident reports
     */
    async detectReportSpikes(): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Get hourly report counts for the past day
        const hourlyCounts = await this.safeQuery(`
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(*) as count
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY DATE_TRUNC('hour', created_at)
            ORDER BY hour
        `, []);

        if (!hourlyCounts || hourlyCounts.length < 3) return [];

        // Calculate statistics
        const counts = hourlyCounts.map((r: any) => Number(r.count));
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const stdDev = Math.sqrt(
            counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length
        );

        // Detect spikes
        for (const row of hourlyCounts) {
            const count = Number(row.count);
            const zScore = (count - mean) / (stdDev || 1);

            if (zScore > this.config.spikeThreshold) {
                anomalies.push({
                    id: `spike-${Date.now()}`,
                    type: 'spike_in_reports',
                    severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
                    description: `Unusual spike in reports: ${count} reports (${zScore.toFixed(1)}σ above normal)`,
                    detectedAt: new Date(row.hour),
                    metrics: { count, mean: Math.round(mean), zScore: parseFloat(zScore.toFixed(2)) },
                    recommendation: 'Investigate potential incident cluster',
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect reports from unusual locations
     */
    async detectUnusualLocations(): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Get recent reports with coordinates
        const recentReports = await this.safeQuery(`
            SELECT id, latitude, longitude, location, created_at
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '24 hours'
            AND latitude IS NOT NULL
            AND longitude IS NOT NULL
        `, []);

        // Get historical centroid
        const historical = await this.safeQuery(`
            SELECT AVG(latitude) as lat, AVG(longitude) as lng
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '${this.config.lookbackDays} days'
        `, []);

        if (!historical?.[0]?.lat || !recentReports) return [];

        const centerLat = Number(historical[0].lat);
        const centerLng = Number(historical[0].lng);

        for (const report of recentReports) {
            const distance = this.haversineDistance(
                centerLat, centerLng,
                Number(report.latitude), Number(report.longitude)
            );

            if (distance > this.config.locationRadius * 3) {
                anomalies.push({
                    id: `location-${report.id}`,
                    type: 'unusual_location',
                    severity: distance > this.config.locationRadius * 5 ? 'high' : 'medium',
                    description: `Report from unusual location: ${report.location || 'Unknown'} (${distance.toFixed(1)}km from center)`,
                    detectedAt: new Date(report.created_at),
                    affectedEntity: report.id,
                    metrics: { distance },
                    recommendation: 'Verify report authenticity',
                });
            }
        }

        return anomalies;
    }

    /**
     * Detect suspicious user behavior patterns
     */
    async detectSuspiciousPatterns(): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Detect rapid-fire reports from same user
        const rapidReports = await this.safeQuery(`
            SELECT reporter_id, COUNT(*) as count
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '1 hour'
            GROUP BY reporter_id
            HAVING COUNT(*) > 5
        `, []);

        for (const row of rapidReports || []) {
            anomalies.push({
                id: `pattern-rapid-${row.reporter_id}`,
                type: 'suspicious_pattern',
                severity: Number(row.count) > 10 ? 'high' : 'medium',
                description: `User submitted ${row.count} reports in one hour`,
                detectedAt: new Date(),
                affectedEntity: row.reporter_id,
                metrics: { reportCount: Number(row.count) },
                recommendation: 'Review user activity for potential abuse',
            });
        }

        return anomalies;
    }

    /**
     * Detect resource level anomalies
     */
    async detectResourceAnomalies(): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Check for critically low resources
        const lowResources = await this.safeQuery(`
            SELECT name, quantity, unit
            FROM resources
            WHERE quantity < 10
            AND status = 'active'
        `, []);

        for (const resource of lowResources || []) {
            anomalies.push({
                id: `resource-${resource.name}`,
                type: 'resource_anomaly',
                severity: Number(resource.quantity) === 0 ? 'critical' : 'high',
                description: `Low resource: ${resource.name} (${resource.quantity} ${resource.unit} remaining)`,
                detectedAt: new Date(),
                affectedEntity: resource.name,
                metrics: { quantity: Number(resource.quantity) },
                recommendation: 'Replenish inventory immediately',
            });
        }

        return anomalies;
    }

    // ==================== Helpers ====================

    private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    private sortBySeverity(anomalies: Anomaly[]): Anomaly[] {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
    }

    private async safeQuery(sql: string, params: any[]): Promise<any[] | null> {
        try {
            return await this.dataSource.query(sql, params);
        } catch {
            return null;
        }
    }
}
