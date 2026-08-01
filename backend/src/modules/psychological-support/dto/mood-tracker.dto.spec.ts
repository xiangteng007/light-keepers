import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ChatDto, LogMoodDto, NewChatSessionDto, PostBlessingDto } from './mood-tracker.dto';

/** 與 `main.ts` 的全域設定一致 */
const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
});

const meta = (metatype: unknown) => ({
    type: 'body' as const,
    metatype: metatype as new () => unknown,
    data: undefined,
});

describe('心理支持 DTO（P0 輸入驗證）', () => {
    describe('LogMoodDto', () => {
        it('接受 1-10 的分數', async () => {
            await expect(pipe.transform({ score: 7 }, meta(LogMoodDto))).resolves.toMatchObject({ score: 7 });
        });

        it.each([0, 11, -3, 999])('擋掉超出範圍的分數 %p', async (score) => {
            await expect(pipe.transform({ score }, meta(LogMoodDto))).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉非數字的分數（會讓預警門檻判斷失真）', async () => {
            await expect(pipe.transform({ score: 'sad' }, meta(LogMoodDto))).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('分數為必填', async () => {
            await expect(pipe.transform({ note: '還好' }, meta(LogMoodDto))).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('擋掉夾帶的未知欄位（心理健康資料不該讓呼叫端塞任意欄位進 DB）', async () => {
            await expect(
                pipe.transform({ score: 5, isAdmin: true }, meta(LogMoodDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉非 UUID 的 taskId', async () => {
            await expect(
                pipe.transform({ score: 5, taskId: 'not-a-uuid' }, meta(LogMoodDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉過多的標籤', async () => {
            await expect(
                pipe.transform({ score: 5, tags: Array.from({ length: 50 }, (_, i) => `t${i}`) }, meta(LogMoodDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('PostBlessingDto', () => {
        const valid = { displayName: '匿名志工', message: '大家辛苦了' };

        it('接受合法的祝福', async () => {
            await expect(pipe.transform({ ...valid }, meta(PostBlessingDto))).resolves.toMatchObject(valid);
        });

        it('擋掉空白訊息', async () => {
            await expect(
                pipe.transform({ ...valid, message: '' }, meta(PostBlessingDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉超長訊息', async () => {
            await expect(
                pipe.transform({ ...valid, message: 'x'.repeat(501) }, meta(PostBlessingDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('ChatDto', () => {
        const valid = { sessionId: 'sess-1', message: '我覺得很累' };

        it('接受合法的對話', async () => {
            await expect(pipe.transform({ ...valid }, meta(ChatDto))).resolves.toMatchObject(valid);
        });

        it('sessionId 為必填', async () => {
            await expect(
                pipe.transform({ message: '我覺得很累' }, meta(ChatDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('擋掉超長訊息（會整包送進 LLM）', async () => {
            await expect(
                pipe.transform({ ...valid, message: 'x'.repeat(2001) }, meta(ChatDto)),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('NewChatSessionDto', () => {
        it('擋掉缺少 sessionId 的請求', async () => {
            await expect(pipe.transform({}, meta(NewChatSessionDto))).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
