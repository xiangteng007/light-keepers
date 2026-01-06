/**
 * Cache Module
 * Provides caching capabilities with Redis or memory fallback
 */

import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
    providers: [CacheService],
    exports: [CacheService],
})
export class CacheModule { }
