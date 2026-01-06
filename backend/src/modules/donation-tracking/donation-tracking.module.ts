import { Module } from '@nestjs/common';
import { DonationTrackingService } from './donation-tracking.service';

@Module({
    providers: [DonationTrackingService],
    exports: [DonationTrackingService],
})
export class DonationTrackingModule { }
