import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
}

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);
    private readonly uploadDir: string;
    private readonly baseUrl: string;
    private readonly useGcs: boolean;

    constructor(private configService: ConfigService) {
        // 使用本地儲存 (可切換至 GCS)
        this.useGcs = this.configService.get('STORAGE_TYPE') === 'gcs';
        this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
        this.baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');

        // 確保上傳目錄存在
        if (!this.useGcs && !fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
            this.logger.log(`Created upload directory: ${this.uploadDir}`);
        }
    }

    /**
     * 上傳檔案 (Base64)
     */
    async uploadBase64(
        base64Data: string,
        folder: string = 'general',
    ): Promise<UploadResult> {
        // 解析 Base64 Data URL
        const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 data format');
        }

        const mimetype = matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // 決定副檔名
        const ext = this.getExtensionFromMime(mimetype);
        const filename = `${uuidv4()}.${ext}`;

        if (this.useGcs) {
            // TODO: 實作 GCS 上傳
            return this.uploadToGcs(buffer, folder, filename, mimetype);
        } else {
            return this.uploadToLocal(buffer, folder, filename, mimetype);
        }
    }

    /**
     * 上傳至本地儲存
     */
    private async uploadToLocal(
        buffer: Buffer,
        folder: string,
        filename: string,
        mimetype: string,
    ): Promise<UploadResult> {
        const folderPath = path.join(this.uploadDir, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const filePath = path.join(folderPath, filename);
        fs.writeFileSync(filePath, buffer);

        this.logger.log(`Uploaded file: ${filePath} (${buffer.length} bytes)`);

        return {
            url: `${this.baseUrl}/uploads/${folder}/${filename}`,
            filename,
            mimetype,
            size: buffer.length,
        };
    }

    /**
     * 上傳至 Google Cloud Storage (預留介面)
     */
    private async uploadToGcs(
        buffer: Buffer,
        folder: string,
        filename: string,
        mimetype: string,
    ): Promise<UploadResult> {
        // TODO: 安裝 @google-cloud/storage 並實作
        // const { Storage } = require('@google-cloud/storage');
        // const storage = new Storage();
        // const bucket = storage.bucket(this.configService.get('GCS_BUCKET'));
        // const file = bucket.file(`${folder}/${filename}`);
        // await file.save(buffer, { contentType: mimetype });

        throw new Error('GCS upload not yet implemented. Set STORAGE_TYPE=local');
    }

    /**
     * 刪除本地檔案
     */
    async deleteFile(fileUrl: string): Promise<void> {
        if (this.useGcs) {
            // TODO: 實作 GCS 刪除
            return;
        }

        const relativePath = fileUrl.replace(`${this.baseUrl}/uploads/`, '');
        const filePath = path.join(this.uploadDir, relativePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.logger.log(`Deleted file: ${filePath}`);
        }
    }

    /**
     * 取得 MIME 對應的副檔名
     */
    private getExtensionFromMime(mimetype: string): string {
        const mimeMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
            'application/pdf': 'pdf',
        };
        return mimeMap[mimetype] || 'bin';
    }
}
