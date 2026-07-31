/**
 * SensitiveDataInterceptor 單元測試 (F-M2)
 */

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import {
    SKIP_SENSITIVE_MASK_KEY,
    SensitiveDataInterceptor,
    maskSensitivePayload,
} from './sensitive-data.interceptor';
import {
    SENSITIVE_MASKERS,
    getSensitiveMaskType,
} from '../constants/sensitive-fields.constants';

type TestUser = {
    sub?: string;
    id?: string;
    uid?: string;
    roleLevel?: number;
};

function createContext(user?: TestUser): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ user }),
        }),
        getHandler: () => function handler() { /* noop */ },
        getClass: () => class TestController { },
    } as unknown as ExecutionContext;
}

function createHandler(data: unknown): CallHandler {
    return { handle: () => of(data) };
}

async function runInterceptor(
    data: unknown,
    user?: TestUser,
    skip = false,
): Promise<unknown> {
    const reflector = {
        getAllAndOverride: jest.fn((key: string) =>
            key === SKIP_SENSITIVE_MASK_KEY ? skip : undefined,
        ),
    } as unknown as Reflector;

    const interceptor = new SensitiveDataInterceptor(reflector);
    return lastValueFrom(
        interceptor.intercept(createContext(user), createHandler(data)) as never,
    );
}

const SELF_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ID = '22222222-2222-2222-2222-222222222222';

const L1_USER: TestUser = { sub: SELF_ID, roleLevel: 1 };
const L3_USER: TestUser = { sub: SELF_ID, roleLevel: 3 };

