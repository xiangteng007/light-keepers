import { Module } from '@nestjs/common';
import { ExpenseReimbursementService } from './expense-reimbursement.service';

@Module({
    providers: [ExpenseReimbursementService],
    exports: [ExpenseReimbursementService],
})
export class ExpenseReimbursementModule { }
