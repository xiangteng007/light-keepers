import { Module } from '@nestjs/common';
import { GeofenceAlertService } from './geofence-alert.service';

@Module({
    providers: [GeofenceAlertService],
    exports: [GeofenceAlertService],
})
export class GeofenceAlertModule { }
