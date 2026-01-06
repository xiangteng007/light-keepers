import { Module } from '@nestjs/common';
import { AutoDispatchService } from './auto-dispatch.service';

@Module({
    providers: [AutoDispatchService],
    exports: [AutoDispatchService],
})
export class AutoDispatchModule { }
