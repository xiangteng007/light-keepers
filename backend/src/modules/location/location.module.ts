/**
 * Location Module
 * Geofencing and location services
 */

import { Module, Global } from '@nestjs/common';
import { GeofencingService } from './geofencing.service';
import { GeofencingController } from './geofencing.controller';

@Global()
@Module({
    providers: [GeofencingService],
    controllers: [GeofencingController],
    exports: [GeofencingService],
})
export class LocationModule { }
