import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity, ActivityRegistration } from './activities.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
    imports: [TypeOrmModule.forFeature([Activity, ActivityRegistration])],
    controllers: [ActivitiesController],
    providers: [ActivitiesService],
    exports: [ActivitiesService],
})
export class ActivitiesModule { }
