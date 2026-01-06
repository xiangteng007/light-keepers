import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * File Upload Service
 * Cloud storage integration for photos, documents, and media
 * 
 * 📋 需要設定:
 * - GCS_BUCKET: Google Cloud Storage bucket name
 * - GCS_KEY_FILE: Service account key file path (optional with ADC)
 */
@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 上傳檔案
     */
    async uploadFile(file: UploadFileInput): Promise<UploadResult> {
        const bucket = this.configService.get<string>('GCS_BUCKET');

        if (!bucket) {
            // 本地儲存 fallback
            return this.uploadToLocal(file);
        }

        try {
            const filename = this.generateFilename(file.originalName);
            const path = `${file.folder}/${filename}`;

            // TODO: 使用 @google-cloud/storage 上傳
            // const storage = new Storage();
            // await storage.bucket(bucket).file(path).save(file.buffer);

            return {
                success: true,
                url: `https://storage.googleapis.com/${bucket}/${path}`,
                path,
                filename,
                size: file.buffer.length,
                mimeType: file.mimeType,
            };
        } catch (error) {
            this.logger.error('File upload failed', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * 上傳多個檔案
     */
    async uploadMultiple(files: UploadFileInput[]): Promise<UploadResult[]> {
        return Promise.all(files.map((f) => this.uploadFile(f)));
    }

    /**
     * 取得簽名 URL (有時效的下載連結)
     */
    async getSignedUrl(path: string, expiresInMinutes: number = 60): Promise<string> {
        const bucket = this.configService.get<string>('GCS_BUCKET');

        if (!bucket) {
            return `/uploads/${path}`;
        }

        // TODO: 使用 GCS 產生 signed URL
        // const [url] = await storage.bucket(bucket).file(path).getSignedUrl({
        //     action: 'read',
        //     expires: Date.now() + expiresInMinutes * 60000,
        // });

        return `https://storage.googleapis.com/${bucket}/${path}?signed=pending`;
    }

    /**
     * 刪除檔案
     */
    async deleteFile(path: string): Promise<boolean> {
        const bucket = this.configService.get<string>('GCS_BUCKET');

        if (!bucket) {
            // 本地刪除
            return true;
        }

        try {
            // await storage.bucket(bucket).file(path).delete();
            return true;
        } catch (error) {
            this.logger.error('File delete failed', error);
            return false;
        }
    }

    /**
     * 取得上傳設定
     */
    getUploadConfig(): UploadConfig {
        return {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
            maxFiles: 10,
        };
    }

    /**
     * 驗證檔案
     */
    validateFile(file: { size: number; mimeType: string }): ValidationResult {
        const config = this.getUploadConfig();
        const errors: string[] = [];

        if (file.size > config.maxFileSize) {
            errors.push(`檔案大小超過限制 (${config.maxFileSize / 1024 / 1024}MB)`);
        }
        if (!config.allowedTypes.includes(file.mimeType)) {
            errors.push(`不支援的檔案類型: ${file.mimeType}`);
        }

        return { valid: errors.length === 0, errors };
    }

    // Private methods
    private generateFilename(originalName: string): string {
        const ext = originalName.split('.').pop();
        return `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;
    }

    private async uploadToLocal(file: UploadFileInput): Promise<UploadResult> {
        // 模擬本地儲存
        const filename = this.generateFilename(file.originalName);
        return {
            success: true,
            url: `/uploads/${file.folder}/${filename}`,
            path: `${file.folder}/${filename}`,
            filename,
            size: file.buffer.length,
            mimeType: file.mimeType,
        };
    }
}

// Types
interface UploadFileInput {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string;
}
interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    filename?: string;
    size?: number;
    mimeType?: string;
    error?: string;
}
interface UploadConfig { maxFileSize: number; allowedTypes: string[]; maxFiles: number; }
interface ValidationResult { valid: boolean; errors: string[]; }
