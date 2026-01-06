/**
 * QR Scanner Service - QR 快速掃描
 * 短期擴展功能
 */

import { Injectable, Logger } from '@nestjs/common';

export interface QRCodeData {
    type: 'equipment' | 'volunteer' | 'victim' | 'checkpoint' | 'resource' | 'url' | 'unknown';
    id?: string;
    data: Record<string, any>;
    rawContent: string;
}

@Injectable()
export class QrScannerService {
    private readonly logger = new Logger(QrScannerService.name);

    // Known prefixes for entity QR codes
    private readonly prefixes = {
        equipment: 'EQ:',
        volunteer: 'VOL:',
        victim: 'VIC:',
        checkpoint: 'CP:',
        resource: 'RES:',
    };

    /**
     * 解析 QR 碼內容
     */
    parseQRCode(content: string): QRCodeData {
        const trimmed = content.trim();

        // Check for URL
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return this.parseUrl(trimmed);
        }

        // Check for known entity prefixes
        for (const [type, prefix] of Object.entries(this.prefixes)) {
            if (trimmed.startsWith(prefix)) {
                const id = trimmed.substring(prefix.length);
                return {
                    type: type as QRCodeData['type'],
                    id,
                    data: { id },
                    rawContent: content,
                };
            }
        }

        // Try JSON parsing
        try {
            const jsonData = JSON.parse(trimmed);
            return {
                type: jsonData.type || 'unknown',
                id: jsonData.id,
                data: jsonData,
                rawContent: content,
            };
        } catch {
            // Unknown format
            return {
                type: 'unknown',
                data: { content: trimmed },
                rawContent: content,
            };
        }
    }

    /**
     * 解析 URL QR 碼
     */
    private parseUrl(url: string): QRCodeData {
        try {
            const parsed = new URL(url);
            const pathParts = parsed.pathname.split('/').filter(Boolean);

            // Try to extract entity type from path
            // e.g., /equipment/123, /volunteer/456
            if (pathParts.length >= 2) {
                const possibleType = pathParts[0].toLowerCase();
                if (['equipment', 'volunteer', 'victim', 'resource'].includes(possibleType)) {
                    return {
                        type: possibleType as QRCodeData['type'],
                        id: pathParts[1],
                        data: {
                            url,
                            id: pathParts[1],
                            searchParams: Object.fromEntries(parsed.searchParams),
                        },
                        rawContent: url,
                    };
                }
            }

            return {
                type: 'url',
                data: {
                    url,
                    hostname: parsed.hostname,
                    pathname: parsed.pathname,
                    searchParams: Object.fromEntries(parsed.searchParams),
                },
                rawContent: url,
            };
        } catch {
            return {
                type: 'url',
                data: { url },
                rawContent: url,
            };
        }
    }

    /**
     * 生成設備 QR 碼內容
     */
    generateEquipmentQR(equipmentId: string, serialNumber: string): string {
        return `${this.prefixes.equipment}${equipmentId}`;
    }

    /**
     * 生成志工 QR 碼內容
     */
    generateVolunteerQR(volunteerId: string): string {
        return `${this.prefixes.volunteer}${volunteerId}`;
    }

    /**
     * 生成傷患 QR 碼內容
     */
    generateVictimQR(victimId: string): string {
        return `${this.prefixes.victim}${victimId}`;
    }

    /**
     * 生成檢查點 QR 碼內容
     */
    generateCheckpointQR(checkpointId: string, name: string): string {
        return JSON.stringify({
            type: 'checkpoint',
            id: checkpointId,
            name,
            timestamp: new Date().toISOString(),
        });
    }
}
