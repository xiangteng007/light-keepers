import { FlexMessageService } from './flex-message.service';

describe('FlexMessageService', () => {
    let service: FlexMessageService;

    beforeEach(() => {
        service = new FlexMessageService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createTaskNotification', () => {
        it('should create task notification flex message', () => {
            const msg = service.createTaskNotification({
                id: 'task-1',
                title: '巡視受災區',
                description: '需前往信義區進行巡視',
                priority: 'high',
                location: '信義區',
                deadline: new Date('2026-02-15'),
                assigneeName: '志工A',
            });
            expect(msg.type).toBe('flex');
            expect(msg.altText).toBeDefined();
            expect(msg.contents).toBeDefined();
        });

        it('should handle critical priority', () => {
            const msg = service.createTaskNotification({
                id: 'task-2',
                title: '緊急搶修',
                description: '水管破裂',
                priority: 'critical',
                location: '大安區',
            });
            expect(msg.type).toBe('flex');
        });
    });

    describe('createWeatherAlert', () => {
        it('should create weather alert flex message', () => {
            const msg = service.createWeatherAlert({
                type: '豪雨特報',
                title: '大雨特報',
                description: '預計降雨量超過 200mm',
                areas: ['台北市', '新北市'],
                severity: 'warning',
                startTime: new Date(),
            });
            expect(msg.type).toBe('flex');
            expect(msg.altText).toContain('大雨特報');
        });
    });

    describe('createCheckinConfirmation', () => {
        it('should create check-in confirmation', () => {
            const msg = service.createCheckinConfirmation({
                name: '志工小明',
                action: 'in',
                time: new Date(),
                location: '信義區指揮所',
            });
            expect(msg.type).toBe('flex');
        });

        it('should create check-out confirmation with hours', () => {
            const msg = service.createCheckinConfirmation({
                name: '志工小明',
                action: 'out',
                time: new Date(),
                hoursWorked: 4.5,
            });
            expect(msg.type).toBe('flex');
        });
    });

    describe('createResourceStatusCarousel', () => {
        it('should create resource carousel', () => {
            const msg = service.createResourceStatusCarousel([
                { name: '飲用水', quantity: 500, unit: '瓶', status: 'normal', location: '倉庫A' },
                { name: '急救包', quantity: 5, unit: '個', status: 'critical', location: '倉庫B' },
            ]);
            expect(msg.type).toBe('flex');
            expect(msg.contents.type).toBe('carousel');
        });
    });

    describe('createQuickReplyItems', () => {
        it('should create quick reply options', () => {
            const qr = service.createQuickReplyItems([
                { label: '確認', text: '確認' },
                { label: '取消', text: '取消' },
            ]);
            expect(qr.items.length).toBe(2);
        });
    });

    describe('formatDate', () => {
        it('should format date in zh-TW', () => {
            const result = (service as any).formatDate(new Date('2026-02-10'));
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('formatDateTime', () => {
        it('should format datetime', () => {
            const result = (service as any).formatDateTime(new Date('2026-02-10T14:30:00'));
            expect(result).toBeDefined();
        });
    });
});
