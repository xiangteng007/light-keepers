/**
 * 災情回報圖片上傳服務
 * BOT-REPORT-001-03
 *
 * 從 LINE 下載圖片並上傳至 storage 抽象層
 *
 * INF-1 / M.3b：原本直接使用 GCS SDK，雲端關閉後會直接失效。
 * 改為注入 `DISASTER_REPORT_IMAGE_STORAGE`（`STORAGE_PROVIDER` 的 feature 綁定），
 * GCS 模式下 bucket、路徑組成與公開 URL 皆與先前相同。
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { DISASTER_REPORT_IMAGE_STORAGE } from '../../../common/storage/storage.tokens';
import type { StorageProvider } from '../../../common/storage/storage.interface';

@Injectable()
export class ImageUploadService {
    private readonly logger = new Logger(ImageUploadService.name);

    constructor(
        @Inject(DISASTER_REPORT_IMAGE_STORAGE) private readonly storage: StorageProvider,
    ) {
        this.logger.log(
            `Image upload service initialized with container: ${this.storage.getContainerName()}`,
        );
    }

    /**
     * 從 LINE 下載圖片並上傳至 storage
     * @param messageId LINE 訊息 ID
     * @param lineUserId 使用者 ID（用於路徑命名）
     * @returns 圖片公開 URL
     */
    async uploadFromLine(
        messageId: string,
        lineUserId: string,
        channelAccessToken: string,
    ): Promise<string> {
        // 從 LINE 下載圖片
        const imageBuffer = await this.downloadFromLine(messageId, channelAccessToken);

        // 生成唯一檔名
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(4).toString('hex');
        const fileName = `reports/${lineUserId}/${timestamp}_${randomId}.jpg`;

        try {
            const result = await this.storage.upload(fileName, imageBuffer, {
                contentType: 'image/jpeg',
                public: true,
                metadata: {
                    lineMessageId: messageId,
                    lineUserId: lineUserId,
                    uploadedAt: new Date().toISOString(),
                },
            });

            this.logger.log(`Image uploaded: ${result.url}`);

            return result.url;
        } catch (error) {
            this.logger.error(`Failed to upload image: ${error.message}`);
            // 回退到 LINE URL（有時效限制），至少不讓整個回報流程失敗
            return `https://api-data.line.me/v2/bot/message/${messageId}/content`;
        }
    }

    /**
     * 從 LINE Message API 下載圖片內容
     */
    private async downloadFromLine(messageId: string, channelAccessToken: string): Promise<Buffer> {
        const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${channelAccessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download image from LINE: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * 生成簽名 URL（適用於私有 bucket）
     */
    async generateSignedUrl(fileName: string, expiresInMinutes = 60): Promise<string> {
        return this.storage.getSignedUrl(fileName, {
            action: 'read',
            expiresIn: expiresInMinutes * 60,
        });
    }

    /**
     * 刪除圖片（用於取消回報時清理）
     *
     * 只接受本服務自己發出的公開 URL；其他來源（例如 LINE 的 content URL 回退值）
     * 一律回 false，避免把不屬於這個 bucket 的路徑餵給 storage。
     */
    async deleteImage(imageUrl: string): Promise<boolean> {
        try {
            const prefix = this.storage.getPublicUrl('');
            if (!imageUrl.startsWith(prefix)) {
                return false;
            }

            const fileName = imageUrl.substring(prefix.length);
            await this.storage.delete(fileName, { ignoreNotFound: false });
            this.logger.log(`Image deleted: ${fileName}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete image: ${error.message}`);
            return false;
        }
    }

    /**
     * 檢查服務是否可用
     *
     * 抽象層一定會提供一個 provider（GCS 或本地磁碟），因此恆為 true。
     * 保留此方法是為了呼叫端相容性。
     */
    isAvailable(): boolean {
        return true;
    }
}
