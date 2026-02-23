import { SessionStateService } from './session-state.service';

// Mock the imported types/constants
jest.mock('./disaster-report.types', () => ({
    ReportSessionState: {
        IDLE: 'IDLE',
        WAIT_TEXT: 'WAIT_TEXT',
        WAIT_IMAGE: 'WAIT_IMAGE',
        WAIT_LOCATION: 'WAIT_LOCATION',
        WAIT_CONFIRM: 'WAIT_CONFIRM',
    },
}), { virtual: true });

jest.mock('./disaster-report.constants', () => ({
    SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
}), { virtual: true });

describe('SessionStateService', () => {
    let service: SessionStateService;

    beforeEach(() => {
        service = new SessionStateService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createSession', () => {
        it('should create a new session', async () => {
            const session = await service.createSession('user-1', '王大明');
            expect(session.lineUserId).toBe('user-1');
            expect(session.displayName).toBe('王大明');
            expect(session.state).toBe('WAIT_TEXT');
        });
    });

    describe('getSession', () => {
        it('should return session after creation', async () => {
            await service.createSession('user-1');
            const session = await service.getSession('user-1');
            expect(session).toBeDefined();
        });

        it('should return null for unknown user', async () => {
            const session = await service.getSession('unknown');
            expect(session).toBeNull();
        });
    });

    describe('updateState', () => {
        it('should update session state', async () => {
            await service.createSession('user-1');
            const updated = await service.updateState('user-1', 'WAIT_IMAGE' as any);
            expect(updated?.state).toBe('WAIT_IMAGE');
        });

        it('should return null for unknown user', async () => {
            const updated = await service.updateState('unknown', 'WAIT_IMAGE' as any);
            expect(updated).toBeNull();
        });
    });

    describe('updateData', () => {
        it('should merge data into session', async () => {
            await service.createSession('user-1');
            const updated = await service.updateData('user-1', { text: '淹水了' });
            expect(updated?.data.text).toBe('淹水了');
        });
    });

    describe('setText', () => {
        it('should set text data', async () => {
            await service.createSession('user-1');
            const updated = await service.setText('user-1', '地震了');
            expect(updated?.data.text).toBe('地震了');
        });
    });

    describe('addImage', () => {
        it('should add image to session', async () => {
            await service.createSession('user-1');
            await service.addImage('user-1', 'https://img1.jpg');
            const updated = await service.addImage('user-1', 'https://img2.jpg');
            expect(updated?.data.imageUrls?.length).toBe(2);
        });
    });

    describe('setLocation', () => {
        it('should set location', async () => {
            await service.createSession('user-1');
            const updated = await service.setLocation('user-1', { lat: 25.03, lng: 121.56 } as any);
            expect(updated?.data.location).toBeDefined();
        });
    });

    describe('deleteSession', () => {
        it('should delete session', async () => {
            await service.createSession('user-1');
            await service.deleteSession('user-1');
            const session = await service.getSession('user-1');
            expect(session).toBeNull();
        });
    });

    describe('isInReportFlow', () => {
        it('should return false for unknown user', async () => {
            expect(await service.isInReportFlow('unknown')).toBe(false);
        });

        it('should return true for active session', async () => {
            await service.createSession('user-1');
            expect(await service.isInReportFlow('user-1')).toBe(true);
        });
    });

    describe('getStats', () => {
        it('should return active session count', async () => {
            await service.createSession('user-1');
            await service.createSession('user-2');
            const stats = service.getStats();
            expect(stats.activeSessions).toBe(2);
        });
    });

    describe('cleanupExpiredSessions', () => {
        it('should clean up expired sessions', async () => {
            await service.createSession('user-1');
            // Manually expire the session
            const session = await service.getSession('user-1');
            if (session) session.expiresAt = new Date(Date.now() - 1000);
            const cleaned = await service.cleanupExpiredSessions();
            expect(cleaned).toBeGreaterThanOrEqual(1);
        });
    });
});
