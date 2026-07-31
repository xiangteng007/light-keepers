import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DecisionType } from '../entities/decision-log.entity';
import { LogDecisionDto } from './decision-log.dto';

const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
});

const meta = { type: 'body' as const, metatype: LogDecisionDto, data: undefined };

describe('LogDecisionDto', () => {
    const valid = {
        decisionType: DecisionType.DISPATCH,
        description: '派遣第二梯次搜救隊',
    };

    it('accepts a minimal valid body', async () => {
        await expect(pipe.transform({ ...valid }, meta)).resolves.toMatchObject(valid);
    });

    it('accepts the full optional field set', async () => {
        const body = {
            ...valid,
            rationale: '第一梯次回報人力不足',
            relatedEntityType: 'task',
            relatedEntityId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
            aiAssisted: true,
            aiJobId: '3f2504e0-4f89-11d3-9a0c-0305e82c3302',
            aiConfidence: 0.87,
            beforeState: { status: 'pending' },
            afterState: { status: 'dispatched' },
        };
        await expect(pipe.transform(body, meta)).resolves.toMatchObject(body);
    });

    /**
     * 這是本次改動最關鍵的一條：controller 以 `...body` 無過濾展開後
     * 直接交給 decisionRepo.create()。若無白名單，呼叫端可自行寫入
     * approvedBy / decidedBy 等應由伺服器控制的欄位。
     */
    it('rejects server-controlled columns injected by the caller', async () => {
        for (const injected of [
            { approvedBy: 'attacker' },
            { decidedBy: 'attacker' },
            { missionSessionId: 'other-session' },
        ]) {
            await expect(
                pipe.transform({ ...valid, ...injected }, meta),
            ).rejects.toBeInstanceOf(BadRequestException);
        }
    });

    it('rejects an invalid decisionType', async () => {
        await expect(
            pipe.transform({ ...valid, decisionType: 'not_a_type' }, meta),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-uuid relatedEntityId', async () => {
        await expect(
            pipe.transform({ ...valid, relatedEntityId: 'task-1' }, meta),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects aiConfidence outside 0-1', async () => {
        await expect(
            pipe.transform({ ...valid, aiConfidence: 1.5 }, meta),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an empty description', async () => {
        await expect(
            pipe.transform({ ...valid, description: '' }, meta),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
