import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Document OCR Service
 * Paper form digitization
 */
@Injectable()
export class DocumentOcrService {
    private readonly logger = new Logger(DocumentOcrService.name);

    constructor(private configService: ConfigService) { }

    /**
     * OCR 處理
     */
    async processImage(imageBase64: string): Promise<OcrResult> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            return this.getMockOcrResult();
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: '請辨識這張圖片中的所有文字，並以結構化 JSON 格式輸出。如果是表單，請提取欄位名稱和對應的值。' },
                                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                            ],
                        }],
                    }),
                },
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            return { success: true, rawText: text, fields: this.parseFields(text), confidence: 0.85 };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 處理災情回報表單
     */
    async processDisasterForm(imageBase64: string): Promise<DisasterFormData> {
        const result = await this.processImage(imageBase64);

        return {
            formType: 'disaster_report',
            location: result.fields?.['地點'] || result.fields?.['location'] || '',
            reporterName: result.fields?.['通報人'] || result.fields?.['姓名'] || '',
            phone: result.fields?.['電話'] || result.fields?.['聯絡電話'] || '',
            disasterType: result.fields?.['災害類型'] || '',
            description: result.fields?.['狀況描述'] || result.fields?.['描述'] || '',
            casualties: parseInt(result.fields?.['傷亡人數'] || '0', 10),
            rawOcr: result,
        };
    }

    /**
     * 處理志工簽到表
     */
    async processCheckInSheet(imageBase64: string): Promise<CheckInData[]> {
        const result = await this.processImage(imageBase64);

        // 模擬解析簽到表
        return [
            { name: '王大明', checkInTime: '08:00', signature: true },
            { name: '李小華', checkInTime: '08:05', signature: true },
        ];
    }

    /**
     * 批次處理
     */
    async batchProcess(images: { id: string; base64: string }[]): Promise<BatchOcrResult> {
        const results: Map<string, OcrResult> = new Map();

        for (const img of images) {
            results.set(img.id, await this.processImage(img.base64));
        }

        return {
            total: images.length,
            successful: Array.from(results.values()).filter((r) => r.success).length,
            results: Object.fromEntries(results),
        };
    }

    /**
     * 提取表格資料
     */
    async extractTable(imageBase64: string): Promise<TableData> {
        // 模擬表格提取
        return {
            headers: ['姓名', '單位', '到達時間', '備註'],
            rows: [
                ['王大明', '救援隊', '08:00', ''],
                ['李小華', '醫療組', '08:15', '攜帶急救包'],
            ],
        };
    }

    private parseFields(text: string): Record<string, string> {
        const fields: Record<string, string> = {};

        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch {
            // 嘗試解析 key: value 格式
            const lines = text.split('\n');
            for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    if (key && value) fields[key] = value;
                }
            }
        }

        return fields;
    }

    private getMockOcrResult(): OcrResult {
        return {
            success: true,
            rawText: '地點: 台北市中正區\n通報人: 王大明\n電話: 0912345678\n災害類型: 淹水\n描述: 地下室淹水約50公分',
            fields: {
                '地點': '台北市中正區',
                '通報人': '王大明',
                '電話': '0912345678',
                '災害類型': '淹水',
                '描述': '地下室淹水約50公分',
            },
            confidence: 0.9,
        };
    }
}

// Types
interface OcrResult { success: boolean; rawText?: string; fields?: Record<string, string>; confidence?: number; error?: string; }
interface DisasterFormData { formType: string; location: string; reporterName: string; phone: string; disasterType: string; description: string; casualties: number; rawOcr: OcrResult; }
interface CheckInData { name: string; checkInTime: string; signature: boolean; }
interface BatchOcrResult { total: number; successful: number; results: Record<string, OcrResult>; }
interface TableData { headers: string[]; rows: string[][]; }
