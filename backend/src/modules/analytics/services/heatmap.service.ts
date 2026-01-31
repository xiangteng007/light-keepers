import { Injectable, Logger } from '@nestjs/common';

export interface HeatmapPoint {
    lat: number;
    lng: number;
    value: number;
    metadata?: Record<string, any>;
}

export interface HeatmapConfig {
    radius: number;
    blur: number;
    maxZoom: number;
    gradient?: Record<number, string>;
}

export interface HeatmapLayer {
    id: string;
    name: string;
    points: HeatmapPoint[];
    config: HeatmapConfig;
    createdAt: Date;
}

@Injectable()
export class HeatmapService {
    private readonly logger = new Logger(HeatmapService.name);

    generateHeatmap(
        points: HeatmapPoint[],
        config: Partial<HeatmapConfig> = {}
    ): HeatmapLayer {
        const defaultConfig: HeatmapConfig = {
            radius: 25,
            blur: 15,
            maxZoom: 18,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red',
            },
        };

        return {
            id: `heatmap-${Date.now()}`,
            name: 'Generated Heatmap',
            points,
            config: { ...defaultConfig, ...config },
            createdAt: new Date(),
        };
    }

    aggregateByGrid(
        points: HeatmapPoint[],
        gridSize: number = 0.01
    ): HeatmapPoint[] {
        const grid = new Map<string, { sum: number; count: number; lat: number; lng: number }>();

        for (const p of points) {
            const key = `${Math.floor(p.lat / gridSize)},${Math.floor(p.lng / gridSize)}`;
            const cell = grid.get(key) || { sum: 0, count: 0, lat: 0, lng: 0 };
            cell.sum += p.value;
            cell.count++;
            cell.lat += p.lat;
            cell.lng += p.lng;
            grid.set(key, cell);
        }

        return Array.from(grid.values()).map(cell => ({
            lat: cell.lat / cell.count,
            lng: cell.lng / cell.count,
            value: cell.sum / cell.count,
        }));
    }

    generateIncidentHeatmap(incidents: Array<{ lat: number; lng: number; severity: number }>): HeatmapLayer {
        const points = incidents.map(i => ({
            lat: i.lat,
            lng: i.lng,
            value: i.severity,
        }));
        return this.generateHeatmap(points);
    }

    generateResourceHeatmap(resources: Array<{ lat: number; lng: number; quantity: number }>): HeatmapLayer {
        const points = resources.map(r => ({
            lat: r.lat,
            lng: r.lng,
            value: r.quantity,
        }));
        return this.generateHeatmap(points, { gradient: { 0.4: 'green', 0.7: 'yellow', 1.0: 'red' } });
    }
}
