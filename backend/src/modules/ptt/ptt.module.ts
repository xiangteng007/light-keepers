/**
 * PTT WebRTC Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PttWebrtcService } from './ptt-webrtc.service';

@Module({
    imports: [ConfigModule, EventEmitterModule.forRoot()],
    providers: [PttWebrtcService],
    exports: [PttWebrtcService],
})
export class PttModule { }
