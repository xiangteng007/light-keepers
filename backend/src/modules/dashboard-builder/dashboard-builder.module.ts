import { Module } from '@nestjs/common';
import { DashboardBuilderService } from './dashboard-builder.service';

@Module({
    providers: [DashboardBuilderService],
    exports: [DashboardBuilderService],
})
export class DashboardBuilderModule { }
