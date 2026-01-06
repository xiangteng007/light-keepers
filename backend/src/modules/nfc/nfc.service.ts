/**
 * NFC Service - NFC 手環整合
 * 短期擴展功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============ Types ============

export interface NfcTag {
    uid: string;
    type: 'victim' | 'equipment' | 'volunteer' | 'checkpoint';
    linkedId?: string; // Associated entity ID
    data?: Record<string, any>;
    lastScanned?: Date;
}

export interface NfcScan {
    tagUid: string;
    scannerId: string;
    scannerName?: string;
    location?: { lat: number; lng: number };
    timestamp: Date;
    associatedEntity?: {
        type: string;
        id: string;
        name?: string;
    };
}

// ============ Service ============

@Injectable()
export class NfcService {
    private readonly logger = new Logger(NfcService.name);

    // In-memory tag registry
    private tags: Map<string, NfcTag> = new Map();
    private scans: NfcScan[] = [];

    constructor(private readonly eventEmitter: EventEmitter2) { }

    // ==================== Tag Management ====================

    /**
     * 註冊 NFC 標籤
     */
    registerTag(uid: string, type: NfcTag['type'], linkedId?: string, data?: Record<string, any>): NfcTag {
        const tag: NfcTag = {
            uid,
            type,
            linkedId,
            data,
        };
        this.tags.set(uid, tag);
        this.logger.log(`NFC tag registered: ${uid} (${type})`);
        return tag;
    }

    /**
     * 取得標籤資訊
     */
    getTag(uid: string): NfcTag | undefined {
        return this.tags.get(uid);
    }

    /**
     * 更新標籤連結
     */
    linkTag(uid: string, linkedId: string): boolean {
        const tag = this.tags.get(uid);
        if (!tag) return false;
        tag.linkedId = linkedId;
        return true;
    }

    /**
     * 解除標籤連結
     */
    unlinkTag(uid: string): boolean {
        const tag = this.tags.get(uid);
        if (!tag) return false;
        tag.linkedId = undefined;
        return true;
    }

    // ==================== Scanning ====================

    /**
     * 處理掃描事件
     */
    processScan(
        tagUid: string,
        scannerId: string,
        scannerName?: string,
        location?: { lat: number; lng: number }
    ): NfcScan {
        const tag = this.tags.get(tagUid);

        const scan: NfcScan = {
            tagUid,
            scannerId,
            scannerName,
            location,
            timestamp: new Date(),
        };

        if (tag) {
            tag.lastScanned = scan.timestamp;
            scan.associatedEntity = {
                type: tag.type,
                id: tag.linkedId || tagUid,
                name: tag.data?.name,
            };
        }

        this.scans.push(scan);
        if (this.scans.length > 10000) {
            this.scans = this.scans.slice(-5000);
        }

        this.logger.log(`NFC scan: ${tagUid} by ${scannerName || scannerId}`);
        this.eventEmitter.emit('nfc.scan', scan);

        return scan;
    }

    /**
     * 生成用於傷患手環的唯一 ID
     */
    generateVictimBraceletId(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `VB-${timestamp}-${random}`;
    }

    // ==================== Query ====================

    /**
     * 取得掃描記錄
     */
    getScans(options?: {
        tagUid?: string;
        scannerId?: string;
        type?: NfcTag['type'];
        limit?: number;
    }): NfcScan[] {
        let filtered = this.scans;

        if (options?.tagUid) {
            filtered = filtered.filter(s => s.tagUid === options.tagUid);
        }
        if (options?.scannerId) {
            filtered = filtered.filter(s => s.scannerId === options.scannerId);
        }
        if (options?.type) {
            filtered = filtered.filter(s => s.associatedEntity?.type === options.type);
        }

        return filtered.slice(-(options?.limit || 100));
    }

    /**
     * 取得所有已註冊標籤
     */
    getAllTags(type?: NfcTag['type']): NfcTag[] {
        const all = Array.from(this.tags.values());
        if (type) {
            return all.filter(t => t.type === type);
        }
        return all;
    }
}
