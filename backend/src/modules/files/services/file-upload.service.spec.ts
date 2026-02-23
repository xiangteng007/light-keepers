import { FileUploadService } from './file-upload.service';

describe('FileUploadService', () => {
    let service: FileUploadService;

    const validFile = {
        originalname: 'photo.png', mimetype: 'image/png',
        size: 1024, buffer: Buffer.from('PNG_DATA'),
    };

    beforeEach(() => {
        service = new FileUploadService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('validate', () => {
        it('should validate a proper file', async () => {
            const result = await service.validate(validFile);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject oversized file', async () => {
            const big = { ...validFile, size: 20 * 1024 * 1024 };
            const result = await service.validate(big);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('exceeds');
        });

        it('should reject disallowed MIME type', async () => {
            const bad = { ...validFile, mimetype: 'application/x-msdownload' };
            const result = await service.validate(bad);
            expect(result.valid).toBe(false);
        });

        it('should reject malicious filenames', async () => {
            const evil = { ...validFile, originalname: '../../../etc/passwd' };
            const result = await service.validate(evil);
            expect(result.valid).toBe(false);
        });
    });

    describe('processUpload', () => {
        it('should process valid upload', async () => {
            const result = await service.processUpload(validFile, 'user1');
            expect(result.id).toBeDefined();
            expect(result.originalName).toBe('photo.png');
            expect(result.hash).toBeDefined();
        });

        it('should throw on invalid upload', async () => {
            const bad = { ...validFile, mimetype: 'text/x-shellscript' };
            await expect(service.processUpload(bad)).rejects.toThrow();
        });
    });

    describe('processMultipleUploads', () => {
        it('should process multiple files', async () => {
            const files = [validFile, { ...validFile, originalname: 'b.png' }];
            const results = await service.processMultipleUploads(files, 'user1');
            expect(results).toHaveLength(2);
        });
    });
});
