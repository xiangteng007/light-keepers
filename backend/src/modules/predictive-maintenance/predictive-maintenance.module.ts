import { Module } from '@nestjs/common';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

@Module({
    providers: [PredictiveMaintenanceService],
    exports: [PredictiveMaintenanceService],
})
export class PredictiveMaintenanceModule { }
