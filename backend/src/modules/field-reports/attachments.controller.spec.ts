import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AttachmentsController', () => {
    let controller: AttachmentsController;

    beforeEach(async () => {
        const service = {
            initiate: jest.fn().mockResolvedValue({ attachmentId: 'a1', uploadUrl: 'https://storage/upload' }),
            complete: jest.fn().mockResolvedValue({ attachmentId: 'a1', status: 'completed' }),
            findPhotoEvidence: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AttachmentsController],
            providers: [{ provide: AttachmentsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AttachmentsController>(AttachmentsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('initiate starts attachment upload', async () => {
        const result = await controller.initiate('r1', { fileName: 'photo.jpg', mimeType: 'image/jpeg' } as any);
        expect(result).toBeDefined();
    });

    it('complete completes attachment upload', async () => {
        const result = await controller.complete('a1', { fileSize: 1024 } as any);
        expect(result).toBeDefined();
    });

    it('getPhotoEvidence returns photo evidence list', async () => {
        const result = await controller.getPhotoEvidence('ms1', {} as any);
        expect(result).toBeDefined();
    });
});
