import { VoiceCallService } from './voice-call.service';

describe('VoiceCallService', () => {
    let service: VoiceCallService;
    let mockServer: { emit: jest.Mock; to: jest.Mock };

    beforeEach(() => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };
        // Construct directly — too many WebSocket decorators for NestJS TestingModule
        service = new VoiceCallService();
        (service as any).server = mockServer;
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('handleConnection / handleDisconnect', () => {
        it('should handle connection', () => {
            expect(() => service.handleConnection({ id: 'sock-1' } as any)).not.toThrow();
        });

        it('should handle disconnect and set user offline', () => {
            // Register first
            const client = { id: 'sock-1', join: jest.fn() };
            service.handleRegister(client as any, { userId: 'u1', name: 'User 1' });
            service.handleDisconnect({ id: 'sock-1' } as any);
            expect(mockServer.emit).toHaveBeenCalledWith('user-offline', { userId: 'u1' });
        });
    });

    describe('handleRegister', () => {
        it('should register user and emit user-online', () => {
            const client = { id: 'sock-1', join: jest.fn() };
            service.handleRegister(client as any, { userId: 'u1', name: 'Alice' });
            expect(client.join).toHaveBeenCalledWith('user:u1');
            expect(mockServer.emit).toHaveBeenCalledWith('user-online', { userId: 'u1', name: 'Alice' });
        });
    });

    describe('getOnlineUsers', () => {
        it('should return registered online users', () => {
            service.handleRegister({ id: 's1', join: jest.fn() } as any, { userId: 'u1', name: 'A' });
            service.handleRegister({ id: 's2', join: jest.fn() } as any, { userId: 'u2', name: 'B' });
            expect(service.getOnlineUsers()).toHaveLength(2);
        });
    });

    describe('getActiveCallsCount', () => {
        it('should return 0 initially', () => {
            expect(service.getActiveCallsCount()).toBe(0);
        });
    });

    describe('broadcastToMission', () => {
        it('should broadcast to available users', async () => {
            service.handleRegister({ id: 's1', join: jest.fn() } as any, { userId: 'u1', name: 'A' });
            const count = await service.broadcastToMission('m1', '緊急集合');
            expect(count).toBe(1);
            expect(mockServer.to).toHaveBeenCalledWith('user:u1');
        });
    });
});
