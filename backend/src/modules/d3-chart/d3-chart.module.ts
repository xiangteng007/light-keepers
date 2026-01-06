import { Module } from '@nestjs/common';
import { D3ChartService } from './d3-chart.service';

@Module({
    providers: [D3ChartService],
    exports: [D3ChartService],
})
export class D3ChartModule { }
