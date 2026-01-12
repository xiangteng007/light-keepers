/**
 * realtime.module.ts
 * 
 * v4.0: 即時通訊模組
 */
import { Module, Global } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
    imports: [AuthModule],
    providers: [SocketGateway],
    exports: [SocketGateway],
})
export class RealtimeModule { }
