import { Module } from '@nestjs/common';
import { VolunteerCertificationService } from './volunteer-certification.service';

@Module({
    providers: [VolunteerCertificationService],
    exports: [VolunteerCertificationService],
})
export class VolunteerCertificationModule { }
