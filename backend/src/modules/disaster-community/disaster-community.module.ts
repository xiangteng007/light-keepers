import { Module } from '@nestjs/common';
import { DisasterCommunityService } from './disaster-community.service';
import { DisasterCommunityController } from './disaster-community.controller';

@Module({
    providers: [DisasterCommunityService],
    controllers: [DisasterCommunityController],
    exports: [DisasterCommunityService],
})
export class DisasterCommunityModule { }
