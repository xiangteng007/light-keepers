import { Module } from '@nestjs/common';
import { OfflineMapCacheService } from './offline-map-cache.service';

@Module({
    providers: [OfflineMapCacheService],
    exports: [OfflineMapCacheService],
})
export class OfflineMapCacheModule { }
