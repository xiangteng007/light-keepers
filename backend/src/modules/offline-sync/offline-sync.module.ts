import { Module } from '@nestjs/common';
import { OfflineSyncService } from './offline-sync.service';
import { OfflineSyncController } from './offline-sync.controller';

@Module({
    controllers: [OfflineSyncController],
    providers: [OfflineSyncService],
    exports: [OfflineSyncService],
})
export class OfflineSyncModule { }
