import { Module } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';

@Module({
    providers: [OrgChartService],
    exports: [OrgChartService],
})
export class OrgChartModule { }
