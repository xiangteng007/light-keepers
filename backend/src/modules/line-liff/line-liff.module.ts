import { Module } from '@nestjs/common';
import { LineLiffService } from './line-liff.service';

@Module({
    providers: [LineLiffService],
    exports: [LineLiffService],
})
export class LineLiffModule { }
