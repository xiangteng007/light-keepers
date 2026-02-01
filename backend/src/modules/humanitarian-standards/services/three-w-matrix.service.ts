/**
 * 3W Matrix Service
 * 
 * Who-What-Where matrix for humanitarian coordination
 * @see https://www.humanitarianresponse.info/en/coordination/clusters
 * 
 * The 3W provides a snapshot of humanitarian activities, 
 * showing who is doing what and where.
 */
import { Injectable, Logger } from '@nestjs/common';

export interface ThreeWEntry {
    who: {
        organization: string;
        type: 'INGO' | 'NGO' | 'UN' | 'Government' | 'Other';
        cluster?: string;
    };
    what: {
        activity: string;
        sector: string;
        beneficiaries?: number;
        startDate: Date;
        endDate?: Date;
        status: 'Planned' | 'Ongoing' | 'Completed';
    };
    where: {
        country: string;
        admin1: string; // Province/County
        admin2?: string; // District
        admin3?: string; // Township
        coordinates?: { lat: number; lon: number };
    };
}

export interface ThreeWMatrix {
    generatedAt: Date;
    reportingPeriod: { start: Date; end: Date };
    entries: ThreeWEntry[];
    summary: {
        totalOrganizations: number;
        totalActivities: number;
        totalBeneficiaries: number;
        byCluster: Record<string, number>;
        byLocation: Record<string, number>;
    };
}

@Injectable()
export class ThreeWMatrixService {
    private readonly logger = new Logger(ThreeWMatrixService.name);

    /**
     * Generate 3W matrix from mission data
     */
    async generateMatrix(
        missions: any[],
        reportingPeriod: { start: Date; end: Date }
    ): Promise<ThreeWMatrix> {
        this.logger.log(`Generating 3W matrix for ${missions.length} missions`);

        const entries = missions.map(m => this.missionToEntry(m));
        
        return {
            generatedAt: new Date(),
            reportingPeriod,
            entries,
            summary: this.calculateSummary(entries),
        };
    }

    /**
     * Convert mission to 3W entry
     */
    private missionToEntry(mission: any): ThreeWEntry {
        return {
            who: {
                organization: mission.organization?.name || 'Light Keepers',
                type: 'NGO',
                cluster: this.inferCluster(mission),
            },
            what: {
                activity: mission.name || mission.title || 'Disaster Response',
                sector: this.inferSector(mission),
                beneficiaries: mission.beneficiaryCount || 0,
                startDate: new Date(mission.startTime || mission.createdAt),
                endDate: mission.endTime ? new Date(mission.endTime) : undefined,
                status: this.mapStatus(mission.status),
            },
            where: {
                country: 'Taiwan',
                admin1: mission.location?.county || mission.location?.city || '',
                admin2: mission.location?.district || '',
                admin3: mission.location?.township || '',
                coordinates: mission.location?.latitude && mission.location?.longitude
                    ? { lat: mission.location.latitude, lon: mission.location.longitude }
                    : undefined,
            },
        };
    }

    private inferCluster(mission: any): string {
        const type = mission.disasterType?.toLowerCase() || '';
        if (type.includes('flood') || type.includes('water')) return 'WASH';
        if (type.includes('earthquake') || type.includes('building')) return 'Shelter';
        if (type.includes('medical') || type.includes('health')) return 'Health';
        if (type.includes('food')) return 'Food Security';
        return 'Emergency Shelter and NFI';
    }

    private inferSector(mission: any): string {
        const cluster = this.inferCluster(mission);
        const sectorMap: Record<string, string> = {
            'WASH': 'Water, Sanitation, and Hygiene',
            'Shelter': 'Emergency Shelter',
            'Health': 'Health Services',
            'Food Security': 'Food Distribution',
            'Emergency Shelter and NFI': 'Non-Food Items Distribution',
        };
        return sectorMap[cluster] || 'Multi-Sector';
    }

    private mapStatus(status: string): 'Planned' | 'Ongoing' | 'Completed' {
        const s = status?.toLowerCase() || '';
        if (s === 'completed' || s === 'closed') return 'Completed';
        if (s === 'planning' || s === 'pending') return 'Planned';
        return 'Ongoing';
    }

    private calculateSummary(entries: ThreeWEntry[]): ThreeWMatrix['summary'] {
        const organizations = new Set(entries.map(e => e.who.organization));
        const byCluster: Record<string, number> = {};
        const byLocation: Record<string, number> = {};
        let totalBeneficiaries = 0;

        for (const entry of entries) {
            // Count by cluster
            const cluster = entry.who.cluster || 'Other';
            byCluster[cluster] = (byCluster[cluster] || 0) + 1;
            
            // Count by location
            const location = entry.where.admin1 || 'Unknown';
            byLocation[location] = (byLocation[location] || 0) + 1;
            
            // Sum beneficiaries
            totalBeneficiaries += entry.what.beneficiaries || 0;
        }

        return {
            totalOrganizations: organizations.size,
            totalActivities: entries.length,
            totalBeneficiaries,
            byCluster,
            byLocation,
        };
    }

    /**
     * Export 3W matrix to CSV
     */
    exportToCsv(matrix: ThreeWMatrix): string {
        const headers = [
            'Organization', 'Org Type', 'Cluster',
            'Activity', 'Sector', 'Beneficiaries', 'Status',
            'Start Date', 'End Date',
            'Country', 'Admin1', 'Admin2', 'Latitude', 'Longitude'
        ];

        const rows = matrix.entries.map(e => [
            e.who.organization,
            e.who.type,
            e.who.cluster || '',
            e.what.activity,
            e.what.sector,
            e.what.beneficiaries || 0,
            e.what.status,
            e.what.startDate.toISOString().split('T')[0],
            e.what.endDate?.toISOString().split('T')[0] || '',
            e.where.country,
            e.where.admin1,
            e.where.admin2 || '',
            e.where.coordinates?.lat || '',
            e.where.coordinates?.lon || '',
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
}
