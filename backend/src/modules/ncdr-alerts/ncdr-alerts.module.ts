import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NcdrAlert } from './entities';
import { NcdrAlertsService } from './ncdr-alerts.service';
import { NcdrAlertsController } from './ncdr-alerts.controller';

@Module({
    imports: [TypeOrmModule.forFeature([NcdrAlert])],
    controllers: [NcdrAlertsController],
    providers: [NcdrAlertsService],
    exports: [NcdrAlertsService],
})
export class NcdrAlertsModule { }
