import { Module } from '@nestjs/common';
import { ShiftCalendarService } from './shift-calendar.service';
import { ShiftCalendarController } from './shift-calendar.controller';

@Module({
    controllers: [ShiftCalendarController],
    providers: [ShiftCalendarService],
    exports: [ShiftCalendarService],
})
export class ShiftCalendarModule { }
