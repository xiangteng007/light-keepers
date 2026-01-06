import { Module } from '@nestjs/common';
import { BlockchainTrackingService } from './blockchain-tracking.service';

@Module({
    providers: [BlockchainTrackingService],
    exports: [BlockchainTrackingService],
})
export class BlockchainModule { }
