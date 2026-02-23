import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
    let service: ChatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatService],
        }).compile();
        service = module.get(ChatService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('joinRoom creates client and room', () => {
        service.joinRoom('c1', 'room1', 'u1', 'Alice');
        const users = service.getRoomUsers('room1');
        expect(users.length).toBe(1);
        expect(users[0].userName).toBe('Alice');
    });

    it('leaveRoom removes client from room', () => {
        service.joinRoom('c1', 'room1', 'u1', 'Alice');
        service.leaveRoom('c1', 'room1');
        const users = service.getRoomUsers('room1');
        expect(users.length).toBe(0);
    });

    it('saveMessage stores and returns message', async () => {
        const msg = await service.saveMessage({
            roomId: 'room1', userId: 'u1', userName: 'Alice',
            content: 'Hello @Bob!', type: 'text',
        });
        expect(msg.id).toBeDefined();
        expect(msg.mentions).toContain('Bob');
    });

    it('getRoomHistory returns messages', async () => {
        await service.saveMessage({ roomId: 'room2', userId: 'u1', userName: 'A', content: 'msg1', type: 'text' });
        await service.saveMessage({ roomId: 'room2', userId: 'u2', userName: 'B', content: 'msg2', type: 'text' });
        const history = await service.getRoomHistory('room2');
        expect(history.length).toBe(2);
    });

    it('createRoom returns new room', () => {
        const room = service.createRoom({ name: 'Test', type: 'group', members: ['u1'] });
        expect(room.id).toBeDefined();
        expect(room.name).toBe('Test');
    });

    it('createTaskRoom creates task-type room', () => {
        const room = service.createTaskRoom('t1', 'Search', ['u1', 'u2']);
        expect(room.type).toBe('task');
        expect(room.name).toContain('Search');
    });

    it('parseMentions extracts @mentions', () => {
        const mentions = service.parseMentions('Hello @Alice and @Bob!');
        expect(mentions).toContain('Alice');
        expect(mentions).toContain('Bob');
    });

    it('getUserRooms returns rooms for user', () => {
        service.joinRoom('c1', 'room1', 'u1', 'Alice');
        const rooms = service.getUserRooms('u1');
        expect(rooms.length).toBe(1);
    });
});
