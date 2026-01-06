import { Module } from '@nestjs/common';
import { ArNavigationService } from './ar-navigation.service';

@Module({
    providers: [ArNavigationService],
    exports: [ArNavigationService],
})
export class ArNavigationModule { }
