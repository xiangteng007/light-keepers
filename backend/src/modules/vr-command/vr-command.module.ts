import { Module } from '@nestjs/common';
import { VrCommandService } from './vr-command.service';

@Module({
    providers: [VrCommandService],
    exports: [VrCommandService],
})
export class VrCommandModule { }
