import { Module } from '@nestjs/common';
import { PowerBiService } from './power-bi.service';

@Module({
    providers: [PowerBiService],
    exports: [PowerBiService],
})
export class PowerBiModule { }
