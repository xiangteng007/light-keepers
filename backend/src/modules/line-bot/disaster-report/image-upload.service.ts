/**
 * 災情回報圖片上傳服務
 * BOT-REPORT-001-03
 * 
 * 從 LINE 下載圖片並上傳至 Cloud Storage
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as crypto from 'crypto';

@Injectable()
export class ImageUploadService {
    private readonly logger = new Logger(ImageUploadService.name);
    private storage: Storage | null = null;
    private bucketName: string;
    private isConfigured = false;

    constructor(private configService: ConfigService) {
        this.bucketName = this.configService.get('GCS_BUCKET_NAME', 'light-keepers-reports');

        try {
            // 嘗試使用默認憑證（Cloud Run 環境會自動提供）
            this.storage = new Storage();
            this.isConfigured = true;
            this.logger.log(`Image upload service initialized with bucket: ${this.bucketName}`);
        } catch (error) {
            this.logger.warn('Cloud Storage not configured - images will use LINE URLs directly');
        }
    }

    /**
     * 從 LINE 下載圖片並上傳至 Cloud Storage
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

        if (!this.isConfigured || !this.storage) {
            // 如果 Cloud Storage 未設定，返回 LINE 內容 URL（有時效限制）
            this.logger.warn('Cloud Storage not available, returning LINE content URL');
            return `https://api-data.line.me/v2/bot/message/${messageId}/content`;
        }

        // 生成唯一檔名
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(4).toString('hex');
        const fileName = `reports/${lineUserId}/${timestamp}_${randomId}.jpg`;

        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(fileName);

            // 上傳圖片
            await file.save(imageBuffer, {
                metadata: {
                    contentType: 'image/jpeg',
                    metadata: {
                        lineMessageId: messageId,
                        lineUserId: lineUserId,
                        uploadedAt: new Date().toISOString(),
                    },
                },
            });

            // 設定公開讀取（或使用簽名 URL）
            await file.makePublic();

            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
            this.logger.log(`Image uploaded: ${publicUrl}`);

            return publicUrl;
        } catch (error) {
            this.logger.error(`Failed to upload image: ${error.message}`);
            // 回退到 LINE URL
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
        if (!this.isConfigured || !this.storage) {
            throw new Error('Cloud Storage not configured');
        }

        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fileName);

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });

        return url;
    }

    /**
     * 刪除圖片（用於取消回報時清理）
     */
    async deleteImage(imageUrl: string): Promise<boolean> {
        if (!this.isConfigured || !this.storage) {
            return false;
        }

        try {
            // 從 URL 提取檔名
            const prefix = `https://storage.googleapis.com/${this.bucketName}/`;
            if (!imageUrl.startsWith(prefix)) {
                return false;
            }

            const fileName = imageUrl.substring(prefix.length);
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(fileName);

            await file.delete();
            this.logger.log(`Image deleted: ${fileName}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete image: ${error.message}`);
            return false;
        }
    }

    /**
     * 檢查服務是否可用
     */
    isAvailable(): boolean {
        return this.isConfigured;
    }
}
