import { Module } from '@nestjs/common';
import { WaterResourcesService } from './water-resources.service';
import { WraProvider } from './providers/wra.provider';

@Module({
    providers: [WaterResourcesService, WraProvider],
    exports: [WaterResourcesService, WraProvider],
})
export class WaterResourcesModule { }

