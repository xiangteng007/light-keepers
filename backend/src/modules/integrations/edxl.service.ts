/**
 * EDXL-DE Service
 * Phase 4: 跨單位資料交換
 * 
 * EDXL-DE (Emergency Data Exchange Language - Distribution Element)
 * 災害資訊共享標準格式
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// ============ EDXL Types ============

export interface EDXLDistributionElement {
    distributionID: string;
    senderID: string;
    dateTimeSent: string;
    distributionStatus: 'Actual' | 'Exercise' | 'System' | 'Test';
    distributionType: 'Report' | 'Update' | 'Cancel' | 'Request' | 'Response' | 'Dispatch' | 'Ack';
    combinedConfidentiality: string;
    language: string;
    senderRole?: string[];
    recipientRole?: string[];
    keyword?: EDXLKeyword[];
    targetArea?: EDXLTargetArea[];
    contentObject: EDXLContentObject[];
}

export interface EDXLKeyword {
    valueListUrn: string;
    value: string;
}

export interface EDXLTargetArea {
    circle?: string;
    polygon?: string;
    country?: string;
    subdivision?: string;
    locCodeUN?: string;
}

export interface EDXLContentObject {
    contentDescription?: string;
    contentKeyword?: EDXLKeyword[];
    incidentID?: string;
    incidentDescription?: string;
    confidentiality?: string;
    xmlContent?: { embeddedXMLContent: string };
    nonXMLContent?: {
        mimeType: string;
        size?: number;
        digest?: string;
        uri?: string;
        contentData?: string;
    };
}

// ============ Service ============

@Injectable()
export class EdxlService {
    private readonly logger = new Logger(EdxlService.name);

    /**
     * 生成 EDXL-DE Distribution ID
     */
    generateDistributionId(senderDomain: string): string {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex');
        return `urn:light-keepers:${senderDomain}:${timestamp}-${random}`;
    }

    /**
     * 建立 SITREP 的 EDXL-DE 封裝
     */
    createSITREPDistribution(
        senderId: string,
        sitrep: {
            missionSessionId: string;
            situation: string;
            actions: string;
            needs: string;
            timestamp: string;
        },
        targetArea?: { lat: number; lng: number; radiusKm: number }
    ): EDXLDistributionElement {
        const now = new Date().toISOString();

        return {
            distributionID: this.generateDistributionId(senderId),
            senderID: `urn:light-keepers:${senderId}`,
            dateTimeSent: now,
            distributionStatus: 'Actual',
            distributionType: 'Report',
            combinedConfidentiality: 'UNCLASSIFIED',
            language: 'zh-TW',
            senderRole: ['Disaster_Response_Organization'],
            keyword: [
                { valueListUrn: 'urn:niem:event-type', value: 'SITREP' },
                { valueListUrn: 'urn:light-keepers:mission', value: sitrep.missionSessionId },
            ],
            targetArea: targetArea ? [{
                circle: `${targetArea.lat},${targetArea.lng} ${targetArea.radiusKm}`,
            }] : undefined,
            contentObject: [{
                contentDescription: 'Situation Report',
                incidentID: sitrep.missionSessionId,
                incidentDescription: sitrep.situation,
                xmlContent: {
                    embeddedXMLContent: this.generateSITREPXml(sitrep),
                },
            }],
        };
    }

    /**
     * 建立資源請求的 EDXL-DE
     */
    createResourceRequest(
        senderId: string,
        request: {
            missionSessionId: string;
            resourceType: string;
            quantity: number;
            urgency: 'Immediate' | 'Priority' | 'Routine';
            description: string;
        }
    ): EDXLDistributionElement {
        return {
            distributionID: this.generateDistributionId(senderId),
            senderID: `urn:light-keepers:${senderId}`,
            dateTimeSent: new Date().toISOString(),
            distributionStatus: 'Actual',
            distributionType: 'Request',
            combinedConfidentiality: 'UNCLASSIFIED',
            language: 'zh-TW',
            senderRole: ['Resource_Requester'],
            keyword: [
                { valueListUrn: 'urn:niem:resource-type', value: request.resourceType },
                { valueListUrn: 'urn:niem:urgency', value: request.urgency },
            ],
            contentObject: [{
                contentDescription: `Resource Request: ${request.resourceType}`,
                incidentID: request.missionSessionId,
                nonXMLContent: {
                    mimeType: 'application/json',
                    contentData: Buffer.from(JSON.stringify(request)).toString('base64'),
                },
            }],
        };
    }

    /**
     * 生成 SITREP XML 內容
     */
    private generateSITREPXml(sitrep: {
        situation: string;
        actions: string;
        needs: string;
        timestamp: string;
    }): string {
        return `
<sitrep xmlns="urn:light-keepers:sitrep:1.0">
    <timestamp>${sitrep.timestamp}</timestamp>
    <situation><![CDATA[${sitrep.situation}]]></situation>
    <actions><![CDATA[${sitrep.actions}]]></actions>
    <needs><![CDATA[${sitrep.needs}]]></needs>
</sitrep>`.trim();
    }

    /**
     * 轉換為 XML 字串
     */
    toXml(element: EDXLDistributionElement): string {
        const keywords = element.keyword?.map(k =>
            `    <keyword>
      <valueListUrn>${k.valueListUrn}</valueListUrn>
      <value>${k.value}</value>
    </keyword>`
        ).join('\n') || '';

        const targetAreas = element.targetArea?.map(t =>
            t.circle ? `    <targetArea><circle>${t.circle}</circle></targetArea>` : ''
        ).join('\n') || '';

        const contents = element.contentObject.map(c => `
    <contentObject>
      <contentDescription>${c.contentDescription || ''}</contentDescription>
      ${c.incidentID ? `<incidentID>${c.incidentID}</incidentID>` : ''}
      ${c.xmlContent ? `<xmlContent><embeddedXMLContent>${c.xmlContent.embeddedXMLContent}</embeddedXMLContent></xmlContent>` : ''}
    </contentObject>`
        ).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<EDXLDistribution xmlns="urn:oasis:names:tc:emergency:EDXL:DE:1.0">
  <distributionID>${element.distributionID}</distributionID>
  <senderID>${element.senderID}</senderID>
  <dateTimeSent>${element.dateTimeSent}</dateTimeSent>
  <distributionStatus>${element.distributionStatus}</distributionStatus>
  <distributionType>${element.distributionType}</distributionType>
  <combinedConfidentiality>${element.combinedConfidentiality}</combinedConfidentiality>
  <language>${element.language}</language>
${keywords}
${targetAreas}
${contents}
</EDXLDistribution>`;
    }
}
