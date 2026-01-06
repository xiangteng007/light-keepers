import { Module } from '@nestjs/common';
import { VolunteerPointsService } from './volunteer-points.service';
import { VolunteerPointsController } from './volunteer-points.controller';

@Module({
    providers: [VolunteerPointsService],
    controllers: [VolunteerPointsController],
    exports: [VolunteerPointsService],
})
export class VolunteerPointsModule { }
