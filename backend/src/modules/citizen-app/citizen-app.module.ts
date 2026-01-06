import { Module } from '@nestjs/common';
import { CitizenAppService } from './citizen-app.service';

@Module({
    providers: [CitizenAppService],
    exports: [CitizenAppService],
})
export class CitizenAppModule { }
