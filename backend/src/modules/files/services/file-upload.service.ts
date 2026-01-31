import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface UploadedFile {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    hash: string;
    uploadedAt: Date;
    uploadedBy?: string;
}

export interface UploadOptions {
    maxSize?: number;
    allowedMimeTypes?: string[];
    directory?: string;
}

@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);

    private readonly defaultOptions: UploadOptions = {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/wav',
        ],
        directory: 'uploads',
    };

    async validate(
        file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
        options: UploadOptions = {}
    ): Promise<{ valid: boolean; errors: string[] }> {
        const opts = { ...this.defaultOptions, ...options };
        const errors: string[] = [];

        if (file.size > opts.maxSize!) {
            errors.push(`File size ${file.size} exceeds limit of ${opts.maxSize}`);
        }

        if (opts.allowedMimeTypes && !opts.allowedMimeTypes.includes(file.mimetype)) {
            errors.push(`MIME type ${file.mimetype} not allowed`);
        }

        // Check for malicious content (basic)
        if (this.containsMaliciousPatterns(file.originalname)) {
            errors.push('Filename contains potentially malicious patterns');
        }

        return { valid: errors.length === 0, errors };
    }

    async processUpload(
        file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
        uploadedBy?: string,
        options: UploadOptions = {}
    ): Promise<UploadedFile> {
        const validation = await this.validate(file, options);
        if (!validation.valid) {
            throw new BadRequestException(validation.errors.join(', '));
        }

        const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const ext = file.originalname.split('.').pop() || '';
        const filename = `${hash.substring(0, 16)}-${Date.now()}.${ext}`;

        return {
            id: `file-${Date.now()}`,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: `${options.directory || this.defaultOptions.directory}/${filename}`,
            hash,
            uploadedAt: new Date(),
            uploadedBy,
        };
    }

    async processMultipleUploads(
        files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
        uploadedBy?: string,
        options: UploadOptions = {}
    ): Promise<UploadedFile[]> {
        return Promise.all(files.map(f => this.processUpload(f, uploadedBy, options)));
    }

    private containsMaliciousPatterns(filename: string): boolean {
        const patterns = [
            /\.\./,           // Path traversal
            /[<>:"|?*]/,      // Invalid characters
            /\.exe$/i,        // Executables
            /\.php$/i,        // Scripts
            /\.js$/i,         // Scripts
            /\.sh$/i,         // Shell scripts
        ];
        return patterns.some(p => p.test(filename));
    }
}
