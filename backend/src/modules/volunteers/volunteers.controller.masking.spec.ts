/**
 * VolunteersController × SensitiveDataInterceptor 整合測試 (F-M2)
 *
 * 走完整 HTTP pipeline（controller -> interceptor -> 序列化），
 * 驗證 roleLevel 不同時實際回傳到 client 的 payload 是否正確遮罩。
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';
import { CoreJwtGuard } from '../shared/guards/core-jwt.guard';
import { UnifiedRolesGuard } from '../shared/guards/unified-roles.guard';

const SELF_ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222';

/** 他人的志工資料（完整個資） */
const OTHER_VOLUNTEER = {
    id: 'v-other',
    accountId: OTHER_ACCOUNT_ID,
    name: '陳小華',
    idNumber: 'A123456789',
    birthDate: '1990-01-15',
    phone: '0912345678',
    email: 'hua@example.com',
    address: '台北市大安區復興南路一段100號',
    emergencyContactName: '陳大明',
    emergencyContactPhone: '0987654321',
    region: '台北市',
    status: 'available',
    serviceHours: 120,
};

/** 呼叫者本人的志工資料 */
const SELF_VOLUNTEER = {
    id: 'v-self',
    accountId: SELF_ACCOUNT_ID,
    name: '我本人',
    idNumber: 'B987654321',
    phone: '0911222333',
    email: 'me@example.com',
    address: '新北市板橋區文化路二段10號',
    region: '新北市',
    status: 'available',
};

describe('VolunteersController - 敏感資料遮罩整合測試', () => {
    let app: INestApplication;
    let currentUser: Record<string, unknown> | undefined;

    const mockService = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        findAvailable: jest.fn(),
        findEligible: jest.fn(),
        findPending: jest.fn(),
        findApproved: jest.fn(),
        getPendingCount: jest.fn(),
        getStats: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateStatus: jest.fn(),
        approve: jest.fn(),
        reject: jest.fn(),
        delete: jest.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [VolunteersController],
            providers: [{ provide: VolunteersService, useValue: mockService }],
        })
            // 模擬 CoreJwtGuard：把測試指定的 user 掛到 request 上
            .overrideGuard(CoreJwtGuard)
            .useValue({
                canActivate: (context: {
                    switchToHttp: () => { getRequest: () => Record<string, unknown> };
                }) => {
                    context.switchToHttp().getRequest().user = currentUser;
                    return true;
                },
            })
            .overrideGuard(UnifiedRolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    afterEach(() => jest.clearAllMocks());

    // ============================================================
    // L1 讀他人 → 遮罩
    // ============================================================
    describe('L1 志工讀取他人資料', () => {
        beforeEach(() => {
            currentUser = { sub: SELF_ACCOUNT_ID, id: SELF_ACCOUNT_ID, roleLevel: 1 };
        });

        it('GET /volunteers/:id 個資欄位全部遮罩', async () => {
            mockService.findOne.mockResolvedValue({ ...OTHER_VOLUNTEER });

            const res = await request(app.getHttpServer())
                .get('/volunteers/v-other')
                .expect(200);

            const data = res.body.data;
            expect(data.idNumber).toBe('A****');
            expect(data.phone).toBe('09**-***-**8');
            expect(data.address).toBe('台北市大安區***');
            expect(data.email).toBe('h***@example.com');
            expect(data.birthDate).toBe('1990-**-**');
            expect(data.emergencyContactName).toBe('陳**');
            expect(data.emergencyContactPhone).toBe('09**-***-**1');

            // 非個資欄位維持原樣，不影響營運可用性
            expect(data.name).toBe('陳小華');
            expect(data.region).toBe('台北市');
            expect(data.status).toBe('available');
            expect(data.serviceHours).toBe(120);
        });

        it('GET /volunteers 列表每一筆都遮罩，且外層 envelope 不受影響', async () => {
            mockService.findAll.mockResolvedValue([
                { ...OTHER_VOLUNTEER },
                { ...OTHER_VOLUNTEER, id: 'v-other-2', phone: '0955667788', idNumber: 'C111222333' },
            ]);

            const res = await request(app.getHttpServer())
                .get('/volunteers')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(2);
            expect(res.body.data[0].phone).toBe('09**-***-**8');
            expect(res.body.data[0].idNumber).toBe('A****');
            expect(res.body.data[1].phone).toBe('09**-***-**8');
            expect(res.body.data[1].idNumber).toBe('C****');
        });

        it('本人那筆不遮罩，同一份列表中的他人仍遮罩', async () => {
            mockService.findAll.mockResolvedValue([
                { ...SELF_VOLUNTEER },
                { ...OTHER_VOLUNTEER },
            ]);

            const res = await request(app.getHttpServer())
                .get('/volunteers')
                .expect(200);

            const [self, other] = res.body.data;

            // 本人：原文
            expect(self.idNumber).toBe('B987654321');
            expect(self.phone).toBe('0911222333');
            expect(self.email).toBe('me@example.com');
            expect(self.address).toBe('新北市板橋區文化路二段10號');

            // 他人：遮罩
            expect(other.idNumber).toBe('A****');
            expect(other.phone).toBe('09**-***-**8');
        });

        it('service 回傳的原始物件不會被就地竄改', async () => {
            const source = { ...OTHER_VOLUNTEER };
            mockService.findOne.mockResolvedValue(source);

            await request(app.getHttpServer()).get('/volunteers/v-other').expect(200);

            expect(source.phone).toBe('0912345678');
            expect(source.idNumber).toBe('A123456789');
        });
    });

    // ============================================================
    // L3 → 原文
    // ============================================================
    describe('L3 常務理事讀取他人資料', () => {
        beforeEach(() => {
            currentUser = { sub: SELF_ACCOUNT_ID, id: SELF_ACCOUNT_ID, roleLevel: 3 };
        });

        it('GET /volunteers/:id 回傳完整原文', async () => {
            mockService.findOne.mockResolvedValue({ ...OTHER_VOLUNTEER });

            const res = await request(app.getHttpServer())
                .get('/volunteers/v-other')
                .expect(200);

            const data = res.body.data;
            expect(data.idNumber).toBe('A123456789');
            expect(data.phone).toBe('0912345678');
            expect(data.address).toBe('台北市大安區復興南路一段100號');
            expect(data.email).toBe('hua@example.com');
            expect(data.emergencyContactPhone).toBe('0987654321');
        });

        it('GET /volunteers 列表回傳完整原文', async () => {
            mockService.findAll.mockResolvedValue([{ ...OTHER_VOLUNTEER }]);

            const res = await request(app.getHttpServer())
                .get('/volunteers')
                .expect(200);

            expect(res.body.data[0].phone).toBe('0912345678');
            expect(res.body.data[0].idNumber).toBe('A123456789');
        });
    });

    // ============================================================
    // L2 幹部（仍低於門檻）
    // ============================================================
    describe('L2 幹部讀取他人資料', () => {
        it('仍然遮罩（門檻為 L3）', async () => {
            currentUser = { sub: SELF_ACCOUNT_ID, id: SELF_ACCOUNT_ID, roleLevel: 2 };
            mockService.findOne.mockResolvedValue({ ...OTHER_VOLUNTEER });

            const res = await request(app.getHttpServer())
                .get('/volunteers/v-other')
                .expect(200);

            expect(res.body.data.idNumber).toBe('A****');
            expect(res.body.data.phone).toBe('09**-***-**8');
        });
    });
});
