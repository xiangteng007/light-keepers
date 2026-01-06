import { Module } from '@nestjs/common';
import { TimelineVisualizationService } from './timeline-visualization.service';

@Module({
    providers: [TimelineVisualizationService],
    exports: [TimelineVisualizationService],
})
export class TimelineVisualizationModule { }
