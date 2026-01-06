import { Module } from '@nestjs/common';
import { SatelliteCommService } from './satellite-comm.service';

@Module({
    providers: [SatelliteCommService],
    exports: [SatelliteCommService],
})
export class SatelliteCommModule { }
