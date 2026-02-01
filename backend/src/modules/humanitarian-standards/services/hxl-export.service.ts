/**
 * HXL Export Service
 * 
 * Humanitarian Exchange Language (HXL) standard data export
 * @see https://hxlstandard.org/
 * 
 * HXL is a simple standard for messy data that uses hashtags 
 * to add semantics to data in CSV or JSON format.
 */
import { Injectable, Logger } from '@nestjs/common';

export interface HxlColumn {
    header: string;
    hxlTag: string;
    attributes?: string[];
}

export interface HxlExportOptions {
    format: 'csv' | 'json';
    includeHeaders: boolean;
    dateFormat?: string;
}

export interface HxlDataset {
    name: string;
    columns: HxlColumn[];
    rows: Record<string, any>[];
    metadata: {
        organization: string;
        created: Date;
        source: string;
    };
}

@Injectable()
export class HxlExportService {
    private readonly logger = new Logger(HxlExportService.name);

    /**
     * Standard HXL tags for disaster response data
     */
    private readonly HXL_TAGS = {
        // Location
        country: '#country+name',
        region: '#adm1+name',
        district: '#adm2+name',
        latitude: '#geo+lat',
        longitude: '#geo+lon',
        
        // Organization
        org: '#org+name',
        sector: '#sector+name',
        cluster: '#sector+cluster',
        
        // Population
        affected: '#affected+num',
        displaced: '#population+displaced',
        injured: '#affected+injured',
        deceased: '#affected+deceased',
        
        // Response
        activity: '#activity+name',
        beneficiaries: '#beneficiary+num',
        date: '#date+occurred',
        status: '#status+name',
        
        // Resources
        item: '#item+name',
        quantity: '#item+num',
        unit: '#item+unit',
        value: '#value+usd',
    };

    /**
     * Export disaster reports in HXL format
     */
    async exportDisasterReports(
        reports: any[],
        options: HxlExportOptions = { format: 'csv', includeHeaders: true }
    ): Promise<string> {
        this.logger.log(`Exporting ${reports.length} reports in HXL format`);

        const columns: HxlColumn[] = [
            { header: 'Report ID', hxlTag: '#report+id' },
            { header: 'Date', hxlTag: this.HXL_TAGS.date },
            { header: 'Country', hxlTag: this.HXL_TAGS.country },
            { header: 'Region', hxlTag: this.HXL_TAGS.region },
            { header: 'Latitude', hxlTag: this.HXL_TAGS.latitude },
            { header: 'Longitude', hxlTag: this.HXL_TAGS.longitude },
            { header: 'Affected', hxlTag: this.HXL_TAGS.affected },
            { header: 'Status', hxlTag: this.HXL_TAGS.status },
            { header: 'Organization', hxlTag: this.HXL_TAGS.org },
        ];

        const rows = reports.map(report => ({
            'Report ID': report.id,
            'Date': report.createdAt,
            'Country': 'Taiwan',
            'Region': report.location?.address || '',
            'Latitude': report.location?.latitude || '',
            'Longitude': report.location?.longitude || '',
            'Affected': report.affectedCount || 0,
            'Status': report.status,
            'Organization': report.organization?.name || 'Light Keepers',
        }));

        if (options.format === 'csv') {
            return this.toHxlCsv(columns, rows, options.includeHeaders);
        }
        
        return JSON.stringify({ columns, rows }, null, 2);
    }

    /**
     * Export resource distribution data in HXL format
     */
    async exportResourceDistribution(
        distributions: any[],
        options: HxlExportOptions = { format: 'csv', includeHeaders: true }
    ): Promise<string> {
        const columns: HxlColumn[] = [
            { header: 'Date', hxlTag: this.HXL_TAGS.date },
            { header: 'Item', hxlTag: this.HXL_TAGS.item },
            { header: 'Quantity', hxlTag: this.HXL_TAGS.quantity },
            { header: 'Unit', hxlTag: this.HXL_TAGS.unit },
            { header: 'Beneficiaries', hxlTag: this.HXL_TAGS.beneficiaries },
            { header: 'Location', hxlTag: this.HXL_TAGS.district },
            { header: 'Organization', hxlTag: this.HXL_TAGS.org },
        ];

        const rows = distributions.map(d => ({
            'Date': d.date,
            'Item': d.item?.name || d.itemName,
            'Quantity': d.quantity,
            'Unit': d.unit || 'pcs',
            'Beneficiaries': d.beneficiaryCount || 0,
            'Location': d.location?.name || '',
            'Organization': d.organization?.name || 'Light Keepers',
        }));

        if (options.format === 'csv') {
            return this.toHxlCsv(columns, rows, options.includeHeaders);
        }
        
        return JSON.stringify({ columns, rows }, null, 2);
    }

    /**
     * Convert data to HXL-compliant CSV format
     */
    private toHxlCsv(
        columns: HxlColumn[],
        rows: Record<string, any>[],
        includeHeaders: boolean
    ): string {
        const lines: string[] = [];
        
        // Header row
        if (includeHeaders) {
            lines.push(columns.map(c => this.escapeCsv(c.header)).join(','));
        }
        
        // HXL tag row
        lines.push(columns.map(c => c.hxlTag).join(','));
        
        // Data rows
        for (const row of rows) {
            const values = columns.map(c => {
                const value = row[c.header];
                return this.escapeCsv(value);
            });
            lines.push(values.join(','));
        }
        
        return lines.join('\n');
    }

    private escapeCsv(value: any): string {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    /**
     * Get available HXL tags for reference
     */
    getHxlTags(): Record<string, string> {
        return { ...this.HXL_TAGS };
    }
}
