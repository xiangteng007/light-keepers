import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotAssistantService } from './chatbot-assistant.service';
import { GeminiProvider } from './providers/gemini.provider';

describe('ChatbotAssistantService', () => {
    let service: ChatbotAssistantService;
    let geminiProvider: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatbotAssistantService,
                {
                    provide: GeminiProvider,
                    useValue: {
                        chat: jest.fn().mockResolvedValue({ text: '這是 AI 回應。' }),
                        generateContent: jest.fn().mockResolvedValue({ text: '快速回答。' }),
                        analyzeDisasterText: jest.fn().mockResolvedValue({
                            summary: '地震報告摘要',
                            severity: 'high',
                            disasterType: '地震',
                            suggestedActions: ['撤離', '檢查建築'],
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<ChatbotAssistantService>(ChatbotAssistantService);
        geminiProvider = module.get(GeminiProvider);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Session Management =====
    describe('startSession', () => {
        it('should create new chat session', () => {
            const session = service.startSession('user-1');
            expect(session.id).toBeDefined();
            expect(session.userId).toBe('user-1');
            expect(session.messages).toEqual([]);
        });

        it('should create session with context', () => {
            const session = service.startSession('user-1', { location: '台北' });
            expect(session.context).toEqual({ location: '台北' });
        });
    });

    describe('getSession', () => {
        it('should return existing session', () => {
            const session = service.startSession('user-1');
            const found = service.getSession(session.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(session.id);
        });

        it('should return undefined for missing session', () => {
            expect(service.getSession('nonexistent')).toBeUndefined();
        });
    });

    describe('getUserSessions', () => {
        it('should return user sessions sorted by last activity', () => {
            service.startSession('user-1');
            service.startSession('user-1');
            service.startSession('user-2');
            const sessions = service.getUserSessions('user-1');
            expect(sessions).toHaveLength(2);
        });
    });

    describe('endSession', () => {
        it('should delete session', () => {
            const session = service.startSession('user-1');
            expect(service.endSession(session.id)).toBe(true);
            expect(service.getSession(session.id)).toBeUndefined();
        });

        it('should return false for missing session', () => {
            expect(service.endSession('nonexistent')).toBe(false);
        });
    });

    // ===== Messaging =====
    describe('sendMessage', () => {
        it('should send message and get AI response', async () => {
            const session = service.startSession('user-1');
            const response = await service.sendMessage(session.id, '現在有哪些地震警報？');
            expect(response.message).toBe('這是 AI 回應。');
            expect(geminiProvider.chat).toHaveBeenCalled();
        });

        it('should auto-create session if not exists', async () => {
            const response = await service.sendMessage('new-session', '你好');
            expect(response.message).toBeDefined();
        });

        it('should generate suggestions based on keywords', async () => {
            const session = service.startSession('user-1');
            const response = await service.sendMessage(session.id, '目前天氣如何？');
            expect(response.suggestions).toBeDefined();
        });
    });

    // ===== Quick Query =====
    describe('quickQuery', () => {
        it('should return AI response without session', async () => {
            const result = await service.quickQuery('什麼是土石流？');
            expect(result).toBe('快速回答。');
            expect(geminiProvider.generateContent).toHaveBeenCalled();
        });
    });

    // ===== Report Analysis =====
    describe('analyzeReport', () => {
        it('should analyze disaster report', async () => {
            const result = await service.analyzeReport('台南市發生6.2級地震，多處建築受損');
            expect(result.severity).toBe('high');
            expect(result.category).toBe('地震');
            expect(result.suggestedActions).toContain('撤離');
        });
    });

    // ===== Cleanup =====
    describe('cleanupOldSessions', () => {
        it('should clean up sessions older than threshold', () => {
            const session = service.startSession('user-1');
            // Override lastActivity to be old
            const old = service.getSession(session.id)!;
            old.lastActivity = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

            const cleaned = service.cleanupOldSessions(24);
            expect(cleaned).toBe(1);
            expect(service.getSession(session.id)).toBeUndefined();
        });

        it('should not clean recent sessions', () => {
            service.startSession('user-1');
            const cleaned = service.cleanupOldSessions(24);
            expect(cleaned).toBe(0);
        });
    });
});