describe('SensitiveDataInterceptor', () => {
    // ============================================================
    // 遮罩格式
    // ============================================================
    describe('遮罩格式', () => {
        it('電話：保留首二末一，10 碼手機為 09**-***-**8', () => {
            expect(SENSITIVE_MASKERS.phone('0912345678')).toBe('09**-***-**8');
        });

        it('電話：非 10 碼仍保留首二末一', () => {
            expect(SENSITIVE_MASKERS.phone('0287654321')).toBe('02**-***-**1');
            expect(SENSITIVE_MASKERS.phone('02-87654321')).toBe('02********1');
        });

        it('電話：過短的值整串遮蔽，不洩漏任何字元', () => {
            expect(SENSITIVE_MASKERS.phone('119')).toBe('***');
            expect(SENSITIVE_MASKERS.phone('1')).toBe('*');
        });

        it('身分證：首字 + ****', () => {
            expect(SENSITIVE_MASKERS.idNumber('A123456789')).toBe('A****');
            expect(SENSITIVE_MASKERS.idNumber('B987654321')).toBe('B****');
        });

        it('地址：保留到區／鄉／鎮層級', () => {
            expect(SENSITIVE_MASKERS.address('台北市大安區復興南路一段100號'))
                .toBe('台北市大安區***');
            expect(SENSITIVE_MASKERS.address('花蓮縣光復鄉大進街50號'))
                .toBe('花蓮縣光復鄉***');
            expect(SENSITIVE_MASKERS.address('新北市板橋區文化路二段10巷3號'))
                .toBe('新北市板橋區***');
        });

        it('地址：只有單一層級或非台灣格式時仍不洩漏門牌', () => {
            expect(SENSITIVE_MASKERS.address('花蓮縣')).toBe('花蓮縣***');
            expect(SENSITIVE_MASKERS.address('123 Main Street')).toBe('123***');
        });

        it('Email：首字 + ***@domain', () => {
            expect(SENSITIVE_MASKERS.email('alice@example.com')).toBe('a***@example.com');
            expect(SENSITIVE_MASKERS.email('a@b.co')).toBe('a***@b.co');
        });

        it('Email：沒有 @ 時只保留首字', () => {
            expect(SENSITIVE_MASKERS.email('not-an-email')).toBe('n***');
        });

        it('生日：只保留年份（字串與 Date 皆可）', () => {
            expect(SENSITIVE_MASKERS.birthDate('1990-01-15')).toBe('1990-**-**');
            expect(SENSITIVE_MASKERS.birthDate(new Date('1985-06-20T00:00:00Z')))
                .toBe('1985-**-**');
            expect(SENSITIVE_MASKERS.birthDate('not a date')).toBe('****-**-**');
        });

        it('緊急聯絡人姓名：首字 + *', () => {
            expect(SENSITIVE_MASKERS.personName('王大明')).toBe('王**');
            expect(SENSITIVE_MASKERS.personName('李')).toBe('*');
        });
    });

    // ============================================================
    // 欄位清單
    // ============================================================
    describe('敏感欄位清單', () => {
        it('camelCase 與 snake_case 對應到同一條規則', () => {
            expect(getSensitiveMaskType('idNumber')).toBe('idNumber');
            expect(getSensitiveMaskType('id_number')).toBe('idNumber');
            expect(getSensitiveMaskType('emergencyContactPhone')).toBe('phone');
            expect(getSensitiveMaskType('emergency_contact_phone')).toBe('phone');
            expect(getSensitiveMaskType('birth_date')).toBe('birthDate');
        });

        it('非敏感欄位不會被登記', () => {
            expect(getSensitiveMaskType('name')).toBeUndefined();
            expect(getSensitiveMaskType('status')).toBeUndefined();
            expect(getSensitiveMaskType('queryCode')).toBeUndefined();
            expect(getSensitiveMaskType('serviceHours')).toBeUndefined();
        });
    });

    // ============================================================
    // 權限等級
    // ============================================================
    describe('權限等級', () => {
        const otherVolunteer = {
            id: 'v-1',
            accountId: OTHER_ID,
            name: '陳小華',
            idNumber: 'A123456789',
            phone: '0912345678',
            address: '台北市大安區復興南路一段100號',
            email: 'hua@example.com',
        };

        it('L1 讀他人資料 → 遮罩', async () => {
            const result = await runInterceptor({ ...otherVolunteer }, L1_USER) as Record<string, unknown>;

            expect(result.idNumber).toBe('A****');
            expect(result.phone).toBe('09**-***-**8');
            expect(result.address).toBe('台北市大安區***');
            expect(result.email).toBe('h***@example.com');
            // 非敏感欄位保持原樣
            expect(result.name).toBe('陳小華');
        });

        it('L0 / 未登入 → 一律遮罩（最保守）', async () => {
            const anon = await runInterceptor({ ...otherVolunteer }, undefined) as Record<string, unknown>;
            expect(anon.idNumber).toBe('A****');

            const l0 = await runInterceptor({ ...otherVolunteer }, { roleLevel: 0 }) as Record<string, unknown>;
            expect(l0.phone).toBe('09**-***-**8');
        });

        it('L3 → 不遮罩，且原封不動回傳同一個 reference', async () => {
            const payload = { ...otherVolunteer };
            const result = await runInterceptor(payload, L3_USER);

            expect(result).toBe(payload);
            expect((result as Record<string, unknown>).idNumber).toBe('A123456789');
        });

        it('L5 → 不遮罩', async () => {
            const result = await runInterceptor({ ...otherVolunteer }, { sub: SELF_ID, roleLevel: 5 }) as Record<string, unknown>;
            expect(result.phone).toBe('0912345678');
        });
    });

    // ============================================================
    // 本人資料
    // ============================================================
    describe('本人資料不遮罩', () => {
        it('accountId 等於呼叫者 → 跳過', async () => {
            const result = await runInterceptor(
                { id: 'v-1', accountId: SELF_ID, phone: '0912345678', idNumber: 'A123456789' },
                L1_USER,
            ) as Record<string, unknown>;

            expect(result.phone).toBe('0912345678');
            expect(result.idNumber).toBe('A123456789');
        });

        it('userId 等於呼叫者 → 跳過', async () => {
            const result = await runInterceptor(
                { userId: SELF_ID, phone: '0912345678' },
                L1_USER,
            ) as Record<string, unknown>;

            expect(result.phone).toBe('0912345678');
        });

        it('id 等於呼叫者（Account entity 主鍵即 JWT sub）→ 跳過', async () => {
            const result = await runInterceptor(
                { id: SELF_ID, email: 'me@example.com', phone: '0912345678' },
                L1_USER,
            ) as Record<string, unknown>;

            expect(result.email).toBe('me@example.com');
            expect(result.phone).toBe('0912345678');
        });

        it('列表中只有本人那筆不遮罩，其餘照常遮罩', async () => {
            const result = await runInterceptor(
                [
                    { accountId: SELF_ID, name: '我', phone: '0911111111' },
                    { accountId: OTHER_ID, name: '別人', phone: '0922222222' },
                ],
                L1_USER,
            ) as Array<Record<string, unknown>>;

            expect(result[0].phone).toBe('0911111111');
            expect(result[1].phone).toBe('09**-***-**2');
        });

        it('本人資料的巢狀子樹也一併跳過', async () => {
            const result = await runInterceptor(
                {
                    accountId: SELF_ID,
                    profile: { phone: '0912345678', address: '台北市大安區復興南路一段100號' },
                },
                L1_USER,
            ) as Record<string, unknown>;

            const profile = result.profile as Record<string, unknown>;
            expect(profile.phone).toBe('0912345678');
            expect(profile.address).toBe('台北市大安區復興南路一段100號');
        });

        it('呼叫者沒有 id 時不會誤判為本人', async () => {
            const result = await runInterceptor(
                { accountId: OTHER_ID, phone: '0912345678' },
                { roleLevel: 1 },
            ) as Record<string, unknown>;

            expect(result.phone).toBe('09**-***-**8');
        });
    });

    // ============================================================
    // 巢狀 / 陣列
    // ============================================================
    describe('巢狀與陣列', () => {
        it('遮罩 { success, data: [...] } 包裝結構', async () => {
            const result = await runInterceptor(
                {
                    success: true,
                    count: 2,
                    data: [
                        { id: 'v-1', name: 'A', phone: '0912345678', idNumber: 'A123456789' },
                        { id: 'v-2', name: 'B', phone: '0987654321', address: '花蓮縣光復鄉大進街50號' },
                    ],
                },
                L1_USER,
            ) as Record<string, unknown>;

            const data = result.data as Array<Record<string, unknown>>;
            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(data[0].phone).toBe('09**-***-**8');
            expect(data[0].idNumber).toBe('A****');
            expect(data[1].address).toBe('花蓮縣光復鄉***');
        });

        it('深層巢狀物件與陣列都會處理', async () => {
            const result = await runInterceptor(
                {
                    shelter: {
                        name: '中正國小',
                        contactPhone: '0912345678',
                        evacuees: [
                            { name: '王大明', idNumber: 'A123456789', emergencyContact: '王小美', emergencyPhone: '0955667788' },
                        ],
                    },
                },
                L1_USER,
            ) as Record<string, unknown>;

            const shelter = result.shelter as Record<string, unknown>;
            const evacuees = shelter.evacuees as Array<Record<string, unknown>>;

            expect(shelter.contactPhone).toBe('09**-***-**8');
            expect(shelter.name).toBe('中正國小');
            expect(evacuees[0].idNumber).toBe('A****');
            expect(evacuees[0].emergencyContact).toBe('王**');
            expect(evacuees[0].emergencyPhone).toBe('09**-***-**8');
        });

        it('沒有敏感欄位時回傳原 reference（copy-on-write，不做無謂複製）', () => {
            const payload = { data: [{ id: 'a', status: 'OPEN' }, { id: 'b', status: 'FULL' }] };
            expect(maskSensitivePayload(payload, SELF_ID)).toBe(payload);
        });

        it('只複製有變更的節點，未變更的兄弟節點維持原 reference', () => {
            const clean = { id: 'x', status: 'OPEN' };
            const dirty = { id: 'y', phone: '0912345678' };
            const payload = { items: [clean, dirty] };

            const result = maskSensitivePayload(payload, null) as { items: unknown[] };

            expect(result).not.toBe(payload);
            expect(result.items[0]).toBe(clean);
            expect(result.items[1]).not.toBe(dirty);
            // 原始物件未被就地竄改
            expect(dirty.phone).toBe('0912345678');
        });
    });

    // ============================================================
    // null / 邊界安全
    // ============================================================
    describe('null 與邊界安全', () => {
        it.each([
            ['null', null],
            ['undefined', undefined],
            ['空字串', ''],
            ['數字', 42],
            ['布林', true],
        ])('%s payload 原樣回傳', async (_label, payload) => {
            expect(await runInterceptor(payload, L1_USER)).toBe(payload);
        });

        it('敏感欄位為 null / undefined 時不會拋錯', async () => {
            const result = await runInterceptor(
                { name: 'A', phone: null, idNumber: undefined, address: '', email: null },
                L1_USER,
            ) as Record<string, unknown>;

            expect(result.phone).toBeNull();
            expect(result.idNumber).toBeUndefined();
            expect(result.address).toBe('');
        });

        it('空陣列與空物件安全', async () => {
            expect(await runInterceptor([], L1_USER)).toEqual([]);
            expect(await runInterceptor({}, L1_USER)).toEqual({});
        });

        it('Date 值不會被走訪破壞', async () => {
            const createdAt = new Date('2026-01-01T00:00:00Z');
            const result = await runInterceptor({ name: 'A', createdAt }, L1_USER) as Record<string, unknown>;
            expect(result.createdAt).toBe(createdAt);
        });

        it('敏感欄位名稱但值為物件時不會被轉成字串', async () => {
            const result = await runInterceptor(
                { address: { city: '台北市', phone: '0912345678' } },
                L1_USER,
            ) as Record<string, unknown>;

            const address = result.address as Record<string, unknown>;
            expect(typeof address).toBe('object');
            expect(address.city).toBe('台北市');
            // 巢狀的敏感欄位仍會被遮罩
            expect(address.phone).toBe('09**-***-**8');
        });

        it('循環引用不會造成無限遞迴', () => {
            const parent: Record<string, unknown> = { name: '收容所', contactPhone: '0912345678' };
            const child: Record<string, unknown> = { name: '災民', parent };
            parent.child = child;

            expect(() => maskSensitivePayload(parent, null)).not.toThrow();
        });
    });

    // ============================================================
    // @SkipSensitiveMask()
    // ============================================================
    describe('@SkipSensitiveMask()', () => {
        it('標記後 L1 也不遮罩', async () => {
            const payload = { phone: '0912345678', idNumber: 'A123456789' };
            const result = await runInterceptor(payload, L1_USER, true);

            expect(result).toBe(payload);
            expect((result as Record<string, unknown>).phone).toBe('0912345678');
        });
    });
});
