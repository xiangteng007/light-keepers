import { Module } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfGeneratorController } from './pdf-generator.controller';

@Module({
    controllers: [PdfGeneratorController],
    providers: [PdfGeneratorService],
    exports: [PdfGeneratorService],
})
export class PdfGeneratorModule { }
