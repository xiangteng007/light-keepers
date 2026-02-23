import { VoiceTranscriptionService } from './voice-transcription.service';

describe('VoiceTranscriptionService', () => {
    let service: VoiceTranscriptionService;
    const configService = { get: jest.fn().mockReturnValue(undefined) };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new VoiceTranscriptionService(configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('processAudioUpload', () => {
        it('should process audio and return entry', async () => {
            const buf = Buffer.from('fake-audio');
            const entry = await service.processAudioUpload('mission-1', buf, 'user-1', 'Operator');
            expect(entry.id).toBeDefined();
            expect(entry.missionSessionId).toBe('mission-1');
            expect(entry.speakerId).toBe('user-1');
        });
    });

    describe('getVoiceLogs', () => {
        it('should return empty for unknown mission', () => {
            expect(service.getVoiceLogs('unknown')).toEqual([]);
        });

        it('should return logs after upload', async () => {
            await service.processAudioUpload('m-2', Buffer.from('a'), 'u1');
            const logs = service.getVoiceLogs('m-2');
            expect(logs.length).toBe(1);
        });
    });

    describe('getVoiceLog', () => {
        it('should return specific log entry', async () => {
            const entry = await service.processAudioUpload('m-3', Buffer.from('a'));
            const found = service.getVoiceLog('m-3', entry.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(entry.id);
        });

        it('should return undefined for unknown log', () => {
            expect(service.getVoiceLog('m-3', 'bad')).toBeUndefined();
        });
    });

    describe('generateSITREP', () => {
        it('should generate SITREP draft from logs', async () => {
            await service.processAudioUpload('m-4', Buffer.from('audio'));
            // Wait for async transcription
            await new Promise(r => setTimeout(r, 200));
            const sitrep = await service.generateSITREP('m-4');
            expect(sitrep.situation).toBeDefined();
            expect(sitrep.actions).toBeDefined();
        });
    });
});
