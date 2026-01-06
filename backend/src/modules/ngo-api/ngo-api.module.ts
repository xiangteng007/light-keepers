import { Module } from '@nestjs/common';
import { NgoApiService } from './ngo-api.service';

@Module({
    providers: [NgoApiService],
    exports: [NgoApiService],
})
export class NgoApiModule { }
