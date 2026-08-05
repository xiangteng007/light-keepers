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

        /** 有 LLM 可用時的路徑（預設 fixture 沒注入 provider，走 mockSITREP） */
        async function withLlm(generateText: jest.Mock) {
            const svc = new VoiceTranscriptionService(
                configService as never,
                { isAvailable: () => true, generateText } as never,
            );
            await svc.processAudioUpload('m-llm', Buffer.from('audio'));
            await new Promise(r => setTimeout(r, 200));
            return svc.generateSITREP('m-llm');
        }

        it('要求 runtime 產生合法 JSON（json + jsonSchema）', async () => {
            const generateText = jest.fn().mockResolvedValue({
                text: '{"situation":"s","actions":"a","needs":"n"}',
                modelName: 'qwen3:14b',
                processingTimeMs: 10,
            });

            await withLlm(generateText);

            const request = generateText.mock.calls[0][0];
            expect(request.json).toBe(true);
            expect(request.jsonSchema).toMatchObject({ required: ['situation', 'actions', 'needs'] });
        });

        it('鍵沒有引號的非法 JSON 仍能解析（不退回罐頭 SITREP）', async () => {
            const generateText = jest.fn().mockResolvedValue({
                text: '{situation: "南區積水", actions: "已封路", needs: "抽水機"}',
                modelName: 'qwen3:14b',
                processingTimeMs: 10,
            });

            const sitrep = await withLlm(generateText);

            expect(sitrep.situation).toBe('南區積水');
            expect(sitrep.needs).toBe('抽水機');
        });

        it('完全解析不出來時退回罐頭 SITREP，不對外拋', async () => {
            const generateText = jest.fn().mockResolvedValue({
                text: '抱歉，我無法整理。',
                modelName: 'qwen3:14b',
                processingTimeMs: 10,
            });

            const sitrep = await withLlm(generateText);
            expect(sitrep.situation).toContain('語音回報');
        });
    });
});
