import { Module } from '@nestjs/common';
import { ResourceMatchingService } from './resource-matching.service';

@Module({
    providers: [ResourceMatchingService],
    exports: [ResourceMatchingService],
})
export class ResourceMatchingModule { }
