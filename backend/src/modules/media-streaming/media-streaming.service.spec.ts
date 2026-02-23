import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MediaStreamingService } from './media-streaming.service';

describe('MediaStreamingService', () => {
    let service: MediaStreamingService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MediaStreamingService,
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(MediaStreamingService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('registerSource creates and returns source', () => {
        const src = service.registerSource({ type: 'drone', name: 'Drone-1' });
        expect(src.id).toBeDefined();
        expect(src.status).toBe('offline');
        expect(src.viewers).toBe(0);
    });

    it('listSources returns all or filtered', () => {
        service.registerSource({ type: 'drone', name: 'D1' });
        service.registerSource({ type: 'webcam', name: 'W1' });
        expect(service.listSources().length).toBe(2);
        expect(service.listSources('drone').length).toBe(1);
    });

    it('startStream / stopStream toggles status', () => {
        const src = service.registerSource({ type: 'webcam', name: 'Cam' });
        expect(service.startStream(src.id)).toBe(true);
        expect(service.getSource(src.id)!.status).toBe('connecting');
        expect(service.stopStream(src.id)).toBe(true);
        expect(service.getSource(src.id)!.status).toBe('offline');
    });

    it('createRoom / getRoom works', () => {
        const room = service.createRoom('Op Room', 'ms1');
        expect(room.id).toBeDefined();
        expect(service.getRoom(room.id)).toBeDefined();
    });

    it('joinRoom / leaveRoom manages viewers', () => {
        const room = service.createRoom('Room');
        service.joinRoom(room.id, 'u1');
        expect(service.getRoom(room.id)!.viewers.size).toBe(1);
        service.leaveRoom(room.id, 'u1');
        expect(service.getRoom(room.id)!.viewers.size).toBe(0);
    });

    it('startRecording / stopRecording works', () => {
        const room = service.createRoom('Rec');
        expect(service.startRecording(room.id)).toBe(true);
        expect(service.getRoom(room.id)!.isRecording).toBe(true);
        const path = service.stopRecording(room.id);
        expect(path).toContain('recordings');
    });

    it('createOffer returns WebRTC offer', () => {
        const room = service.createRoom('Offer');
        const src = service.registerSource({ type: 'webcam', name: 'C' });
        const offer = service.createOffer(room.id, src.id);
        expect(offer.sdp).toContain('v=0');
        expect(offer.iceServers.length).toBeGreaterThan(0);
    });

    it('getIceServers returns STUN servers', () => {
        const servers = service.getIceServers();
        expect(servers.length).toBeGreaterThanOrEqual(2);
    });
});
