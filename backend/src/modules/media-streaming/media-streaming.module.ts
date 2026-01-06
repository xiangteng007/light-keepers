/**
 * Media Streaming Module
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MediaStreamingService } from './media-streaming.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [MediaStreamingService],
    exports: [MediaStreamingService],
})
export class MediaStreamingModule { }
