import { Module } from '@nestjs/common';
import { PublicFinanceService } from './public-finance.service';

@Module({
    providers: [PublicFinanceService],
    exports: [PublicFinanceService],
})
export class PublicFinanceModule { }
