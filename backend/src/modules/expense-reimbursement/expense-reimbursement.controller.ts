import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExpenseReimbursementService } from './expense-reimbursement.service';

@ApiTags('Expense 經費核銷')
@Controller('api/expenses')
export class ExpenseReimbursementController {
    constructor(private readonly expenseService: ExpenseReimbursementService) { }

    @Post()
    @ApiOperation({ summary: '提交報銷', description: '提交經費報銷申請' })
    submitClaim(@Body() body: any): any {
        return this.expenseService.submitClaim(body);
    }

    @Post(':id/review')
    @ApiOperation({ summary: '審核報銷', description: '審核經費報銷' })
    reviewClaim(@Param('id') id: string, @Body() body: any): any {
        return this.expenseService.reviewClaim(id, body);
    }

    @Post(':id/pay')
    @ApiOperation({ summary: '標記已付款', description: '標記報銷已付款' })
    markAsPaid(@Param('id') id: string, @Body() body: any): any {
        return this.expenseService.markAsPaid(id, body);
    }

    @Get('pending')
    @ApiOperation({ summary: '待審核清單', description: '取得待審核的報銷' })
    getPending(@Query('reviewerId') reviewerId?: string): any {
        return this.expenseService.getPendingClaims(reviewerId);
    }

    @Get('submitter/:id')
    @ApiOperation({ summary: '個人報銷紀錄', description: '取得特定人員的報銷紀錄' })
    getBySubmitter(@Param('id') id: string): any {
        return this.expenseService.getClaimsBySubmitter(id);
    }

    @Get('stats')
    @ApiOperation({ summary: '報銷統計', description: '取得報銷統計' })
    getStats(@Query('from') from: string, @Query('to') to: string): any {
        return this.expenseService.getExpenseStats({ from: new Date(from), to: new Date(to) });
    }

    @Get('categories')
    @ApiOperation({ summary: '支出類別', description: '取得支出類別設定' })
    getCategories(): any {
        return this.expenseService.getExpenseCategories();
    }
}
