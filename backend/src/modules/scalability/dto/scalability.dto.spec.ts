import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { OfflineOperationType } from '../services/offline-sync.service';
import {
    QueueOfflineOperationDto,
    ResolveConflictDto,
    UpdateRateLimitConfigDto,
} from './scalability.dto';

const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
});

const asBody = (metatype: new () => object) => ({
    type: 'body' as const,
    metatype,
    data: undefined,
});

describe('QueueOfflineOperationDto', () => {
    const valid = {
        clientId: 'client-1',
        entityType: 'task',
        entityId: 'task-1',
        operation: OfflineOperationType.UPDATE,
        data: { status: 'done' },
        timestamp: '2026-01-01T00:00:00.000Z',
    };

    /**
     * 迴歸測試：service 端會呼叫 timestamp.getTime()，
     * 原本傳入 JSON 字串會在執行期拋 TypeError。
     * 這裡確認 pipe 會把它轉成真正的 Date。
     */
    it('transforms the ISO timestamp into a Date instance', async () => {
        const result = (await pipe.transform(
            { ...valid },
            asBody(QueueOfflineOperationDto),
        )) as QueueOfflineOperationDto;

        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getTime()).toBe(Date.parse(valid.timestamp));
    });

    it('keeps the free-form data payload intact', async () => {
        const result = (await pipe.transform(
            { ...valid, data: { nested: { a: 1 }, list: [1, 2] } },
            asBody(QueueOfflineOperationDto),
        )) as QueueOfflineOperationDto;

        expect(result.data).toEqual({ nested: { a: 1 }, list: [1, 2] });
    });

    it('rejects server-managed fields supplied by the caller', async () => {
        for (const injected of [
            { id: 'forced-id' },
            { syncStatus: 'synced' },
            { retryCount: 0 },
        ]) {
            await expect(
                pipe.transform({ ...valid, ...injected }, asBody(QueueOfflineOperationDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        }
    });

    it('rejects an invalid operation enum value', async () => {
        await expect(
            pipe.transform(
                { ...valid, operation: 'upsert' },
                asBody(QueueOfflineOperationDto),
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('ResolveConflictDto', () => {
    it('accepts use_client without mergedData', async () => {
        await expect(
            pipe.transform({ resolution: 'use_client' }, asBody(ResolveConflictDto)),
        ).resolves.toEqual({ resolution: 'use_client' });
    });

    /**
     * 原本選 merge 卻未帶 mergedData 時，service 會靜默略過但仍回傳 true。
     * DTO 以 @ValidateIf 讓這個情境明確失敗。
     */
    it('requires mergedData when resolution is merge', async () => {
        await expect(
            pipe.transform({ resolution: 'merge' }, asBody(ResolveConflictDto)),
        ).rejects.toBeInstanceOf(BadRequestException);

        await expect(
            pipe.transform(
                { resolution: 'merge', mergedData: { a: 1 } },
                asBody(ResolveConflictDto),
            ),
        ).resolves.toBeDefined();
    });

    it('rejects an unknown resolution strategy', async () => {
        await expect(
            pipe.transform({ resolution: 'last_write_wins' }, asBody(ResolveConflictDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('UpdateRateLimitConfigDto', () => {
    it('accepts a partial update', async () => {
        await expect(
            pipe.transform({ limit: 100 }, asBody(UpdateRateLimitConfigDto)),
        ).resolves.toEqual({ limit: 100 });
    });

    /** name 是 Map 索引鍵，允許改名會造成記錄與鍵不一致。 */
    it('rejects renaming the config via the body', async () => {
        await expect(
            pipe.transform({ name: 'other' }, asBody(UpdateRateLimitConfigDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-positive limit', async () => {
        await expect(
            pipe.transform({ limit: 0 }, asBody(UpdateRateLimitConfigDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
