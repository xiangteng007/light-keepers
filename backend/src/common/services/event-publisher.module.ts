/**
 * event-publisher.module.ts
 * 
 * P3: Outbox Pattern - Event Publisher Module
 */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventOutbox } from '../entities/domain-events.entity';
import { EventPublisherService } from './event-publisher.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([DomainEventOutbox]),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot({
            wildcard: true,
            delimiter: '.',
            maxListeners: 20,
        }),
    ],
    providers: [EventPublisherService],
    exports: [EventPublisherService],
})
export class EventPublisherModule { }
