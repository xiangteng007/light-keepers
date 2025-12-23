import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingCourse } from './training-courses.entity';
import { VolunteerTraining } from './volunteer-training.entity';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
    imports: [TypeOrmModule.forFeature([TrainingCourse, VolunteerTraining])],
    controllers: [TrainingController],
    providers: [TrainingService],
    exports: [TrainingService],
})
export class TrainingModule { }
