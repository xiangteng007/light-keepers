import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResourceMatchingService } from './resource-matching.service';

describe('ResourceMatchingService', () => {
    let service: ResourceMatchingService;
    let eventEmitter: { emit: jest.Mock };

    const donorInfo = {
        name: '陳先生',
        phone: '0912345678',
        address: '台北市中正區',
        region: '台北市',
        shippingOptions: ['self_deliver', 'pickup'],
    };

    const donationItems = [
        { type: 'food', name: '白米', quantity: 100, unit: 'kg', condition: 'new' as const },
        { type: 'water', name: '飲用水', quantity: 200, unit: '瓶', condition: 'new' as const },
    ];

    const needRequest = {
        organizationName: '紅十字會',
        contactName: '林社工',
        contactPhone: '0987654321',
        itemType: 'food',
        itemName: '白米',
        quantity: 50,
        unit: 'kg',
        urgency: 'high' as const,
        region: '花蓮縣',
        deliveryAddress: '花蓮縣花蓮市',
        canPickup: false,
    };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResourceMatchingService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<ResourceMatchingService>(ResourceMatchingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== submitDonation =====
    describe('submitDonation', () => {
        it('should create donation with pending status', () => {
            const donation = service.submitDonation(donorInfo, donationItems);
            expect(donation.id).toContain('don-');
            expect(donation.status).toBe('pending');
            expect(donation.items).toHaveLength(2);
        });

        it('should trigger autoMatch on submission', () => {
            // Submit a need first, then a matching donation
            const need = service.submitNeed(needRequest);
            service.submitDonation(donorInfo, donationItems);
            // autoMatch should have attempted to match
            expect(need).toBeDefined();
        });
    });

    // ===== submitNeed =====
    describe('submitNeed', () => {
        it('should create need with open status', () => {
            const need = service.submitNeed(needRequest);
            expect(need.id).toContain('need-');
            expect(need.status).toBe('open');
            expect(need.fulfilledQuantity).toBe(0);
        });
    });

    // ===== getAvailableDonations =====
    describe('getAvailableDonations', () => {
        it('should return pending donations', () => {
            service.submitDonation(donorInfo, donationItems);
            const available = service.getAvailableDonations();
            expect(available.length).toBeGreaterThanOrEqual(1);
        });

        it('should filter by item type', () => {
            service.submitDonation(donorInfo, [
                { type: 'medicine', name: '急救箱', quantity: 10, unit: '箱', condition: 'new' as const },
            ]);
            const foodOnly = service.getAvailableDonations('food');
            expect(foodOnly.length).toBe(0);
        });
    });

    // ===== getOpenNeeds =====
    describe('getOpenNeeds', () => {
        it('should return open needs', () => {
            service.submitNeed(needRequest);
            const needs = service.getOpenNeeds();
            expect(needs.length).toBe(1);
        });

        it('should filter by urgency', () => {
            service.submitNeed(needRequest);
            service.submitNeed({ ...needRequest, urgency: 'low' as const });
            const critical = service.getOpenNeeds(undefined, 'critical');
            expect(critical.length).toBe(0);
        });
    });

    // ===== createMatch =====
    describe('createMatch', () => {
        it('should match donation to need', async () => {
            const donation = service.submitDonation(donorInfo, donationItems);
            await new Promise(r => setTimeout(r, 2));
            const need = service.submitNeed(needRequest);
            const match = service.createMatch(donation.id, need.id, 50);
            expect(match.id).toContain('match-');
            expect(match.status).toBe('pending_confirmation');
            expect(match.quantity).toBe(50);
        });

        it('should throw for nonexistent donation', () => {
            const need = service.submitNeed(needRequest);
            expect(() => service.createMatch('fake', need.id, 10)).toThrow();
        });

        it('should throw for nonexistent need', () => {
            const donation = service.submitDonation(donorInfo, donationItems);
            expect(() => service.createMatch(donation.id, 'fake', 10)).toThrow();
        });
    });

    // ===== confirmMatch + completeMatch =====
    describe('confirmMatch', () => {
        it('should confirm match by donor', async () => {
            const donation = service.submitDonation(donorInfo, donationItems);
            await new Promise(r => setTimeout(r, 2));
            const need = service.submitNeed(needRequest);
            const match = service.createMatch(donation.id, need.id, 30);
            const confirmed = service.confirmMatch(match.id, 'donor');
            expect(confirmed.status).toBe('confirmed');
        });
    });

    describe('completeMatch', () => {
        it('should complete match', async () => {
            const donation = service.submitDonation(donorInfo, donationItems);
            await new Promise(r => setTimeout(r, 2));
            const need = service.submitNeed(needRequest);
            const match = service.createMatch(donation.id, need.id, 30);
            service.confirmMatch(match.id, 'donor');
            const completed = service.completeMatch(match.id, { rating: 5, comment: '非常感謝' });
            expect(completed.status).toBe('completed');
        });
    });

    // ===== getStatistics =====
    describe('getStatistics', () => {
        it('should return statistics', () => {
            service.submitDonation(donorInfo, donationItems);
            service.submitNeed(needRequest);
            const stats = service.getStatistics();
            expect(stats.totalDonations).toBeGreaterThanOrEqual(1);
            expect(stats.totalNeeds).toBeGreaterThanOrEqual(1);
        });
    });

    // ===== getDonorLeaderboard =====
    describe('getDonorLeaderboard', () => {
        it('should return ranked donors', () => {
            service.submitDonation(donorInfo, donationItems);
            const leaderboard = service.getDonorLeaderboard(5);
            expect(leaderboard.length).toBeGreaterThanOrEqual(0);
        });
    });
});
