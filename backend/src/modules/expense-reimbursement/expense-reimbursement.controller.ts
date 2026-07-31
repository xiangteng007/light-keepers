import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { ExpenseReimbursementService } from './expense-reimbursement.service';

// 定級理由：經費核銷屬財務流程，必須維持「申請 / 審核 / 撥款」職權分立，不可由同一等級一手包辦。
// 提交申請與查閱本人報銷紀錄為第一線志工墊付後的權利 → L1；
// 審核（reviewClaim）為財務把關 → L3；標記已付款（markAsPaid）等同確認金流出帳 → L4（理事長）；
// 待審清單與統計會揭露全會經費流向 → L3。class 基準取 L3。
@ApiTags('Expense 經費核銷')
@Controller('api/expenses')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.DIRECTOR)
export class ExpenseReimbursementController {
    constructor(private readonly expenseService: ExpenseReimbursementService) { }

    @Post()
    @ApiOperation({ summary: '提交報銷', description: '提交經費報銷申請' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    submitClaim(@Body() body: any): any {
        return this.expenseService.submitClaim(body);
    }

    @Post(':id/review')
    @ApiOperation({ summary: '審核報銷', description: '審核經費報銷' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    reviewClaim(@Param('id') id: string, @Body() body: any): any {
        return this.expenseService.reviewClaim(id, body);
    }

    @Post(':id/pay')
    @ApiOperation({ summary: '標記已付款', description: '標記報銷已付款' })
    @RequiredLevel(ROLE_LEVELS.CHAIRMAN)
    markAsPaid(@Param('id') id: string, @Body() body: any): any {
        return this.expenseService.markAsPaid(id, body);
    }

    @Get('pending')
    @ApiOperation({ summary: '待審核清單', description: '取得待審核的報銷' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getPending(@Query('reviewerId') reviewerId?: string): any {
        return this.expenseService.getPendingClaims(reviewerId);
    }

    @Get('submitter/:id')
    @ApiOperation({ summary: '個人報銷紀錄', description: '取得特定人員的報銷紀錄' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getBySubmitter(@Param('id') id: string): any {
        return this.expenseService.getClaimsBySubmitter(id);
    }

    @Get('stats')
    @ApiOperation({ summary: '報銷統計', description: '取得報銷統計' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    getStats(@Query('from') from: string, @Query('to') to: string): any {
        return this.expenseService.getExpenseStats({ from: new Date(from), to: new Date(to) });
    }

    @Get('categories')
    @ApiOperation({ summary: '支出類別', description: '取得支出類別設定' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getCategories(): any {
        return this.expenseService.getExpenseCategories();
    }
}
