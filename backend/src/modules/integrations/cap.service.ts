/**
 * CAP Service
 * Phase 4: Common Alerting Protocol
 * 
 * CAP 1.2 格式支援 (整合 NCDR 警報)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// ============ CAP Types ============

export interface CAPAlert {
    identifier: string;
    sender: string;
    sent: string;
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
    info: CAPInfo[];
}

export interface CAPInfo {
    language?: string;
    category: CAPCategory[];
    event: string;
    responseType?: CAPResponseType[];
    urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
    certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
    audience?: string;
    eventCode?: CAPValuePair[];
    effective?: string;
    onset?: string;
    expires?: string;
    senderName?: string;
    headline?: string;
    description?: string;
    instruction?: string;
    web?: string;
    contact?: string;
    parameter?: CAPValuePair[];
    resource?: CAPResource[];
    area?: CAPArea[];
}

export type CAPCategory = 'Geo' | 'Met' | 'Safety' | 'Security' | 'Rescue' |
    'Fire' | 'Health' | 'Env' | 'Transport' | 'Infra' | 'CBRNE' | 'Other';

export type CAPResponseType = 'Shelter' | 'Evacuate' | 'Prepare' | 'Execute' |
    'Avoid' | 'Monitor' | 'Assess' | 'AllClear' | 'None';

export interface CAPValuePair {
    valueName: string;
    value: string;
}

export interface CAPResource {
    resourceDesc: string;
    mimeType: string;
    size?: number;
    uri?: string;
    derefUri?: string;
    digest?: string;
}

export interface CAPArea {
    areaDesc: string;
    polygon?: string[];
    circle?: string[];
    geocode?: CAPValuePair[];
    altitude?: number;
    ceiling?: number;
}

// ============ Service ============

@Injectable()
export class CapService {
    private readonly logger = new Logger(CapService.name);

    /**
     * 生成 CAP Alert ID
     */
    generateAlertId(senderDomain: string): string {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const random = crypto.randomBytes(4).toString('hex');
        return `${senderDomain}-${timestamp}-${random}`;
    }

    /**
     * 建立內部警報 CAP
     */
    createAlert(
        sender: string,
        event: string,
        options: {
            category: CAPCategory[];
            severity: CAPInfo['severity'];
            urgency: CAPInfo['urgency'];
            description: string;
            instruction?: string;
            headline?: string;
            area?: { name: string; polygon?: string; circle?: string };
            expiresHours?: number;
        }
    ): CAPAlert {
        const now = new Date();
        const expires = new Date(now.getTime() + (options.expiresHours || 24) * 60 * 60 * 1000);

        return {
            identifier: this.generateAlertId(sender),
            sender: `urn:light-keepers:${sender}`,
            sent: now.toISOString(),
            status: 'Actual',
            msgType: 'Alert',
            scope: 'Public',
            info: [{
                language: 'zh-TW',
                category: options.category,
                event,
                urgency: options.urgency,
                severity: options.severity,
                certainty: 'Observed',
                effective: now.toISOString(),
                expires: expires.toISOString(),
                senderName: '光守護者災防平台',
                headline: options.headline || event,
                description: options.description,
                instruction: options.instruction,
                area: options.area ? [{
                    areaDesc: options.area.name,
                    polygon: options.area.polygon ? [options.area.polygon] : undefined,
                    circle: options.area.circle ? [options.area.circle] : undefined,
                }] : undefined,
            }],
        };
    }

    /**
     * 建立 SOS 警報 CAP
     */
    createSOSAlert(
        sender: string,
        sos: {
            location: { lat: number; lng: number };
            description: string;
            reporterName?: string;
        }
    ): CAPAlert {
        return this.createAlert(sender, 'SOS 求救訊號', {
            category: ['Rescue'],
            severity: 'Severe',
            urgency: 'Immediate',
            description: sos.description,
            instruction: '請立即派員前往確認並提供援助',
            headline: sos.reporterName ? `${sos.reporterName} 發出求救` : 'SOS 求救訊號',
            area: {
                name: `${sos.location.lat.toFixed(4)}, ${sos.location.lng.toFixed(4)}`,
                circle: `${sos.location.lat},${sos.location.lng} 0.1`,
            },
            expiresHours: 2,
        });
    }

    /**
     * 建立危險區域警報
     */
    createHazardAlert(
        sender: string,
        hazard: {
            type: string;
            description: string;
            areaName: string;
            polygon?: string;
            severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
        }
    ): CAPAlert {
        return this.createAlert(sender, hazard.type, {
            category: ['Safety', 'Geo'],
            severity: hazard.severity,
            urgency: hazard.severity === 'Extreme' ? 'Immediate' : 'Expected',
            description: hazard.description,
            instruction: '請避開該區域或依指示疏散',
            area: {
                name: hazard.areaName,
                polygon: hazard.polygon,
            },
        });
    }

    /**
     * 轉換為 CAP XML
     */
    toXml(alert: CAPAlert): string {
        const infoXml = alert.info.map(info => `
  <info>
    <language>${info.language || 'zh-TW'}</language>
    ${info.category.map(c => `<category>${c}</category>`).join('\n    ')}
    <event>${this.escapeXml(info.event)}</event>
    <urgency>${info.urgency}</urgency>
    <severity>${info.severity}</severity>
    <certainty>${info.certainty}</certainty>
    ${info.effective ? `<effective>${info.effective}</effective>` : ''}
    ${info.expires ? `<expires>${info.expires}</expires>` : ''}
    ${info.senderName ? `<senderName>${this.escapeXml(info.senderName)}</senderName>` : ''}
    ${info.headline ? `<headline>${this.escapeXml(info.headline)}</headline>` : ''}
    ${info.description ? `<description>${this.escapeXml(info.description)}</description>` : ''}
    ${info.instruction ? `<instruction>${this.escapeXml(info.instruction)}</instruction>` : ''}
    ${info.area?.map(a => `
    <area>
      <areaDesc>${this.escapeXml(a.areaDesc)}</areaDesc>
      ${a.polygon?.map(p => `<polygon>${p}</polygon>`).join('\n      ') || ''}
      ${a.circle?.map(c => `<circle>${c}</circle>`).join('\n      ') || ''}
    </area>`).join('') || ''}
  </info>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alert.identifier}</identifier>
  <sender>${alert.sender}</sender>
  <sent>${alert.sent}</sent>
  <status>${alert.status}</status>
  <msgType>${alert.msgType}</msgType>
  <scope>${alert.scope}</scope>
${infoXml}
</alert>`;
    }

    private escapeXml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
