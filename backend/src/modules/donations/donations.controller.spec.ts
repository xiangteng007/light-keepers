import { Test, TestingModule } from '@nestjs/testing';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DonationsController', () => {
    let controller: DonationsController;
    let donationsService: jest.Mocked<Partial<DonationsService>>;

    const mockDonor = { id: 'd1', name: '王小明', email: 'wang@test.com' };
    const mockDonation = { id: 'dn1', amount: 1000, status: 'pending' };
    const mockReceipt = { id: 'r1', receiptNo: 'R-2026-001', amount: 1000 };

    beforeEach(async () => {
        donationsService = {
            getStats: jest.fn().mockResolvedValue({ totalAmount: 50000, donorCount: 10 }),
            getAllDonors: jest.fn().mockResolvedValue({ data: [mockDonor], total: 1 }),
            findDonorById: jest.fn().mockResolvedValue(mockDonor),
            createDonor: jest.fn().mockResolvedValue(mockDonor),
            getDonations: jest.fn().mockResolvedValue({ data: [mockDonation], total: 1 }),
            getDonation: jest.fn().mockResolvedValue(mockDonation),
            createDonation: jest.fn().mockResolvedValue(mockDonation),
            confirmPayment: jest.fn().mockResolvedValue({ ...mockDonation, status: 'completed' }),
            issueReceipt: jest.fn().mockResolvedValue(mockReceipt),
            cancelReceipt: jest.fn().mockResolvedValue({ ...mockReceipt, status: 'cancelled' }),
            getReceiptsByYear: jest.fn().mockResolvedValue([mockReceipt]),
            getReceiptById: jest.fn().mockResolvedValue(mockReceipt),
            exportDonationsCsv: jest.fn().mockResolvedValue('header\nrow'),
            updateDonor: jest.fn().mockResolvedValue({ ...mockDonor, name: '王大明' }),
            deleteDonor: jest.fn().mockResolvedValue(undefined),
        };

        const receiptPdfService = {
            generateReceiptPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-data')),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DonationsController],
            providers: [
                { provide: DonationsService, useValue: donationsService },
                { provide: ReceiptPdfService, useValue: receiptPdfService },
            ],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DonationsController>(DonationsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('getStats returns donation statistics', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
        expect(result.data.totalAmount).toBe(50000);
    });

    it('getDonors returns donors list', async () => {
        const result = await controller.getDonors('10', '0');
        expect(result.success).toBe(true);
    });

    it('getDonor returns single donor', async () => {
        const result = await controller.getDonor('d1');
        expect(result.data).toEqual(mockDonor);
    });

    it('createDonor creates new donor', async () => {
        const result = await controller.createDonor({ name: '王小明' } as any);
        expect(result.message).toContain('建立');
    });

    it('getDonations returns donations list', async () => {
        const result = await controller.getDonations();
        expect(result.success).toBe(true);
    });

    it('createDonation creates new donation', async () => {
        const result = await controller.createDonation({ amount: 1000 } as any);
        expect(result.message).toContain('付款');
    });

    it('confirmPayment confirms donation payment', async () => {
        const result = await controller.confirmPayment({ merchantTradeNo: 'MTN001', transactionId: 'TXN001' });
        expect(result.message).toContain('確認');
    });

    it('issueReceipt issues receipt for donation', async () => {
        const result = await controller.issueReceipt('dn1');
        expect(result.message).toContain('收據');
    });

    it('cancelReceipt cancels receipt', async () => {
        const result = await controller.cancelReceipt('r1', { reason: '開錯金額' });
        expect(result.message).toContain('作廢');
    });

    it('getReceiptsByYear returns annual receipts', async () => {
        const result = await controller.getReceiptsByYear('2026');
        expect(result.count).toBe(1);
    });

    it('updateDonor updates donor info', async () => {
        const result = await controller.updateDonor('d1', { name: '王大明' });
        expect(result.message).toContain('更新');
    });

    it('deleteDonor deletes donor', async () => {
        const result = await controller.deleteDonor('d1');
        expect(result.message).toContain('刪除');
    });
});
