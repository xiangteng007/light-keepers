import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiClientService } from './gemini-client.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GeminiClientService', () => {
    let service: GeminiClientService;

    const mockApiResponse = {
        candidates: [{
            content: { parts: [{ text: 'AI response text' }] },
            finishReason: 'STOP',
        }],
        usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
        },
    };

    beforeEach(async () => {
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockApiResponse),
            text: () => Promise.resolve(''),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GeminiClientService,
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn().mockReturnValue('test-api-key') },
                },
            ],
        }).compile();

        service = module.get<GeminiClientService>(GeminiClientService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== isAvailable =====
    describe('isAvailable', () => {
        it('should return true when API key is set', () => {
            expect(service.isAvailable()).toBe(true);
        });

        it('should return false when API key is empty', async () => {
            const module = await Test.createTestingModule({
                providers: [
                    GeminiClientService,
                    { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
                ],
            }).compile();
            const svc = module.get<GeminiClientService>(GeminiClientService);
            expect(svc.isAvailable()).toBe(false);
        });
    });

    // ===== generateContent =====
    describe('generateContent', () => {
        it('should call Gemini API and return response', async () => {
            const result = await service.generateContent('Hello');
            expect(result.text).toBe('AI response text');
            expect(result.usage.promptTokens).toBe(100);
            expect(result.usage.totalTokens).toBe(150);
            expect(result.finishReason).toBe('STOP');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-1.5-flash'),
                expect.objectContaining({ method: 'POST' }),
            );
        });

        it('should use specified model', async () => {
            await service.generateContent('Test', { model: 'gemini-1.5-pro' });
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-1.5-pro'),
                expect.any(Object),
            );
        });

        it('should include system instruction when provided', async () => {
            await service.generateContent('Test', { systemInstruction: 'Be helpful' });
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.systemInstruction.parts[0].text).toBe('Be helpful');
        });

        it('should throw on API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                text: () => Promise.resolve('Rate limited'),
            });
            await expect(service.generateContent('Test'))
                .rejects.toThrow('Gemini API error: 429');
        });

        it('should handle empty response gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ candidates: [], usageMetadata: {} }),
            });
            const result = await service.generateContent('Test');
            expect(result.text).toBe('');
            expect(result.finishReason).toBe('UNKNOWN');
        });
    });

    // ===== chat =====
    describe('chat', () => {
        it('should send conversation history', async () => {
            const messages = [
                { role: 'user' as const, parts: [{ text: 'Hi' }] },
                { role: 'model' as const, parts: [{ text: 'Hello' }] },
            ];
            await service.chat(messages, 'How are you?');
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.contents).toHaveLength(3); // 2 history + 1 new
            expect(body.contents[2].parts[0].text).toBe('How are you?');
        });
    });

    // ===== analyzeImage =====
    describe('analyzeImage', () => {
        it('should send image data with prompt', async () => {
            await service.analyzeImage('base64data', 'image/png', 'Describe this');
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.contents[0].parts[0].inlineData.data).toBe('base64data');
            expect(body.contents[0].parts[0].inlineData.mimeType).toBe('image/png');
            expect(body.contents[0].parts[1].text).toBe('Describe this');
        });
    });

    // ===== generateStructured =====
    describe('generateStructured', () => {
        it('should parse JSON from response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: { parts: [{ text: '```json\n{"name": "test"}\n```' }] },
                        finishReason: 'STOP',
                    }],
                    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
                }),
            });
            const result = await service.generateStructured<{ name: string }>('Generate JSON');
            expect(result.data.name).toBe('test');
        });

        it('should throw when no JSON found', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: { parts: [{ text: 'No JSON here' }] },
                        finishReason: 'STOP',
                    }],
                    usageMetadata: {},
                }),
            });
            await expect(service.generateStructured('Bad prompt'))
                .rejects.toThrow('Failed to extract JSON');
        });
    });
});
