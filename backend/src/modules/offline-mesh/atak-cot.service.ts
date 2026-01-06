/**
 * ATAK CoT Service
 * Phase 3.2: ATAK Cursor on Target 整合
 * 
 * CoT (Cursor on Target) 是軍事和緊急應變的位置共享標準
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// ============ CoT Types ============

export interface CoTEvent {
    uid: string;
    type: string;
    time: string;
    start: string;
    stale: string;
    how: string;
    point: CoTPoint;
    detail?: CoTDetail;
}

export interface CoTPoint {
    lat: number;
    lon: number;
    hae?: number;  // Height Above Ellipsoid
    ce?: number;   // Circular Error
    le?: number;   // Linear Error
}

export interface CoTDetail {
    contact?: { callsign: string; endpoint?: string };
    group?: { name: string; role: string };
    status?: { battery?: number };
    track?: { speed?: number; course?: number };
    remarks?: string;
    link?: { uid: string; type: string; relation: string }[];
    usericon?: { iconsetpath: string };
}

// CoT Type Codes (a-f-G = Friendly, Ground)
export const COT_TYPES = {
    FRIENDLY_GROUND_UNIT: 'a-f-G-U-C',      // 友軍地面單位
    FRIENDLY_GROUND_INFANTRY: 'a-f-G-U-C-I', // 友軍步兵
    FRIENDLY_GROUND_VEHICLE: 'a-f-G-E-V',    // 友軍車輛
    FRIENDLY_AIR_DRONE: 'a-f-A-M-F-Q',       // 友軍無人機
    HOSTILE_GROUND: 'a-h-G',                  // 敵方地面
    UNKNOWN_GROUND: 'a-u-G',                  // 未知地面
    EMERGENCY_SOS: 'b-a-o-tbl',               // 緊急 SOS
    WAYPOINT: 'b-m-p-s-m',                    // 航點
    ROUTE: 'b-m-r',                           // 路線
    CASEVAC: 'b-r-f-h-c',                     // 傷患後送
};

// ============ Service ============

@Injectable()
export class AtakCotService {
    private readonly logger = new Logger(AtakCotService.name);

    constructor(private readonly configService: ConfigService) { }

    /**
     * 生成 CoT UID
     */
    generateUid(prefix: string = 'LK'): string {
        const random = crypto.randomBytes(8).toString('hex');
        return `${prefix}-${random}`;
    }

    /**
     * 取得 ISO 時間字串
     */
    private getTimeString(date: Date = new Date()): string {
        return date.toISOString();
    }

    /**
     * 計算 Stale 時間 (預設 5 分鐘後過期)
     */
    private getStaleTime(minutes: number = 5): string {
        const stale = new Date(Date.now() + minutes * 60 * 1000);
        return stale.toISOString();
    }

    // ==================== CoT Event Creation ====================

    /**
     * 建立志工位置 CoT 事件
     */
    createVolunteerCoT(
        uid: string,
        callsign: string,
        position: { lat: number; lon: number; alt?: number },
        options?: {
            team?: string;
            role?: string;
            battery?: number;
            speed?: number;
            course?: number;
        }
    ): CoTEvent {
        const now = new Date();

        return {
            uid,
            type: COT_TYPES.FRIENDLY_GROUND_UNIT,
            time: this.getTimeString(now),
            start: this.getTimeString(now),
            stale: this.getStaleTime(5),
            how: 'h-g-i-g-o', // Human, GPS, Individual, Ground, Other
            point: {
                lat: position.lat,
                lon: position.lon,
                hae: position.alt || 0,
                ce: 10,
                le: 10,
            },
            detail: {
                contact: { callsign },
                group: options?.team ? { name: options.team, role: options.role || 'Team Member' } : undefined,
                status: options?.battery ? { battery: options.battery } : undefined,
                track: (options?.speed || options?.course) ? {
                    speed: options.speed,
                    course: options.course,
                } : undefined,
            },
        };
    }

    /**
     * 建立 SOS 緊急事件
     */
    createSOSCoT(
        uid: string,
        callsign: string,
        position: { lat: number; lon: number },
        message?: string
    ): CoTEvent {
        const now = new Date();

        return {
            uid,
            type: COT_TYPES.EMERGENCY_SOS,
            time: this.getTimeString(now),
            start: this.getTimeString(now),
            stale: this.getStaleTime(60), // SOS 持續 1 小時
            how: 'm-g', // Machine, GPS
            point: {
                lat: position.lat,
                lon: position.lon,
                hae: 0,
                ce: 5,
                le: 5,
            },
            detail: {
                contact: { callsign },
                remarks: message || 'SOS - 需要援助',
            },
        };
    }

    /**
     * 建立傷患後送事件
     */
    createCASEVACCoT(
        uid: string,
        position: { lat: number; lon: number },
        patientInfo: {
            triageLevel: string;
            count: number;
            description?: string;
        }
    ): CoTEvent {
        const now = new Date();

        return {
            uid,
            type: COT_TYPES.CASEVAC,
            time: this.getTimeString(now),
            start: this.getTimeString(now),
            stale: this.getStaleTime(30),
            how: 'm-g',
            point: {
                lat: position.lat,
                lon: position.lon,
                hae: 0,
                ce: 10,
                le: 10,
            },
            detail: {
                remarks: `CASEVAC: ${patientInfo.count} 傷患 (${patientInfo.triageLevel}) - ${patientInfo.description || ''}`,
            },
        };
    }

    /**
     * 建立航點 CoT
     */
    createWaypointCoT(
        uid: string,
        name: string,
        position: { lat: number; lon: number },
        remarks?: string
    ): CoTEvent {
        const now = new Date();

        return {
            uid,
            type: COT_TYPES.WAYPOINT,
            time: this.getTimeString(now),
            start: this.getTimeString(now),
            stale: this.getStaleTime(1440), // 24 小時
            how: 'm-g',
            point: {
                lat: position.lat,
                lon: position.lon,
                hae: 0,
                ce: 1,
                le: 1,
            },
            detail: {
                contact: { callsign: name },
                remarks,
            },
        };
    }

    // ==================== XML Conversion ====================

    /**
     * 轉換為 CoT XML
     */
    toXml(event: CoTEvent): string {
        const detail = event.detail;
        let detailXml = '';

        if (detail) {
            if (detail.contact) {
                detailXml += `<contact callsign="${this.escapeXml(detail.contact.callsign)}"`;
                if (detail.contact.endpoint) detailXml += ` endpoint="${detail.contact.endpoint}"`;
                detailXml += '/>';
            }
            if (detail.group) {
                detailXml += `<__group name="${this.escapeXml(detail.group.name)}" role="${detail.group.role}"/>`;
            }
            if (detail.status?.battery !== undefined) {
                detailXml += `<status battery="${detail.status.battery}"/>`;
            }
            if (detail.track) {
                let trackAttrs = '';
                if (detail.track.speed !== undefined) trackAttrs += ` speed="${detail.track.speed}"`;
                if (detail.track.course !== undefined) trackAttrs += ` course="${detail.track.course}"`;
                detailXml += `<track${trackAttrs}/>`;
            }
            if (detail.remarks) {
                detailXml += `<remarks>${this.escapeXml(detail.remarks)}</remarks>`;
            }
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="${event.uid}" type="${event.type}" time="${event.time}" start="${event.start}" stale="${event.stale}" how="${event.how}">
  <point lat="${event.point.lat}" lon="${event.point.lon}" hae="${event.point.hae || 0}" ce="${event.point.ce || 9999999}" le="${event.point.le || 9999999}"/>
  <detail>${detailXml}</detail>
</event>`;
    }

    /**
     * 解析 CoT XML
     */
    parseXml(xml: string): CoTEvent | null {
        try {
            // Simple regex parsing - use xml2js for production
            const uidMatch = xml.match(/uid="([^"]+)"/);
            const typeMatch = xml.match(/type="([^"]+)"/);
            const latMatch = xml.match(/lat="([^"]+)"/);
            const lonMatch = xml.match(/lon="([^"]+)"/);

            if (!uidMatch || !typeMatch || !latMatch || !lonMatch) {
                return null;
            }

            return {
                uid: uidMatch[1],
                type: typeMatch[1],
                time: new Date().toISOString(),
                start: new Date().toISOString(),
                stale: this.getStaleTime(5),
                how: 'm-g',
                point: {
                    lat: parseFloat(latMatch[1]),
                    lon: parseFloat(lonMatch[1]),
                },
            };
        } catch (error) {
            this.logger.error('Failed to parse CoT XML:', error);
            return null;
        }
    }

    private escapeXml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
