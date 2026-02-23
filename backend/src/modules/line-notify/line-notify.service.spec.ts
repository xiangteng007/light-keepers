import { LineNotifyService } from './line-notify.service';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('LineNotifyService', () => {
    let service: LineNotifyService;
    let configService: { get: jest.Mock };

    beforeEach(() => {
        configService = { get: jest.fn().mockReturnValue('test-token') };
        service = new LineNotifyService(configService as any);
        mockFetch.mockReset();
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ status: 200, message: 'ok' }),
        });
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('sendMessage', () => {
        it('should send text message with token', async () => {
            const result = await service.sendMessage('Hello');
            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://notify-api.line.me/api/notify',
                expect.objectContaining({ method: 'POST' }),
            );
        });

        it('should return error when no token', async () => {
            configService.get.mockReturnValue(null);
            const svc = new LineNotifyService(configService as any);
            const result = await svc.sendMessage('Hello');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Token');
        });

        it('should handle fetch errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const result = await service.sendMessage('Hello');
            expect(result.success).toBe(false);
        });
    });

    describe('sendImage', () => {
        it('should send image with message', async () => {
            const result = await service.sendImage('Photo', 'https://img.example.com/1.jpg');
            expect(result.success).toBe(true);
        });

        it('should return error without token', async () => {
            configService.get.mockReturnValue(null);
            const svc = new LineNotifyService(configService as any);
            const result = await svc.sendImage('Photo', 'https://img.jpg');
            expect(result.success).toBe(false);
        });
    });

    describe('sendAlert', () => {
        it('should format and send alert', async () => {
            const result = await service.sendAlert({
                title: '地震警報',
                description: '台北市發生地震',
                severity: 'critical',
                location: '台北市',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('sendTaskNotification', () => {
        it('should format and send task notification', async () => {
            const result = await service.sendTaskNotification({
                title: '巡視任務',
                assignee: '志工A',
                status: 'urgent',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('broadcast', () => {
        it('should send to multiple tokens', async () => {
            const result = await service.broadcast('Test', ['t1', 't2', 't3']);
            expect(result.total).toBe(3);
            expect(result.successful).toBe(3);
            expect(result.failed).toBe(0);
        });
    });

    describe('getSeverityEmoji', () => {
        it('should return correct emojis', () => {
            expect((service as any).getSeverityEmoji('critical')).toBe('🔴');
            expect((service as any).getSeverityEmoji('warning')).toBe('🟡');
            expect((service as any).getSeverityEmoji('info')).toBe('🔵');
            expect((service as any).getSeverityEmoji('other')).toBe('⚪');
        });
    });
});
