import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { Donor } from './donor.entity';
import { Donation } from './donation.entity';
import { Receipt } from './receipt.entity';

describe('DonationsService', () => {
    let service: DonationsService;
    let donorRepo: any;
    let donationRepo: any;
    let receiptRepo: any;

    const mockDonor: Partial<Donor> = {
        id: 'donor-1',
        type: 'individual' as any,
        name: '王小明',
        email: 'donor@example.com',
        isAnonymous: false,
        wantsReceipt: true,
        totalDonationAmount: 5000,
        totalDonationCount: 2,
    };

    const mockDonation: Partial<Donation> = {
        id: 'donation-1',
        donorId: 'donor-1',
        amount: 1000,
        paymentMethod: 'credit_card',
        donationType: 'one_time',
        merchantTradeNo: 'LK20260101001',
        status: 'pending',
        donor: mockDonor as Donor,
    };

    const mockReceipt: Partial<Receipt> = {
        id: 'receipt-1',
        donationId: 'donation-1',
        receiptNo: 'LKR-2026-00001',
        donorName: '王小明',
        amount: 1000,
        status: 'issued',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DonationsService,
                {
                    provide: getRepositoryToken(Donor),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'donor-1', ...dto })),
                        save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
                        find: jest.fn().mockResolvedValue([mockDonor]),
                        findOne: jest.fn().mockResolvedValue(mockDonor),
                        findAndCount: jest.fn().mockResolvedValue([[mockDonor], 1]),
                        count: jest.fn().mockResolvedValue(10),
                        update: jest.fn().mockResolvedValue({ affected: 1 }),
                        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
                    },
                },
                {
                    provide: getRepositoryToken(Donation),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'donation-1', ...dto })),
                        save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
                        find: jest.fn().mockResolvedValue([
                            { ...mockDonation, status: 'paid', amount: 1000, paidAt: new Date(), paymentMethod: 'credit_card' },
                        ]),
                        findOne: jest.fn().mockResolvedValue(mockDonation),
                        findAndCount: jest.fn().mockResolvedValue([[mockDonation], 1]),
                        count: jest.fn().mockResolvedValue(5),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            take: jest.fn().mockReturnThis(),
                            skip: jest.fn().mockReturnThis(),
                            getManyAndCount: jest.fn().mockResolvedValue([[mockDonation], 1]),
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(Receipt),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'receipt-1', ...dto })),
                        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
                        find: jest.fn().mockResolvedValue([mockReceipt]),
                        findOne: jest.fn().mockResolvedValue(mockReceipt),
                        count: jest.fn().mockResolvedValue(1),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            getOne: jest.fn().mockResolvedValue(null),
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<DonationsService>(DonationsService);
        donorRepo = module.get(getRepositoryToken(Donor));
        donationRepo = module.get(getRepositoryToken(Donation));
        receiptRepo = module.get(getRepositoryToken(Receipt));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Donor CRUD =====
    describe('createDonor', () => {
        it('should create a donor', async () => {
            const dto = { type: 'individual' as const, name: '王小明', email: 'donor@example.com' };
            const result = await service.createDonor(dto as any);
            expect(donorRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    describe('findDonorById', () => {
        it('should return donor', async () => {
            const result = await service.findDonorById('donor-1');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            donorRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findDonorById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findDonorByEmail', () => {
        it('should return donor by email', async () => {
            const result = await service.findDonorByEmail('donor@example.com');
            expect(result).toBeDefined();
        });
    });

    describe('getAllDonors', () => {
        it('should return paginated donors', async () => {
            const result = await service.getAllDonors({ limit: 10, offset: 0 });
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
        });
    });

    describe('updateDonor', () => {
        it('should update donor', async () => {
            const result = await service.updateDonor('donor-1', { name: '新名稱' });
            expect(result).toBeDefined();
        });
    });

    describe('deleteDonor', () => {
        it('should mark donor as deleted via save', async () => {
            await service.deleteDonor('donor-1');
            expect(donorRepo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException', async () => {
            donorRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.deleteDonor('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== Donation =====
    describe('createDonation', () => {
        it('should create donation with existing donor', async () => {
            const dto = { donorId: 'donor-1', amount: 1000, paymentMethod: 'credit_card' };
            const result = await service.createDonation(dto as any);
            expect(donationRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw if no donor info', async () => {
            await expect(service.createDonation({ amount: 1000, paymentMethod: 'credit_card' } as any))
                .rejects.toThrow();
        });
    });

    describe('confirmPayment', () => {
        it('should confirm payment and update status', async () => {
            const result = await service.confirmPayment('LK20260101001', 'txn-123');
            expect(result.status).toBe('paid');
            expect(result.transactionId).toBe('txn-123');
        });

        it('should throw NotFoundException for unknown merchantTradeNo', async () => {
            donationRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.confirmPayment('INVALID', 'txn')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getDonation', () => {
        it('should return donation', async () => {
            const result = await service.getDonation('donation-1');
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            donationRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.getDonation('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getDonations', () => {
        it('should return paginated donations', async () => {
            const result = await service.getDonations({ limit: 10, offset: 0 });
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
        });
    });

    // ===== Receipt =====
    describe('issueReceipt', () => {
        it('should issue receipt for donation', async () => {
            donationRepo.findOne.mockResolvedValueOnce({ ...mockDonation, receiptId: null });
            receiptRepo.count.mockResolvedValueOnce(0);
            const result = await service.issueReceipt('donation-1');
            expect(receiptRepo.create).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should reject if receipt already issued', async () => {
            donationRepo.findOne.mockResolvedValueOnce({ ...mockDonation, receiptId: 'receipt-1' });
            await expect(service.issueReceipt('donation-1')).rejects.toThrow();
        });
    });

    describe('cancelReceipt', () => {
        it('should cancel receipt', async () => {
            const result = await service.cancelReceipt('receipt-1', '作廢原因');
            expect(result.status).toBe('cancelled');
        });
    });

    describe('getReceiptsByYear', () => {
        it('should return receipts for year', async () => {
            const result = await service.getReceiptsByYear(2026);
            expect(result).toEqual([mockReceipt]);
        });
    });

    // ===== Stats =====
    describe('getStats', () => {
        it('should return donation statistics', async () => {
            const result = await service.getStats();
            expect(result).toHaveProperty('totalDonations');
            expect(result).toHaveProperty('totalAmount');
            expect(result).toHaveProperty('donorCount');
            expect(result).toHaveProperty('byPaymentMethod');
        });
    });
});
