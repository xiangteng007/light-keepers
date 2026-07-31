import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateLabelTemplateDto, UpdateLabelTemplateDto } from './label-template.dto';

/**
 * 以與 main.ts 相同的設定建立 pipe，確保測到的是實際執行期行為。
 */
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

describe('CreateLabelTemplateDto', () => {
    /**
     * 這是 43 個目標端點中唯一有「現行前端呼叫點」的一個
     * （web-dashboard/src/pages/LabelManagementPage.tsx），
     * 因此特別以前端實際送出的酬載做迴歸測試，
     * 確認 forbidNonWhitelisted 不會把它擋成 400。
     */
    it('accepts the exact payload the web dashboard sends today', async () => {
        const frontendPayload = {
            name: '物資批號標籤',
            description: '50x30mm 批號貼紙',
            targetTypes: ['lot'],
            controlLevels: ['controlled'],
            width: 50,
            height: 30,
            layoutConfig: {
                fields: [
                    { name: 'qr', position: { x: 2, y: 2 }, size: 26 },
                    { name: 'title', position: { x: 30, y: 2 }, fontSize: 10 },
                ],
            },
        };

        const result = await pipe.transform(frontendPayload, asBody(CreateLabelTemplateDto));

        expect(result).toMatchObject(frontendPayload);
        // layoutConfig 為自由結構，巢狀內容不得被剝除
        expect((result as CreateLabelTemplateDto).layoutConfig).toEqual(
            frontendPayload.layoutConfig,
        );
    });

    it('accepts an empty layoutConfig (既有 spec 的用法)', async () => {
        await expect(
            pipe.transform(
                {
                    name: 'T',
                    targetTypes: ['lot'],
                    controlLevels: ['controlled'],
                    width: 10,
                    height: 10,
                    layoutConfig: {},
                },
                asBody(CreateLabelTemplateDto),
            ),
        ).resolves.toBeDefined();
    });

    it('rejects an unknown top-level field (forbidNonWhitelisted)', async () => {
        await expect(
            pipe.transform(
                {
                    name: 'T',
                    targetTypes: ['lot'],
                    controlLevels: ['controlled'],
                    width: 10,
                    height: 10,
                    layoutConfig: {},
                    // createdBy 應由 JWT 注入，不得由呼叫端指定
                    createdBy: 'attacker',
                },
                asBody(CreateLabelTemplateDto),
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a wrong scalar type', async () => {
        await expect(
            pipe.transform(
                {
                    name: 'T',
                    targetTypes: ['lot'],
                    controlLevels: ['controlled'],
                    width: 'wide',
                    height: 10,
                    layoutConfig: {},
                },
                asBody(CreateLabelTemplateDto),
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a missing required field', async () => {
        await expect(
            pipe.transform(
                { name: 'T', targetTypes: ['lot'], controlLevels: ['controlled'] },
                asBody(CreateLabelTemplateDto),
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('UpdateLabelTemplateDto', () => {
    it('accepts the isActive-only payload the dashboard sends', async () => {
        await expect(
            pipe.transform({ isActive: false }, asBody(UpdateLabelTemplateDto)),
        ).resolves.toEqual({ isActive: false });
    });

    it('rejects an unknown field', async () => {
        await expect(
            pipe.transform({ createdBy: 'x' }, asBody(UpdateLabelTemplateDto)),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
