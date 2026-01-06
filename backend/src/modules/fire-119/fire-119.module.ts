import { Module } from '@nestjs/common';
import { Fire119Service } from './fire-119.service';

@Module({
    providers: [Fire119Service],
    exports: [Fire119Service],
})
export class Fire119Module { }
