import { Test, TestingModule } from '@nestjs/testing';
import { VoiceController } from './voice.controller';
import { VoiceTranscriptionService } from './voice-transcription.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('VoiceController', () => {
    let controller: VoiceController;

    beforeEach(async () => {
        const service = {
            processAudioUpload: jest.fn().mockResolvedValue({ id: 'v1', text: 'hello' }),
            getVoiceLogs: jest.fn().mockResolvedValue([]),
            getVoiceLog: jest.fn().mockResolvedValue({ id: 'v1' }),
            generateSITREP: jest.fn().mockResolvedValue({ sitrep: 'draft' }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VoiceController],
            providers: [{ provide: VoiceTranscriptionService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<VoiceController>(VoiceController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('uploadVoice', async () => expect(await controller.uploadVoice('ms1', { buffer: Buffer.from(''), mimetype: 'audio/wav' }, {})).toBeDefined());
    it('getVoiceLogs', async () => expect(await controller.getVoiceLogs('ms1')).toEqual([]));
    it('getVoiceLog', async () => expect(await controller.getVoiceLog('ms1', 'v1')).toBeDefined());
    it('generateSITREP', async () => expect(await controller.generateSITREP('ms1')).toBeDefined());
});
