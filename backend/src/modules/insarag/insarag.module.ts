import { Module } from '@nestjs/common';
import { InsaragService } from './insarag.service';

@Module({
    providers: [InsaragService],
    exports: [InsaragService],
})
export class InsaragModule { }
