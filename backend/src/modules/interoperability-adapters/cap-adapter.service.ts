/**
 * CAP (Common Alerting Protocol) 1.2 Adapter Service
 * 
 * OASIS Standard for emergency alerts
 * @see https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html
 * 
 * Taiwan CAP integration:
 * - 中央氣象局 CWA alerts
 * - 國家災害防救科技中心 NCDR alerts
 * - 內政部消防署 NFA alerts
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * CAP 1.2 Alert Message Structure
 */
export interface CapAlert {
    identifier: string;
    sender: string;
    sent: string;  // xs:dateTime
    status: 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft';
    msgType: 'Alert' | 'Update' | 'Cancel' | 'Ack' | 'Error';
    source?: string;
    scope: 'Public' | 'Restricted' | 'Private';
    restriction?: string;
    addresses?: string;
    code?: string[];
    note?: string;
    references?: string;
    incidents?: string;
    info?: CapInfo[];
}

export interface CapInfo {
    language?: string;
    category: CapCategory[];
    event: string;
    responseType?: CapResponseType[];
    urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
    certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
    audience?: string;
    eventCode?: { valueName: string; value: string }[];
    effective?: string;
    onset?: string;
    expires?: string;
    senderName?: string;
    headline?: string;
    description?: string;
    instruction?: string;
    web?: string;
    contact?: string;
    parameter?: { valueName: string; value: string }[];
    resource?: CapResource[];
    area?: CapArea[];
}

export type CapCategory = 
    | 'Geo' | 'Met' | 'Safety' | 'Security' | 'Rescue'
    | 'Fire' | 'Health' | 'Env' | 'Transport' | 'Infra'
    | 'CBRNE' | 'Other';

export type CapResponseType = 
    | 'Shelter' | 'Evacuate' | 'Prepare' | 'Execute'
    | 'Avoid' | 'Monitor' | 'Assess' | 'AllClear' | 'None';

export interface CapResource {
    resourceDesc: string;
    mimeType?: string;
    size?: number;
    uri?: string;
    derefUri?: string;
    digest?: string;
}

export interface CapArea {
    areaDesc: string;
    polygon?: string[];
    circle?: string[];
    geocode?: { valueName: string; value: string }[];
    altitude?: number;
    ceiling?: number;
}

@Injectable()
export class CapAdapterService {
    private readonly logger = new Logger(CapAdapterService.name);

    /**
     * Convert internal alert to CAP 1.2 format
     */
    toCapAlert(alert: {
        id: string;
        title: string;
        description: string;
        severity: string;
        category: string;
        location?: string;
        startTime?: Date;
        endTime?: Date;
        source?: string;
        instruction?: string;
    }): CapAlert {
        const now = new Date().toISOString();

        return {
            identifier: `LK-${alert.id}`,
            sender: 'light-keepers@disaster-respond.tw',
            sent: now,
            status: 'Actual',
            msgType: 'Alert',
            source: alert.source || 'Light Keepers Platform',
            scope: 'Public',
            info: [{
                language: 'zh-TW',
                category: [this.mapCategory(alert.category)],
                event: alert.title,
                urgency: this.mapSeverityToUrgency(alert.severity),
                severity: this.mapSeverity(alert.severity),
                certainty: 'Observed',
                headline: alert.title,
                description: alert.description,
                instruction: alert.instruction,
                onset: alert.startTime?.toISOString(),
                expires: alert.endTime?.toISOString(),
                area: alert.location ? [{
                    areaDesc: alert.location,
                }] : undefined,
            }],
        };
    }

    /**
     * Parse CAP 1.2 XML to internal format
     */
    fromCapXml(xml: string): any {
        // Basic XML parsing - in production use xml2js or fast-xml-parser
        const alertMatch = xml.match(/<alert[^>]*>([\s\S]*)<\/alert>/);
        if (!alertMatch) {
            throw new Error('Invalid CAP XML format');
        }

        const identifier = this.extractXmlValue(xml, 'identifier');
        const sender = this.extractXmlValue(xml, 'sender');
        const headline = this.extractXmlValue(xml, 'headline');
        const description = this.extractXmlValue(xml, 'description');
        const severity = this.extractXmlValue(xml, 'severity');

        return {
            id: identifier,
            source: sender,
            title: headline,
            description,
            severity: severity?.toLowerCase(),
            rawXml: xml,
        };
    }

    /**
     * Generate CAP 1.2 XML from CapAlert
     */
    toCapXml(alert: CapAlert): string {
        const info = alert.info?.[0];
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
    <identifier>${this.escapeXml(alert.identifier)}</identifier>
    <sender>${this.escapeXml(alert.sender)}</sender>
    <sent>${alert.sent}</sent>
    <status>${alert.status}</status>
    <msgType>${alert.msgType}</msgType>
    <scope>${alert.scope}</scope>
    ${info ? `<info>
        <language>${info.language || 'zh-TW'}</language>
        <category>${info.category?.join('</category><category>') || 'Other'}</category>
        <event>${this.escapeXml(info.event)}</event>
        <urgency>${info.urgency}</urgency>
        <severity>${info.severity}</severity>
        <certainty>${info.certainty}</certainty>
        ${info.headline ? `<headline>${this.escapeXml(info.headline)}</headline>` : ''}
        ${info.description ? `<description>${this.escapeXml(info.description)}</description>` : ''}
        ${info.instruction ? `<instruction>${this.escapeXml(info.instruction)}</instruction>` : ''}
        ${info.onset ? `<onset>${info.onset}</onset>` : ''}
        ${info.expires ? `<expires>${info.expires}</expires>` : ''}
        ${info.area?.map(a => `<area>
            <areaDesc>${this.escapeXml(a.areaDesc)}</areaDesc>
        </area>`).join('') || ''}
    </info>` : ''}
</alert>`;
    }

    private mapCategory(category: string): CapCategory {
        const mapping: Record<string, CapCategory> = {
            'earthquake': 'Geo',
            'typhoon': 'Met',
            'flood': 'Met',
            'tsunami': 'Geo',
            'fire': 'Fire',
            'rescue': 'Rescue',
            'health': 'Health',
            'hazmat': 'Env',
            'traffic': 'Transport',
        };
        return mapping[category?.toLowerCase()] || 'Other';
    }

    private mapSeverity(severity: string): CapInfo['severity'] {
        const mapping: Record<string, CapInfo['severity']> = {
            'critical': 'Extreme',
            'high': 'Severe',
            'medium': 'Moderate',
            'low': 'Minor',
        };
        return mapping[severity?.toLowerCase()] || 'Unknown';
    }

    private mapSeverityToUrgency(severity: string): CapInfo['urgency'] {
        const mapping: Record<string, CapInfo['urgency']> = {
            'critical': 'Immediate',
            'high': 'Expected',
            'medium': 'Future',
            'low': 'Future',
        };
        return mapping[severity?.toLowerCase()] || 'Unknown';
    }

    private extractXmlValue(xml: string, tag: string): string | undefined {
        const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
        return match?.[1];
    }

    private escapeXml(text: string): string {
        return text
            ?.replace(/&/g, '&amp;')
            ?.replace(/</g, '&lt;')
            ?.replace(/>/g, '&gt;')
            ?.replace(/"/g, '&quot;')
            ?.replace(/'/g, '&apos;') || '';
    }
}
