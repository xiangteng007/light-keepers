/**
 * Offline Tiles Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OfflineTilesService } from './offline-tiles.service';

@Module({
    imports: [ConfigModule],
    providers: [OfflineTilesService],
    exports: [OfflineTilesService],
})
export class OfflineTilesModule { }
