import { Module } from '@nestjs/common';
import { MobileSyncService } from './mobile-sync.service';
import { MobileSyncController } from './mobile-sync.controller';

@Module({
    providers: [MobileSyncService],
    controllers: [MobileSyncController],
    exports: [MobileSyncService],
})
export class MobileSyncModule { }
