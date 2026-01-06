import { Injectable, Logger } from '@nestjs/common';

/**
 * D3 Chart Service
 * Custom chart data generation
 */
@Injectable()
export class D3ChartService {
    private readonly logger = new Logger(D3ChartService.name);

    /**
     * 產生折線圖資料
     */
    generateLineChart(data: DataPoint[], options?: ChartOptions): LineChartData {
        const sorted = [...data].sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

        return {
            type: 'line',
            data: sorted,
            xAxis: { label: options?.xLabel || 'Time', type: 'time' },
            yAxis: { label: options?.yLabel || 'Value', domain: this.calcDomain(sorted.map((d) => d.y)) },
            style: { strokeColor: options?.color || '#0088FF', strokeWidth: 2 },
        };
    }

    /**
     * 產生柱狀圖資料
     */
    generateBarChart(data: CategoryData[], options?: ChartOptions): BarChartData {
        return {
            type: 'bar',
            data: data.map((d) => ({ ...d, color: d.color || options?.color || '#4CAF50' })),
            xAxis: { label: options?.xLabel || 'Category' },
            yAxis: { label: options?.yLabel || 'Count', domain: this.calcDomain(data.map((d) => d.value)) },
            orientation: options?.horizontal ? 'horizontal' : 'vertical',
        };
    }

    /**
     * 產生圓餅圖資料
     */
    generatePieChart(data: CategoryData[]): PieChartData {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

        return {
            type: 'pie',
            data: data.map((d, i) => ({
                ...d,
                percentage: ((d.value / total) * 100).toFixed(1),
                color: d.color || colors[i % colors.length],
            })),
            total,
        };
    }

    /**
     * 產生堆疊區域圖資料
     */
    generateStackedArea(series: { name: string; data: DataPoint[] }[]): StackedAreaData {
        const allX = [...new Set(series.flatMap((s) => s.data.map((d) => d.x)))].sort();

        return {
            type: 'stacked-area',
            xValues: allX,
            series: series.map((s, i) => ({
                name: s.name,
                values: allX.map((x) => s.data.find((d) => d.x === x)?.y || 0),
                color: this.getSeriesColor(i),
            })),
        };
    }

    /**
     * 產生雷達圖資料
     */
    generateRadarChart(data: { dimension: string; value: number }[], maxValue?: number): RadarChartData {
        const max = maxValue || Math.max(...data.map((d) => d.value));

        return {
            type: 'radar',
            dimensions: data.map((d) => d.dimension),
            values: data.map((d) => d.value / max),
            maxValue: max,
        };
    }

    /**
     * 產生樹狀圖資料
     */
    generateTreemap(data: TreeNode[]): TreemapData {
        const total = data.reduce((sum, d) => sum + d.value, 0);

        return {
            type: 'treemap',
            nodes: data.map((d) => ({
                ...d,
                percentage: ((d.value / total) * 100).toFixed(1),
                color: d.color || this.valueToColor(d.value, total),
            })),
            total,
        };
    }

    /**
     * 產生散佈圖資料
     */
    generateScatterPlot(data: ScatterPoint[]): ScatterPlotData {
        return {
            type: 'scatter',
            data,
            xDomain: this.calcDomain(data.map((d) => d.x)),
            yDomain: this.calcDomain(data.map((d) => d.y)),
        };
    }

    private calcDomain(values: number[]): [number, number] {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1;
        return [Math.max(0, min - padding), max + padding];
    }

    private getSeriesColor(index: number): string {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        return colors[index % colors.length];
    }

    private valueToColor(value: number, total: number): string {
        const ratio = value / total;
        if (ratio > 0.3) return '#FF6384';
        if (ratio > 0.15) return '#FFCE56';
        return '#4BC0C0';
    }
}

// Types
interface DataPoint { x: string; y: number; }
interface CategoryData { label: string; value: number; color?: string; }
interface ChartOptions { xLabel?: string; yLabel?: string; color?: string; horizontal?: boolean; }
interface LineChartData { type: string; data: DataPoint[]; xAxis: any; yAxis: any; style: any; }
interface BarChartData { type: string; data: any[]; xAxis: any; yAxis: any; orientation: string; }
interface PieChartData { type: string; data: any[]; total: number; }
interface StackedAreaData { type: string; xValues: string[]; series: any[]; }
interface RadarChartData { type: string; dimensions: string[]; values: number[]; maxValue: number; }
interface TreeNode { name: string; value: number; color?: string; }
interface TreemapData { type: string; nodes: any[]; total: number; }
interface ScatterPoint { x: number; y: number; label?: string; size?: number; }
interface ScatterPlotData { type: string; data: ScatterPoint[]; xDomain: [number, number]; yDomain: [number, number]; }
