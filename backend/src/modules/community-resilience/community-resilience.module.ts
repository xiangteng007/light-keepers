import { Module } from '@nestjs/common';
import { CommunityResilienceService } from './community-resilience.service';

@Module({
    providers: [CommunityResilienceService],
    exports: [CommunityResilienceService],
})
export class CommunityResilienceModule { }
