/**
 * realtime.module.ts
 * 
 * v5.0: 即時通訊模組 (Consolidated)
 * - Includes SocketGateway for WebSocket connections
 * - Includes ChatGateway and ChatService from realtime-chat
 */
import { Module, Global } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';
// Consolidated from realtime-chat module
import { ChatGateway } from '../realtime-chat/chat.gateway';
import { ChatService } from '../realtime-chat/chat.service';

@Global()
@Module({
    imports: [AuthModule],
    providers: [
        SocketGateway,
        // Consolidated from realtime-chat
        ChatGateway,
        ChatService,
    ],
    exports: [
        SocketGateway,
        ChatService,
    ],
})
export class RealtimeModule { }

