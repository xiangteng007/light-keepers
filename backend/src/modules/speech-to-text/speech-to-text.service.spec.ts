import { SpeechToTextService } from './speech-to-text.service';

describe('SpeechToTextService', () => {
    let service: SpeechToTextService;
    const configService = { get: jest.fn().mockReturnValue(undefined) };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SpeechToTextService(configService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('transcribe', () => {
        it('should return mock transcription when GCP not configured', async () => {
            const result = await service.transcribe('base64audio');
            expect(result.text).toContain('前線小組');
            expect(result.confidence).toBeGreaterThan(0.5);
        });

        it('should support language option', async () => {
            const result = await service.transcribe('base64audio', { language: 'en-US' });
            expect(result.language).toBe('en-US');
        });
    });

    describe('streamTranscribe', () => {
        it('should return an async generator', async () => {
            const gen = await service.streamTranscribe(null);
            const chunks: any[] = [];
            for await (const chunk of gen) { chunks.push(chunk); }
            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[chunks.length - 1].isFinal).toBe(true);
        });
    });

    describe('transcribeRadio', () => {
        it('should return radio transcription with callSign/priority/keywords', async () => {
            const result = await service.transcribeRadio('base64audio');
            expect(result).toHaveProperty('callSign');
            expect(result).toHaveProperty('priority');
            expect(result).toHaveProperty('keywords');
            expect(result.text).toBeDefined();
        });
    });

    describe('batchTranscribe', () => {
        it('should transcribe multiple audio files', async () => {
            const files = [
                { id: 'a1', base64: 'data1' },
                { id: 'a2', base64: 'data2' },
            ];
            const results = await service.batchTranscribe(files);
            expect(results.size).toBe(2);
            expect(results.get('a1')?.text).toBeDefined();
        });
    });
});
