/**
 * Predictive Analytics Service
 * AI-powered risk prediction and pattern analysis
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface RiskPrediction {
    area: string;
    coordinates: { lat: number; lng: number };
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number; // 0-100
    factors: string[];
    predictedTimeframe: string;
    confidence: number; // 0-1
}

export interface TrendAnalysis {
    metric: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    forecast: number[];
}

export interface PatternInsight {
    type: string;
    description: string;
    frequency: string;
    lastOccurrence?: string;
    recommendation?: string;
}

@Injectable()
export class PredictiveAnalyticsService {
    private readonly logger = new Logger(PredictiveAnalyticsService.name);

    constructor(private dataSource: DataSource) { }

    // ==================== Risk Prediction ====================

    /**
     * Predict high-risk areas based on historical data
     */
    async predictHighRiskAreas(): Promise<RiskPrediction[]> {
        // Analyze historical incident data to identify patterns
        const predictions: RiskPrediction[] = [];

        try {
            // Get historical incidents by area
            const incidentsByArea = await this.getIncidentsByArea();

            for (const [area, data] of Object.entries(incidentsByArea)) {
                const riskScore = this.calculateRiskScore(data);
                const riskLevel = this.scoreToLevel(riskScore);

                predictions.push({
                    area,
                    coordinates: data.coordinates,
                    riskLevel,
                    riskScore,
                    factors: data.factors,
                    predictedTimeframe: 'Next 24-48 hours',
                    confidence: data.confidence,
                });
            }

            return predictions.sort((a, b) => b.riskScore - a.riskScore);
        } catch (error) {
            this.logger.error('Risk prediction failed', error);
            return [];
        }
    }

    /**
     * Predict SOS signal likelihood for an area
     */
    async predictSOSLikelihood(lat: number, lng: number, radiusKm: number = 5): Promise<{
        likelihood: number;
        historicalCount: number;
        peakHours: number[];
    }> {
        try {
            // Get historical SOS signals in area
            const signals = await this.getSOSSignalsInArea(lat, lng, radiusKm);

            // Calculate time-based patterns
            const hourlyDistribution = new Array(24).fill(0);
            signals.forEach((s: any) => {
                const hour = new Date(s.created_at).getHours();
                hourlyDistribution[hour]++;
            });

            const peakHours = hourlyDistribution
                .map((count, hour) => ({ hour, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map(h => h.hour);

            const avgDaily = signals.length / 30; // Last 30 days
            const likelihood = Math.min(avgDaily * 10, 100);

            return {
                likelihood,
                historicalCount: signals.length,
                peakHours,
            };
        } catch (error) {
            return { likelihood: 0, historicalCount: 0, peakHours: [] };
        }
    }

    // ==================== Trend Analysis ====================

    /**
     * Analyze trends for key metrics
     */
    async analyzeTrends(days: number = 30): Promise<TrendAnalysis[]> {
        const trends: TrendAnalysis[] = [];

        // Incident trends
        const incidentTrend = await this.calculateTrend('field_reports', days);
        trends.push({ metric: 'incidents', ...incidentTrend });

        // SOS trends
        const sosTrend = await this.calculateTrend('sos_signals', days);
        trends.push({ metric: 'sosSignals', ...sosTrend });

        // Task completion trends
        const taskTrend = await this.calculateTaskCompletionTrend(days);
        trends.push({ metric: 'taskCompletion', ...taskTrend });

        return trends;
    }

    /**
     * Generate simple forecast using moving averages
     */
    async generateForecast(metric: string, daysAhead: number = 7): Promise<number[]> {
        const historicalData = await this.getHistoricalData(metric, 30);

        // Simple moving average forecast
        const windowSize = 7;
        const forecast: number[] = [];

        for (let i = 0; i < daysAhead; i++) {
            const data = [...historicalData, ...forecast];
            const window = data.slice(-windowSize);
            const avg = window.reduce((a, b) => a + b, 0) / window.length;
            forecast.push(Math.round(avg));
        }

        return forecast;
    }

    // ==================== Pattern Detection ====================

    /**
     * Detect recurring patterns in incident data
     */
    async detectPatterns(): Promise<PatternInsight[]> {
        const patterns: PatternInsight[] = [];

        // Time-based patterns
        const timePatterns = await this.detectTimePatterns();
        patterns.push(...timePatterns);

        // Location-based patterns
        const locationPatterns = await this.detectLocationPatterns();
        patterns.push(...locationPatterns);

        // Weather-correlated patterns
        const weatherPatterns = await this.detectWeatherPatterns();
        patterns.push(...weatherPatterns);

        return patterns;
    }

    // ==================== Private Helpers ====================

    private async getIncidentsByArea(): Promise<Record<string, any>> {
        const result = await this.safeQuery(`
            SELECT 
                COALESCE(location, 'Unknown') as area,
                COUNT(*) as count,
                AVG(latitude) as lat,
                AVG(longitude) as lng
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '90 days'
            GROUP BY location
            HAVING COUNT(*) > 2
        `, []);

        const areas: Record<string, any> = {};
        for (const row of result || []) {
            areas[row.area] = {
                count: Number(row.count),
                coordinates: { lat: Number(row.lat) || 25.0, lng: Number(row.lng) || 121.5 },
                factors: ['Historical incidents', 'Geographic risk'],
                confidence: Math.min(0.5 + Number(row.count) * 0.05, 0.95),
            };
        }
        return areas;
    }

    private async getSOSSignalsInArea(lat: number, lng: number, radiusKm: number): Promise<any[]> {
        // Approximate degree conversion: 1 degree ≈ 111km
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

        const result = await this.safeQuery(`
            SELECT * FROM sos_signals
            WHERE latitude BETWEEN $1 AND $2
            AND longitude BETWEEN $3 AND $4
            AND created_at > NOW() - INTERVAL '30 days'
        `, [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta]);

        return result || [];
    }

    private calculateRiskScore(data: any): number {
        const baseScore = Math.min(data.count * 10, 50);
        const confidenceBonus = data.confidence * 30;
        const factorBonus = data.factors.length * 5;
        return Math.min(baseScore + confidenceBonus + factorBonus, 100);
    }

    private scoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    private async calculateTrend(table: string, days: number): Promise<Omit<TrendAnalysis, 'metric'>> {
        const current = await this.safeQuery(
            `SELECT COUNT(*) as count FROM ${table} WHERE created_at > NOW() - INTERVAL '${days} days'`,
            []
        );
        const previous = await this.safeQuery(
            `SELECT COUNT(*) as count FROM ${table} 
             WHERE created_at > NOW() - INTERVAL '${days * 2} days'
             AND created_at <= NOW() - INTERVAL '${days} days'`,
            []
        );

        const currentValue = Number(current?.[0]?.count) || 0;
        const previousValue = Number(previous?.[0]?.count) || 1;
        const changePercent = ((currentValue - previousValue) / previousValue) * 100;

        return {
            currentValue,
            previousValue,
            changePercent: Math.round(changePercent),
            trend: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
            forecast: [],
        };
    }

    private async calculateTaskCompletionTrend(days: number): Promise<Omit<TrendAnalysis, 'metric'>> {
        const result = await this.safeQuery(`
            SELECT 
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(*) as total
            FROM tasks
            WHERE created_at > NOW() - INTERVAL '${days} days'
        `, []);

        const completed = Number(result?.[0]?.completed) || 0;
        const total = Number(result?.[0]?.total) || 1;
        const rate = (completed / total) * 100;

        return {
            currentValue: Math.round(rate),
            previousValue: 70, // Baseline
            changePercent: Math.round(rate - 70),
            trend: rate > 75 ? 'increasing' : rate < 65 ? 'decreasing' : 'stable',
            forecast: [],
        };
    }

    private async getHistoricalData(metric: string, days: number): Promise<number[]> {
        const table = metric === 'incidents' ? 'field_reports' : 'sos_signals';
        const result = await this.safeQuery(`
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM ${table}
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY day
        `, []);

        return (result || []).map((r: any) => Number(r.count));
    }

    private async detectTimePatterns(): Promise<PatternInsight[]> {
        const result = await this.safeQuery(`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                EXTRACT(DOW FROM created_at) as dow,
                COUNT(*) as count
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '90 days'
            GROUP BY hour, dow
            ORDER BY count DESC
            LIMIT 5
        `, []);

        const patterns: PatternInsight[] = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (const row of result || []) {
            patterns.push({
                type: 'time_pattern',
                description: `Peak incidents on ${dayNames[Number(row.dow)]} around ${row.hour}:00`,
                frequency: `${row.count} occurrences`,
                recommendation: 'Increase monitoring during these times',
            });
        }

        return patterns.slice(0, 3);
    }

    private async detectLocationPatterns(): Promise<PatternInsight[]> {
        const result = await this.safeQuery(`
            SELECT location, COUNT(*) as count
            FROM field_reports
            WHERE created_at > NOW() - INTERVAL '90 days'
            GROUP BY location
            ORDER BY count DESC
            LIMIT 3
        `, []);

        return (result || []).map((row: any) => ({
            type: 'location_hotspot',
            description: `${row.location} is a recurring incident location`,
            frequency: `${row.count} incidents in 90 days`,
            recommendation: 'Consider deploying resources to this area',
        }));
    }

    private async detectWeatherPatterns(): Promise<PatternInsight[]> {
        // Placeholder - would integrate with weather data
        return [{
            type: 'weather_correlation',
            description: 'Increased incidents during heavy rain periods',
            frequency: 'Seasonal pattern',
            recommendation: 'Pre-position resources during weather warnings',
        }];
    }

    private async safeQuery(sql: string, params: any[]): Promise<any[] | null> {
        try {
            return await this.dataSource.query(sql, params);
        } catch {
            return null;
        }
    }
}
