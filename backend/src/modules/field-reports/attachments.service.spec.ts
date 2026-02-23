import { AttachmentsService } from './attachments.service';

describe('AttachmentsService', () => {
    let service: AttachmentsService;
    let attachmentRepo: Record<string, jest.Mock>;
    let gcsStorage: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    beforeEach(() => {
        queryBuilder = {
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ generatedMaps: [{ id: 'att1' }] }),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        attachmentRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            findOne: jest.fn().mockResolvedValue({ id: 'att1', uploadStatus: 'uploading', size: 1024 }),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        gcsStorage = {
            generateUploadUrl: jest.fn().mockResolvedValue({
                url: 'https://storage.googleapis.com/signed-url',
                method: 'PUT',
                path: 'uploads/ms1/fr1/att1',
                expiresAt: new Date(Date.now() + 600000),
            }),
        };
        service = new AttachmentsService(attachmentRepo as any, gcsStorage as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('initiate', () => {
        it('should create attachment and return signed URL', async () => {
            const result = await service.initiate('fr1', 'ms1', {
                kind: 'photo', mime: 'image/jpeg', size: 2048,
            } as any);
            expect(result.attachmentId).toBe('att1');
            expect(result.uploadUrl).toContain('googleapis.com');
            expect(gcsStorage.generateUploadUrl).toHaveBeenCalled();
        });
    });

    describe('complete', () => {
        it('should mark upload as completed', async () => {
            const result = await service.complete('att1', { success: true, finalSize: 2048 } as any);
            expect(result.uploadStatus).toBe('uploaded');
        });

        it('should mark upload as failed', async () => {
            const result = await service.complete('att1', { success: false } as any);
            expect(result.uploadStatus).toBe('failed');
        });

        it('should throw for missing attachment', async () => {
            attachmentRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.complete('bad', { success: true } as any)).rejects.toThrow();
        });
    });

    describe('findPhotoEvidence', () => {
        it('should return GeoJSON FeatureCollection', async () => {
            const result = await service.findPhotoEvidence('ms1', {});
            expect(result.type).toBe('FeatureCollection');
            expect(result.features).toEqual([]);
        });
    });
});
