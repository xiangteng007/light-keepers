import { VoiceAssistantService } from './voice-assistant.service';

describe('VoiceAssistantService', () => {
    let service: VoiceAssistantService;
    let emitter: { emit: jest.Mock };

    beforeEach(() => {
        emitter = { emit: jest.fn() };
        service = new VoiceAssistantService(
            { get: jest.fn().mockReturnValue(null) } as any,
            emitter as any,
        );
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('startSession', () => {
        it('should create a voice session', async () => {
            const session = await service.startSession('u1');
            expect(session.userId).toBe('u1');
            expect(session.status).toBe('listening');
            expect(session.wakeWordEnabled).toBe(true);
        });

        it('should apply custom config', async () => {
            const session = await service.startSession('u1', { language: 'en', wakeWordEnabled: false });
            expect(session.language).toBe('en');
            expect(session.wakeWordEnabled).toBe(false);
        });
    });

    describe('processTextCommand', () => {
        it('should process status query', async () => {
            const session = await service.startSession('u1');
            const response = await service.processTextCommand(session.id, '目前狀況');
            expect(response).toBeDefined();
        });

        it('should throw for unknown session', async () => {
            await expect(service.processTextCommand('bad-id', '測試')).rejects.toThrow();
        });
    });

    describe('registerCommand', () => {
        it('should register custom command', async () => {
            service.registerCommand({
                name: 'test_cmd',
                patterns: ['test pattern'],
                handler: async () => ({ success: true, message: 'OK', data: null, action: 'test' }),
            });
            // No throw = pass
        });
    });

    describe('endSession', () => {
        it('should end existing session', async () => {
            const session = await service.startSession('u1');
            expect(() => service.endSession(session.id)).not.toThrow();
        });

        it('should not throw for unknown session', () => {
            expect(() => service.endSession('non-existent')).not.toThrow();
        });
    });
});
