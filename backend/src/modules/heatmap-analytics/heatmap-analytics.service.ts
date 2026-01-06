import { Injectable, Logger } from '@nestjs/common';

/**
 * Heatmap Analytics Service
 * Disaster hotspot analysis
 */
@Injectable()
export class HeatmapAnalyticsService {
    private readonly logger = new Logger(HeatmapAnalyticsService.name);

    /**
     * 產生熱點資料
     */
    generateHeatmapData(incidents: IncidentData[], options?: HeatmapOptions): HeatmapPoint[] {
        const gridSize = options?.gridSize || 0.01; // 約 1km
        const grid: Map<string, HeatmapPoint> = new Map();

        for (const incident of incidents) {
            const gridX = Math.floor(incident.lat / gridSize);
            const gridY = Math.floor(incident.lng / gridSize);
            const key = `${gridX},${gridY}`;

            if (grid.has(key)) {
                const point = grid.get(key)!;
                point.weight += this.calcWeight(incident);
                point.count++;
            } else {
                grid.set(key, {
                    lat: gridX * gridSize + gridSize / 2,
                    lng: gridY * gridSize + gridSize / 2,
                    weight: this.calcWeight(incident),
                    count: 1,
                });
            }
        }

        return Array.from(grid.values()).sort((a, b) => b.weight - a.weight);
    }

    /**
     * 時間序列熱點
     */
    generateTimeSeriesHeatmap(incidents: IncidentData[], interval: 'hour' | 'day' | 'week'): TimeSliceHeatmap[] {
        const slices: Map<string, IncidentData[]> = new Map();

        for (const incident of incidents) {
            const date = new Date(incident.timestamp);
            let key: string;

            switch (interval) {
                case 'hour': key = `${date.toISOString().slice(0, 13)}`; break;
                case 'day': key = `${date.toISOString().slice(0, 10)}`; break;
                case 'week': key = `W${this.getWeekNumber(date)}`; break;
            }

            if (!slices.has(key)) slices.set(key, []);
            slices.get(key)!.push(incident);
        }

        return Array.from(slices.entries()).map(([time, data]) => ({
            time,
            heatmap: this.generateHeatmapData(data),
            totalIncidents: data.length,
        }));
    }

    /**
     * 分類熱點
     */
    generateCategorizedHeatmap(incidents: IncidentData[]): CategoryHeatmap[] {
        const byCategory: Map<string, IncidentData[]> = new Map();

        for (const incident of incidents) {
            const cat = incident.category || 'other';
            if (!byCategory.has(cat)) byCategory.set(cat, []);
            byCategory.get(cat)!.push(incident);
        }

        return Array.from(byCategory.entries()).map(([category, data]) => ({
            category,
            heatmap: this.generateHeatmapData(data),
            color: this.getCategoryColor(category),
        }));
    }

    /**
     * 取得熱點統計
     */
    getHotspotStats(heatmap: HeatmapPoint[], topN: number = 5): HotspotStats {
        const sorted = [...heatmap].sort((a, b) => b.weight - a.weight);
        const topHotspots = sorted.slice(0, topN);
        const totalWeight = heatmap.reduce((sum, p) => sum + p.weight, 0);

        return {
            totalPoints: heatmap.length,
            totalWeight,
            topHotspots: topHotspots.map((h, i) => ({
                rank: i + 1,
                ...h,
                percentage: (h.weight / totalWeight * 100).toFixed(1) + '%',
            })),
            maxWeight: sorted[0]?.weight || 0,
            avgWeight: heatmap.length > 0 ? totalWeight / heatmap.length : 0,
        };
    }

    private calcWeight(incident: IncidentData): number {
        const severityWeight = (incident.severity || 1) * 2;
        const recency = Date.now() - new Date(incident.timestamp).getTime();
        const decayFactor = Math.exp(-recency / (7 * 24 * 3600000)); // 7天衰減
        return severityWeight * decayFactor;
    }

    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    private getCategoryColor(category: string): string {
        const colors: Record<string, string> = {
            earthquake: '#FF0000', flood: '#0088FF', fire: '#FF6600',
            typhoon: '#9900FF', landslide: '#996600', other: '#999999',
        };
        return colors[category] || '#999999';
    }
}

// Types
interface IncidentData { lat: number; lng: number; timestamp: string; severity?: number; category?: string; }
interface HeatmapOptions { gridSize?: number; }
interface HeatmapPoint { lat: number; lng: number; weight: number; count: number; }
interface TimeSliceHeatmap { time: string; heatmap: HeatmapPoint[]; totalIncidents: number; }
interface CategoryHeatmap { category: string; heatmap: HeatmapPoint[]; color: string; }
interface HotspotStats { totalPoints: number; totalWeight: number; topHotspots: any[]; maxWeight: number; avgWeight: number; }
