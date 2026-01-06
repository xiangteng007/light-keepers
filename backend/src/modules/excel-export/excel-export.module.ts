import { Module } from '@nestjs/common';
import { ExcelExportService } from './excel-export.service';
import { ExcelExportController } from './excel-export.controller';

@Module({
    controllers: [ExcelExportController],
    providers: [ExcelExportService],
    exports: [ExcelExportService],
})
export class ExcelExportModule { }
