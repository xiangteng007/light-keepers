import { Module } from '@nestjs/common';
import { LineNotifyService } from './line-notify.service';

@Module({
    providers: [LineNotifyService],
    exports: [LineNotifyService],
})
export class LineNotifyModule { }
