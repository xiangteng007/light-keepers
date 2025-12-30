import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * QR Code 產生與驗證服務
 * 格式：ORG|TYPE|ID|CHECKSUM
 */
@Injectable()
export class QrCodeService {
    private readonly orgCode: string = 'ORG01'; // TODO: 從 system_settings 讀取

    /**
     * 產生 QR Code 值
     * @param type - 類型（LOT/ASSET/BIN）
     * @param id - 目標 ID
     * @returns QR Code 字串
     */
    generateQrValue(type: 'LOT' | 'ASSET' | 'BIN', id: string): string {
        const checksum = this.computeChecksum(this.orgCode, type, id);
        return `${this.orgCode}|${type}|${id}|${checksum}`;
    }

    /**
     * 驗證 QR Code
     * @param qrValue - QR Code 字串
     * @returns 驗證結果與解析資料
     */
    verifyQrValue(qrValue: string): {
        valid: boolean;
        orgCode?: string;
        type?: string;
        id?: string;
        error?: string;
    } {
        try {
            const parts = qrValue.split('|');

            // 檢查格式
            if (parts.length !== 4) {
                return { valid: false, error: '無效的 QR Code 格式' };
            }

            const [orgCode, type, id, checksum] = parts;

            // 檢查 orgCode
            if (orgCode !== this.orgCode) {
                return { valid: false, error: 'QR Code 不屬於本系統' };
            }

            // 檢查 type
            if (!['LOT', 'ASSET', 'BIN'].includes(type)) {
                return { valid: false, error: '無效的 QR Code 類型' };
            }

            // 驗證 checksum
            const expectedChecksum = this.computeChecksum(orgCode, type, id);
            if (checksum !== expectedChecksum) {
                return { valid: false, error: 'QR Code 校驗失敗，可能被偽造' };
            }

            return {
                valid: true,
                orgCode,
                type,
                id,
            };
        } catch (error) {
            return { valid: false, error: '解析 QR Code 失敗' };
        }
    }

    /**
     * 計算校驗碼（SHA256 前 8 碼）
     * @private
     */
    private computeChecksum(orgCode: string, type: string, id: string): string {
        const data = `${orgCode}${type}${id}`;
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        return hash.substring(0, 8).toUpperCase();
    }

    /**
     * 批次產生 QR Code（用於資產入庫）
     * @param type - 類型
     * @param ids - ID 陣列
     * @returns QR Code 字串陣列
     */
    batchGenerateQrValues(type: 'LOT' | 'ASSET' | 'BIN', ids: string[]): string[] {
        return ids.map(id => this.generateQrValue(type, id));
    }
}
