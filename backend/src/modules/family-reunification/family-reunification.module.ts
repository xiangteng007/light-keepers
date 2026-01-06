import { Module } from '@nestjs/common';
import { FamilyReunificationService } from './family-reunification.service';
import { FamilyReunificationController } from './family-reunification.controller';

@Module({
    providers: [FamilyReunificationService],
    controllers: [FamilyReunificationController],
    exports: [FamilyReunificationService],
})
export class FamilyReunificationModule { }
