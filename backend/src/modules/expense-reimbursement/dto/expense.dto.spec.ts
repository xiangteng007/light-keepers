import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { MarkPaidDto, ReviewClaimDto, SubmitClaimDto } from './expense.dto';

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

describe('SubmitClaimDto', () => {
    const valid = {
        submitterId: 'u1',
        submitterName: '志工A',
        category: 'transport',
        description: '前往災區交通費',
        amount: 1200,
    };

    it('accepts a valid claim', async () => {
        await expect(
            pipe.transform({ ...valid }, asBody(SubmitClaimDto)),
        ).resolves.toMatchObject(valid);
    });

    it('accepts optional linkage fields', async () => {
        const body = { ...valid, receiptUrl: 'https://x/y.jpg', incidentId: 'i1', eventId: 'e1' };
        await expect(pipe.transform(body, asBody(SubmitClaimDto))).resolves.toMatchObject(body);
    });

    /** status / approvals / submittedAt 皆由 service 設定，呼叫端不得指定。 */
    it('rejects server-controlled fields', async () => {
        await expect(
            pipe.transform({ ...valid, status: 'approved' }, asBody(SubmitClaimDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-numeric amount', async () => {
        await expect(
            pipe.transform({ ...valid, amount: '1200' }, asBody(SubmitClaimDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a missing required field', async () => {
        const { amount, ...withoutAmount } = valid;
        await expect(
            pipe.transform(withoutAmount, asBody(SubmitClaimDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('ReviewClaimDto', () => {
    const valid = { reviewerId: 'r1', reviewerName: '審核者', action: 'approve' };

    it('accepts each valid action', async () => {
        for (const action of ['approve', 'reject', 'request_revision']) {
            await expect(
                pipe.transform({ ...valid, action }, asBody(ReviewClaimDto)),
            ).resolves.toBeDefined();
        }
    });

    it('rejects an unknown action', async () => {
        await expect(
            pipe.transform({ ...valid, action: 'escalate' }, asBody(ReviewClaimDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('MarkPaidDto', () => {
    it('transforms paidAt into a Date', async () => {
        const result = (await pipe.transform(
            { method: 'bank_transfer', amount: 1200, paidAt: '2026-01-01T00:00:00.000Z' },
            asBody(MarkPaidDto),
        )) as MarkPaidDto;

        expect(result.paidAt).toBeInstanceOf(Date);
    });

    /** paidAt 選填，controller 會以伺服器時間補上。 */
    it('accepts a body without paidAt', async () => {
        await expect(
            pipe.transform({ method: 'cash', amount: 300 }, asBody(MarkPaidDto)),
        ).resolves.toEqual({ method: 'cash', amount: 300 });
    });

    it('rejects an unparseable paidAt', async () => {
        await expect(
            pipe.transform(
                { method: 'cash', amount: 300, paidAt: 'not-a-date' },
                asBody(MarkPaidDto),
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
