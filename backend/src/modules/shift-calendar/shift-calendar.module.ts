import { Module } from '@nestjs/common';
import { ShiftCalendarService } from './shift-calendar.service';

@Module({
    providers: [ShiftCalendarService],
    exports: [ShiftCalendarService],
})
export class ShiftCalendarModule { }
