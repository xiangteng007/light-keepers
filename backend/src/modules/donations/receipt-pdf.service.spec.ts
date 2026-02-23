import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptPdfService } from './receipt-pdf.service';

// Mock pdfkit
jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => {
        const events: Record<string, Function[]> = {};
        return {
            on: jest.fn((event: string, handler: Function) => {
                events[event] = events[event] || [];
                events[event].push(handler);
            }),
            fontSize: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            moveDown: jest.fn().mockReturnThis(),
            moveTo: jest.fn().mockReturnThis(),
            lineTo: jest.fn().mockReturnThis(),
            stroke: jest.fn().mockReturnThis(),
            fillColor: jest.fn().mockReturnThis(),
            end: jest.fn(function (this: any) {
                // Emit data + end events
                const dataHandlers = events['data'] || [];
                const endHandlers = events['end'] || [];
                dataHandlers.forEach(h => h(Buffer.from('mock-pdf-data')));
                endHandlers.forEach(h => h());
            }),
            y: 100,
        };
    });
});

describe('ReceiptPdfService', () => {
    let service: ReceiptPdfService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ReceiptPdfService],
        }).compile();

        service = module.get<ReceiptPdfService>(ReceiptPdfService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateReceiptPdf', () => {
        const mockReceipt = {
            receiptNo: 'R-2024-001',
            donorName: '王大明',
            donorIdentity: 'A123456789',
            amount: 10000,
            purpose: '災害救助',
            issuedAt: new Date('2024-03-15'),
        };

        it('should generate PDF buffer', async () => {
            const buffer = await service.generateReceiptPdf(mockReceipt as any);
            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(0);
        });

        it('should accept custom organization name', async () => {
            const buffer = await service.generateReceiptPdf(mockReceipt as any, '測試基金會');
            expect(buffer).toBeInstanceOf(Buffer);
        });

        it('should use default org name', async () => {
            const buffer = await service.generateReceiptPdf(mockReceipt as any);
            expect(buffer).toBeInstanceOf(Buffer);
        });

        it('should handle receipt without optional fields', async () => {
            const minimalReceipt = {
                receiptNo: 'R-2024-002',
                donorName: '匿名捐款',
                donorIdentity: null,
                amount: 500,
                purpose: null,
                issuedAt: new Date(),
            };
            const buffer = await service.generateReceiptPdf(minimalReceipt as any);
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });
});
