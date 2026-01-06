import { Module } from '@nestjs/common';
import { DeviceManagementService } from './device-management.service';

@Module({
    providers: [DeviceManagementService],
    exports: [DeviceManagementService],
})
export class DeviceManagementModule { }
