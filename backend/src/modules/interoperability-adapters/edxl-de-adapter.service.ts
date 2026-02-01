/**
 * EDXL-DE (Emergency Data Exchange Language - Distribution Element) 2.0 Adapter
 * 
 * OASIS Standard for emergency message routing and distribution
 * @see https://docs.oasis-open.org/emergency/edxl-de/v2.0/edxl-de-v2.0.html
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * EDXL-DE 2.0 Distribution Element
 */
export interface EdxlDistribution {
    distributionID: string;
    senderID: string;
    dateTimeSent: string;
    distributionStatus: 'Actual' | 'Exercise' | 'System' | 'Test';
    distributionType: 'Report' | 'Update' | 'Cancel' | 'Request' | 'Response' | 'Dispatch' | 'Ack' | 'Error';
    combinedConfidentiality: string;
    language?: string;
    senderRole?: EdxlValueList[];
    recipientRole?: EdxlValueList[];
    explicitAddress?: EdxlExplicitAddress[];
    targetArea?: EdxlTargetArea[];
    contentObject?: EdxlContentObject[];
    keyword?: EdxlValueList[];
    distributionReference?: string[];
}

export interface EdxlValueList {
    valueListUrn: string;
    value: string[];
}

export interface EdxlExplicitAddress {
    explicitAddressScheme: string;
    explicitAddressValue: string[];
}

export interface EdxlTargetArea {
    circle?: string[];
    polygon?: string[];
    country?: string[];
    subdivision?: string[];
    locCodeUN?: string[];
}

export interface EdxlContentObject {
    contentDescription?: string;
    contentKeyword?: EdxlValueList[];
    incidentID?: string;
    incidentDescription?: string;
    originatorRole?: EdxlValueList[];
    consumerRole?: EdxlValueList[];
    confidentiality?: string;
    nonXMLContent?: {
        mimeType: string;
        size?: number;
        digest?: string;
        uri?: string;
        contentData?: string;
    };
    xmlContent?: {
        keyXmlContent?: any[];
        embeddedXmlContent?: any[];
    };
}

@Injectable()
export class EdxlDeAdapterService {
    private readonly logger = new Logger(EdxlDeAdapterService.name);

    /**
     * Create EDXL-DE distribution envelope for any content
     */
    createDistribution(content: {
        sender: string;
        type: 'Report' | 'Update' | 'Cancel' | 'Request' | 'Response' | 'Dispatch';
        payload: any;
        recipients?: string[];
        targetAreas?: string[];
        keywords?: string[];
        incidentId?: string;
    }): EdxlDistribution {
        const id = `EDXL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        return {
            distributionID: id,
            senderID: content.sender,
            dateTimeSent: new Date().toISOString(),
            distributionStatus: 'Actual',
            distributionType: content.type,
            combinedConfidentiality: 'UNCLASSIFIED',
            language: 'zh-TW',
            senderRole: [{
                valueListUrn: 'urn:oasis:names:tc:emergency:edxl:de:2.0:senderRole',
                value: ['Emergency Manager'],
            }],
            explicitAddress: content.recipients?.map(r => ({
                explicitAddressScheme: 'urn:oasis:names:tc:emergency:edxl:de:2.0:address:email',
                explicitAddressValue: [r],
            })),
            targetArea: content.targetAreas ? [{
                subdivision: content.targetAreas,
            }] : undefined,
            keyword: content.keywords ? [{
                valueListUrn: 'urn:oasis:names:tc:emergency:edxl:de:2.0:keyword',
                value: content.keywords,
            }] : undefined,
            contentObject: [{
                contentDescription: 'Emergency Message Payload',
                incidentID: content.incidentId,
                nonXMLContent: {
                    mimeType: 'application/json',
                    contentData: Buffer.from(JSON.stringify(content.payload)).toString('base64'),
                },
            }],
        };
    }

    /**
     * Extract payload from EDXL-DE distribution
     */
    extractPayload(distribution: EdxlDistribution): any {
        const content = distribution.contentObject?.[0];
        if (!content) return null;

        if (content.nonXMLContent?.contentData) {
            const decoded = Buffer.from(content.nonXMLContent.contentData, 'base64').toString('utf-8');
            try {
                return JSON.parse(decoded);
            } catch {
                return decoded;
            }
        }

        return content.xmlContent;
    }

    /**
     * Validate EDXL-DE distribution
     */
    validate(distribution: EdxlDistribution): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!distribution.distributionID) errors.push('distributionID is required');
        if (!distribution.senderID) errors.push('senderID is required');
        if (!distribution.dateTimeSent) errors.push('dateTimeSent is required');
        if (!distribution.distributionStatus) errors.push('distributionStatus is required');
        if (!distribution.distributionType) errors.push('distributionType is required');
        if (!distribution.combinedConfidentiality) errors.push('combinedConfidentiality is required');

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Generate EDXL-DE 2.0 XML
     */
    toXml(distribution: EdxlDistribution): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<EDXLDistribution xmlns="urn:oasis:names:tc:emergency:EDXL:DE:2.0">
    <distributionID>${distribution.distributionID}</distributionID>
    <senderID>${distribution.senderID}</senderID>
    <dateTimeSent>${distribution.dateTimeSent}</dateTimeSent>
    <distributionStatus>${distribution.distributionStatus}</distributionStatus>
    <distributionType>${distribution.distributionType}</distributionType>
    <combinedConfidentiality>${distribution.combinedConfidentiality}</combinedConfidentiality>
    ${distribution.language ? `<language>${distribution.language}</language>` : ''}
    ${distribution.contentObject?.map(co => `
    <contentObject>
        ${co.contentDescription ? `<contentDescription>${co.contentDescription}</contentDescription>` : ''}
        ${co.incidentID ? `<incidentID>${co.incidentID}</incidentID>` : ''}
        ${co.nonXMLContent ? `
        <nonXMLContent>
            <mimeType>${co.nonXMLContent.mimeType}</mimeType>
            ${co.nonXMLContent.contentData ? `<contentData>${co.nonXMLContent.contentData}</contentData>` : ''}
        </nonXMLContent>` : ''}
    </contentObject>`).join('') || ''}
</EDXLDistribution>`;
    }

    /**
     * Create CAP embedded EDXL-DE distribution
     */
    wrapCapAlert(capXml: string, sender: string, incidentId?: string): EdxlDistribution {
        return this.createDistribution({
            sender,
            type: 'Report',
            payload: { capAlert: Buffer.from(capXml).toString('base64') },
            incidentId,
            keywords: ['CAP', 'Alert'],
        });
    }
}
