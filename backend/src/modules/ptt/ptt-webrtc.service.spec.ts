import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PttWebrtcService } from './ptt-webrtc.service';

describe('PttWebrtcService', () => {
    let service: PttWebrtcService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PttWebrtcService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();
        service = module.get(PttWebrtcService);
        service.onModuleInit(); // creates default channels
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('onModuleInit creates default channels', () => {
        expect(service.getChannel('emergency')).toBeDefined();
        expect(service.getChannel('command')).toBeDefined();
    });

    it('getIceServers returns STUN servers', () => {
        const servers = service.getIceServers();
        expect(servers.length).toBeGreaterThanOrEqual(2);
    });

    it('createChannel creates channel', () => {
        const ch = service.createChannel('ops', 'Operations');
        expect(ch.id).toBe('ops');
    });

    it('listChannels returns all', () => {
        expect(service.listChannels().length).toBeGreaterThanOrEqual(4);
    });

    it('joinChannel / leaveChannel works', () => {
        expect(service.joinChannel('u1', 'emergency')).toBe(true);
        expect(service.getUserChannel('u1')).toBe('emergency');
        expect(service.leaveChannel('u1')).toBe(true);
        expect(service.getUserChannel('u1')).toBeUndefined();
    });

    it('joinChannel switches channels', () => {
        service.joinChannel('u1', 'emergency');
        service.joinChannel('u1', 'command');
        expect(service.getUserChannel('u1')).toBe('command');
    });

    it('startTalking / stopTalking works', () => {
        service.joinChannel('u1', 'emergency');
        const session = service.startTalking('u1', 'User1');
        expect(session).not.toBeNull();
        expect(service.getActiveSpeaker('emergency')).toBe('u1');
        const stopped = service.stopTalking('u1');
        expect(stopped).not.toBeNull();
        expect(service.getActiveSpeaker('emergency')).toBeUndefined();
    });

    it('startTalking blocked when someone else is talking', () => {
        service.joinChannel('u1', 'emergency');
        service.joinChannel('u2', 'emergency');
        service.startTalking('u1', 'User1');
        const blocked = service.startTalking('u2', 'User2');
        expect(blocked).toBeNull();
    });

    it('getChannelParticipants returns members', () => {
        service.joinChannel('u1', 'emergency');
        expect(service.getChannelParticipants('emergency')).toContain('u1');
    });
});
