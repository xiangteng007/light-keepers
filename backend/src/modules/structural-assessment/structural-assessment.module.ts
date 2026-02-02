import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StructuralAssessmentController } from './structural-assessment.controller';
import { StructuralAssessmentService } from './structural-assessment.service';
import { StructuralAssessment } from './entities/structural-assessment.entity';

@Module({
    imports: [TypeOrmModule.forFeature([StructuralAssessment])],
    controllers: [StructuralAssessmentController],
    providers: [StructuralAssessmentService],
    exports: [StructuralAssessmentService],
})
export class StructuralAssessmentModule {}
