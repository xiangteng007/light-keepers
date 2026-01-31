import { Injectable, Logger } from '@nestjs/common';

export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'radar';

export interface ChartDataset {
    label: string;
    data: number[];
    color?: string;
    backgroundColor?: string;
}

export interface ChartConfig {
    type: ChartType;
    title: string;
    labels: string[];
    datasets: ChartDataset[];
    options?: {
        responsive?: boolean;
        stacked?: boolean;
        showLegend?: boolean;
        animated?: boolean;
    };
}

export interface ChartExport {
    svg?: string;
    png?: string;
    csv?: string;
}

@Injectable()
export class ChartService {
    private readonly logger = new Logger(ChartService.name);

    buildLineChart(title: string, labels: string[], datasets: ChartDataset[]): ChartConfig {
        return { type: 'line', title, labels, datasets, options: { responsive: true, animated: true } };
    }

    buildBarChart(title: string, labels: string[], datasets: ChartDataset[]): ChartConfig {
        return { type: 'bar', title, labels, datasets, options: { responsive: true } };
    }

    buildPieChart(title: string, labels: string[], data: number[], colors?: string[]): ChartConfig {
        return {
            type: 'pie',
            title,
            labels,
            datasets: [{
                label: title,
                data,
                backgroundColor: colors || this.generateColors(data.length),
            }],
        };
    }

    buildAreaChart(title: string, labels: string[], datasets: ChartDataset[]): ChartConfig {
        return { type: 'area', title, labels, datasets };
    }

    buildRadarChart(title: string, labels: string[], datasets: ChartDataset[]): ChartConfig {
        return { type: 'radar', title, labels, datasets };
    }

    // Time series helper
    buildTimeSeriesChart(
        title: string,
        data: Array<{ timestamp: Date; value: number; series?: string }>
    ): ChartConfig {
        const seriesMap = new Map<string, Map<string, number>>();
        const allDates = new Set<string>();

        for (const d of data) {
            const dateKey = d.timestamp.toISOString().split('T')[0];
            const series = d.series || 'default';
            allDates.add(dateKey);
            
            if (!seriesMap.has(series)) {
                seriesMap.set(series, new Map());
            }
            seriesMap.get(series)!.set(dateKey, d.value);
        }

        const labels = Array.from(allDates).sort();
        const datasets: ChartDataset[] = [];

        for (const [series, values] of seriesMap) {
            datasets.push({
                label: series,
                data: labels.map(l => values.get(l) || 0),
                color: this.generateColors(1)[0],
            });
        }

        return this.buildLineChart(title, labels, datasets);
    }

    exportToCsv(config: ChartConfig): string {
        const header = ['Label', ...config.datasets.map(d => d.label)].join(',');
        const rows = config.labels.map((label, i) => {
            return [label, ...config.datasets.map(d => d.data[i])].join(',');
        });
        return [header, ...rows].join('\n');
    }

    private generateColors(count: number): string[] {
        const palette = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#e67e22', '#34495e', '#16a085', '#d35400',
        ];
        return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
    }
}
