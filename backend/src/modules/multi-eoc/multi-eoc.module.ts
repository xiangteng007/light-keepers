import { Module } from '@nestjs/common';
import { MultiEocService } from './multi-eoc.service';

@Module({
    providers: [MultiEocService],
    exports: [MultiEocService],
})
export class MultiEocModule { }
