import { Module } from '@nestjs/common';
import { WaterResourcesService } from './water-resources.service';

@Module({
    providers: [WaterResourcesService],
    exports: [WaterResourcesService],
})
export class WaterResourcesModule { }
