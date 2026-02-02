import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LineLiffService } from './line-liff.service';
import { LineLiffController } from './line-liff.controller';

@Module({
    imports: [ConfigModule],
    controllers: [LineLiffController],
    providers: [LineLiffService],
    exports: [LineLiffService],
})
export class LineLiffModule { }

