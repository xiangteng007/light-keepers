import { Module } from '@nestjs/common';
import { SocialMediaMonitorService } from './social-media-monitor.service';

@Module({
    providers: [SocialMediaMonitorService],
    exports: [SocialMediaMonitorService],
})
export class SocialMediaMonitorModule { }
