/**
 * IATI Reporting Service
 * 
 * International Aid Transparency Initiative (IATI) standard reporting
 * @see https://iatistandard.org/
 * 
 * IATI is a global initiative to improve the transparency of 
 * development and humanitarian resources.
 */
import { Injectable, Logger } from '@nestjs/common';

export interface IatiActivity {
    identifier: string;
    title: string;
    description: string;
    status: IatiActivityStatus;
    startDate: Date;
    endDate?: Date;
    sectors: IatiSector[];
    locations: IatiLocation[];
    participatingOrgs: IatiOrganization[];
    transactions: IatiTransaction[];
}

export enum IatiActivityStatus {
    PIPELINE = '1',
    IMPLEMENTATION = '2',
    FINALISATION = '3',
    CLOSED = '4',
    CANCELLED = '5',
    SUSPENDED = '6',
}

export interface IatiSector {
    code: string;
    percentage?: number;
    vocabulary?: string;
}

export interface IatiLocation {
    name: string;
    adminLevel?: number;
    point?: { lat: number; lon: number };
}

export interface IatiOrganization {
    ref: string;
    type: IatiOrgType;
    role: IatiOrgRole;
    name: string;
}

export enum IatiOrgType {
    GOVERNMENT = '10',
    INGO = '21',
    NGO = '22',
    MULTILATERAL = '40',
}

export enum IatiOrgRole {
    FUNDING = '1',
    ACCOUNTABLE = '2',
    EXTENDING = '3',
    IMPLEMENTING = '4',
}

export interface IatiTransaction {
    type: IatiTransactionType;
    date: Date;
    value: number;
    currency: string;
    description?: string;
}

export enum IatiTransactionType {
    INCOMING_COMMITMENT = '11',
    OUTGOING_COMMITMENT = '2',
    DISBURSEMENT = '3',
    EXPENDITURE = '4',
}

@Injectable()
export class IatiReportingService {
    private readonly logger = new Logger(IatiReportingService.name);

    private readonly IATI_VERSION = '2.03';
    private readonly DEFAULT_CURRENCY = 'TWD';

    /**
     * Generate IATI XML for a mission/project
     */
    async generateIatiXml(mission: any): Promise<string> {
        this.logger.log(`Generating IATI XML for mission: ${mission.id}`);

        const activity = this.missionToIatiActivity(mission);
        return this.toIatiXml(activity);
    }

    /**
     * Convert mission to IATI activity format
     */
    private missionToIatiActivity(mission: any): IatiActivity {
        return {
            identifier: `TW-LIGHTKEEPERS-${mission.id}`,
            title: mission.name || mission.title,
            description: mission.description || '',
            status: this.mapStatus(mission.status),
            startDate: new Date(mission.startTime || mission.createdAt),
            endDate: mission.endTime ? new Date(mission.endTime) : undefined,
            sectors: [
                { code: '72010', vocabulary: 'DAC' }, // Emergency food aid
                { code: '73010', vocabulary: 'DAC' }, // Reconstruction relief
            ],
            locations: this.extractLocations(mission),
            participatingOrgs: [
                {
                    ref: 'TW-LIGHTKEEPERS',
                    type: IatiOrgType.NGO,
                    role: IatiOrgRole.IMPLEMENTING,
                    name: 'Light Keepers Disaster Response Platform',
                },
            ],
            transactions: this.extractTransactions(mission),
        };
    }

    private mapStatus(status: string): IatiActivityStatus {
        const mapping: Record<string, IatiActivityStatus> = {
            'planning': IatiActivityStatus.PIPELINE,
            'active': IatiActivityStatus.IMPLEMENTATION,
            'standby': IatiActivityStatus.SUSPENDED,
            'completed': IatiActivityStatus.CLOSED,
            'cancelled': IatiActivityStatus.CANCELLED,
        };
        return mapping[status?.toLowerCase()] || IatiActivityStatus.IMPLEMENTATION;
    }

    private extractLocations(mission: any): IatiLocation[] {
        const locations: IatiLocation[] = [];
        if (mission.location) {
            locations.push({
                name: mission.location.address || mission.location.name || 'Taiwan',
                point: mission.location.latitude && mission.location.longitude
                    ? { lat: mission.location.latitude, lon: mission.location.longitude }
                    : undefined,
            });
        }
        return locations;
    }

    private extractTransactions(mission: any): IatiTransaction[] {
        const transactions: IatiTransaction[] = [];
        if (mission.budget) {
            transactions.push({
                type: IatiTransactionType.OUTGOING_COMMITMENT,
                date: new Date(mission.createdAt),
                value: mission.budget,
                currency: this.DEFAULT_CURRENCY,
                description: 'Mission budget allocation',
            });
        }
        return transactions;
    }

    /**
     * Convert IATI activity to XML format
     */
    private toIatiXml(activity: IatiActivity): string {
        const escape = (str: string) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="${this.IATI_VERSION}" generated-datetime="${new Date().toISOString()}">
  <iati-activity default-currency="${this.DEFAULT_CURRENCY}" last-updated-datetime="${new Date().toISOString()}">
    <iati-identifier>${escape(activity.identifier)}</iati-identifier>
    <title><narrative>${escape(activity.title)}</narrative></title>
    <description><narrative>${escape(activity.description)}</narrative></description>
    <activity-status code="${activity.status}"/>
    <activity-date iso-date="${formatDate(activity.startDate)}" type="1"/>`;

        if (activity.endDate) {
            xml += `\n    <activity-date iso-date="${formatDate(activity.endDate)}" type="3"/>`;
        }

        for (const sector of activity.sectors) {
            xml += `\n    <sector code="${sector.code}" vocabulary="${sector.vocabulary || 'DAC'}"/>`;
        }

        for (const loc of activity.locations) {
            xml += `\n    <location>
      <name><narrative>${escape(loc.name)}</narrative></name>`;
            if (loc.point) {
                xml += `\n      <point><pos>${loc.point.lat} ${loc.point.lon}</pos></point>`;
            }
            xml += `\n    </location>`;
        }

        for (const org of activity.participatingOrgs) {
            xml += `\n    <participating-org ref="${org.ref}" type="${org.type}" role="${org.role}">
      <narrative>${escape(org.name)}</narrative>
    </participating-org>`;
        }

        for (const tx of activity.transactions) {
            xml += `\n    <transaction>
      <transaction-type code="${tx.type}"/>
      <transaction-date iso-date="${formatDate(tx.date)}"/>
      <value currency="${tx.currency}" value-date="${formatDate(tx.date)}">${tx.value}</value>`;
            if (tx.description) {
                xml += `\n      <description><narrative>${escape(tx.description)}</narrative></description>`;
            }
            xml += `\n    </transaction>`;
        }

        xml += `\n  </iati-activity>
</iati-activities>`;

        return xml;
    }

    /**
     * Validate IATI data completeness
     */
    validateIatiCompliance(activity: IatiActivity): { valid: boolean; issues: string[] } {
        const issues: string[] = [];

        if (!activity.identifier) issues.push('Missing IATI identifier');
        if (!activity.title) issues.push('Missing activity title');
        if (!activity.startDate) issues.push('Missing start date');
        if (activity.participatingOrgs.length === 0) issues.push('No participating organizations');
        if (activity.sectors.length === 0) issues.push('No sectors defined');

        return {
            valid: issues.length === 0,
            issues,
        };
    }
}
