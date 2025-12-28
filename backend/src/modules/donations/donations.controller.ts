import { Controller, Get, Post, Patch, Body, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { DonationsService, CreateDonorDto, CreateDonationDto } from './donations.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { DonationStatus } from './donation.entity';

@Controller('donations')
export class DonationsController {
    constructor(
        private readonly donationsService: DonationsService,
        private readonly receiptPdfService: ReceiptPdfService,
    ) { }

    // ==================== 捐款統計 (公開) ====================

    @Get('stats')
    async getStats() {
        const stats = await this.donationsService.getStats();
        return { success: true, data: stats };
    }

    // ==================== 捐款人管理 ====================

    @Get('donors')
    async getDonors(
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const result = await this.donationsService.getAllDonors({
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        return { success: true, ...result };
    }

    @Get('donors/:id')
    async getDonor(@Param('id') id: string) {
        const donor = await this.donationsService.findDonorById(id);
        return { success: true, data: donor };
    }

    @Post('donors')
    async createDonor(@Body() dto: CreateDonorDto) {
        const donor = await this.donationsService.createDonor(dto);
        return { success: true, message: '捐款人已建立', data: donor };
    }

    // ==================== 捐款處理 ====================

    @Get()
    async getDonations(
        @Query('status') status?: DonationStatus,
        @Query('donorId') donorId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const result = await this.donationsService.getDonations({
            status,
            donorId,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        return { success: true, ...result };
    }

    @Get(':id')
    async getDonation(@Param('id') id: string) {
        const donation = await this.donationsService.getDonation(id);
        return { success: true, data: donation };
    }

    @Post()
    async createDonation(@Body() dto: CreateDonationDto) {
        const donation = await this.donationsService.createDonation(dto);
        return {
            success: true,
            message: '捐款已建立，請完成付款',
            data: donation,
        };
    }

    // 付款確認 (來自金流 Webhook 或手動確認)
    @Post('confirm-payment')
    async confirmPayment(
        @Body() body: { merchantTradeNo: string; transactionId: string },
    ) {
        const donation = await this.donationsService.confirmPayment(
            body.merchantTradeNo,
            body.transactionId,
        );
        return { success: true, message: '付款已確認', data: donation };
    }

    // ==================== 收據管理 ====================

    @Post(':id/receipt')
    async issueReceipt(@Param('id') id: string) {
        const receipt = await this.donationsService.issueReceipt(id);
        return { success: true, message: '收據已開立', data: receipt };
    }

    @Patch('receipts/:receiptId/cancel')
    async cancelReceipt(
        @Param('receiptId') receiptId: string,
        @Body() body: { reason: string },
    ) {
        const receipt = await this.donationsService.cancelReceipt(receiptId, body.reason);
        return { success: true, message: '收據已作廢', data: receipt };
    }

    @Get('receipts/year/:year')
    async getReceiptsByYear(@Param('year') year: string) {
        const receipts = await this.donationsService.getReceiptsByYear(parseInt(year));
        return { success: true, data: receipts, count: receipts.length };
    }

    // ==================== PDF 收據下載 ====================

    @Get('receipts/:receiptId/pdf')
    async downloadReceiptPdf(
        @Param('receiptId') receiptId: string,
        @Res() res: Response,
    ) {
        const receipt = await this.donationsService.getReceiptById(receiptId);
        if (!receipt) {
            throw new NotFoundException(`收據 ${receiptId} 不存在`);
        }

        const pdfBuffer = await this.receiptPdfService.generateReceiptPdf(receipt);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${receipt.receiptNo}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });

        res.end(pdfBuffer);
    }
}

