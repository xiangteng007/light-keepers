import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * LINE LIFF Service
 * LINE Front-end Framework integration for mini-apps
 * 
 * 📋 需要的外部設定:
 * - LIFF_ID: 從 LINE Developers Console 取得
 * - LINE_CHANNEL_ACCESS_TOKEN: LINE Channel Access Token
 * - LINE_CHANNEL_SECRET: LINE Channel Secret
 */
@Injectable()
export class LineLiffService {
    private readonly logger = new Logger(LineLiffService.name);

    constructor(private configService: ConfigService) { }

    // ==========================================
    // LIFF SDK 設定
    // ==========================================

    /**
     * 取得 LIFF 初始化設定
     * 前端使用: liff.init({ liffId: config.liffId })
     */
    getLiffConfig(): LiffConfig {
        return {
            liffId: this.configService.get<string>('LIFF_ID') || 'TODO: 設定 LIFF_ID',
            withLoginOnExternalBrowser: true,
        };
    }

    // ==========================================
    // Rich Menu 建構器
    // ==========================================

    /**
     * 建立預設 Rich Menu 結構
     */
    buildDefaultRichMenu(): RichMenuStructure {
        return {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: '光守護者主選單',
            chatBarText: '開啟選單',
            areas: [
                // 第一排
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'uri', uri: 'https://liff.line.me/${LIFF_ID}/report', label: '災情回報' },
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'uri', uri: 'https://liff.line.me/${LIFF_ID}/shelter', label: '避難所查詢' },
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'uri', uri: 'https://liff.line.me/${LIFF_ID}/alert', label: '最新警報' },
                },
                // 第二排
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'uri', uri: 'https://liff.line.me/${LIFF_ID}/checkin', label: '志工簽到' },
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'uri', uri: 'https://liff.line.me/${LIFF_ID}/supplies', label: '物資查詢' },
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'postback', data: 'action=help', label: '使用說明' },
                },
            ],
        };
    }

    /**
     * 建立緊急模式 Rich Menu
     */
    buildEmergencyRichMenu(): RichMenuStructure {
        return {
            size: { width: 2500, height: 843 },
            selected: true,
            name: '緊急模式選單',
            chatBarText: '⚠️ 緊急',
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'uri', uri: 'tel:119', label: '撥打 119' },
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'uri', uri: 'https://liff.line.me/${LIFF_ID}/sos', label: '發送 SOS' },
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'location', label: '分享位置' },
                },
            ],
        };
    }

    // ==========================================
    // Flex Message 範本
    // ==========================================

    /**
     * 災情警報 Flex Message
     */
    buildAlertFlexMessage(alert: AlertData): FlexMessage {
        const colorMap: Record<string, string> = {
            red: '#DC143C',
            orange: '#FF8C00',
            yellow: '#FFD700',
            green: '#228B22',
        };

        return {
            type: 'flex',
            altText: `⚠️ ${alert.title}`,
            contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: colorMap[alert.severity] || '#666666',
                    contents: [
                        {
                            type: 'text',
                            text: `⚠️ ${alert.type}`,
                            color: '#FFFFFF',
                            size: 'sm',
                        },
                        {
                            type: 'text',
                            text: alert.title,
                            color: '#FFFFFF',
                            size: 'xl',
                            weight: 'bold',
                            wrap: true,
                        },
                    ],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: alert.description,
                            wrap: true,
                            size: 'md',
                        },
                        {
                            type: 'separator',
                            margin: 'lg',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'lg',
                            contents: [
                                { type: 'text', text: '影響區域', size: 'sm', color: '#999999', flex: 1 },
                                { type: 'text', text: alert.affectedArea, size: 'sm', flex: 2 },
                            ],
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'sm',
                            contents: [
                                { type: 'text', text: '發布時間', size: 'sm', color: '#999999', flex: 1 },
                                { type: 'text', text: this.formatDateTime(alert.issuedAt), size: 'sm', flex: 2 },
                            ],
                        },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'button',
                            action: { type: 'uri', uri: `https://liff.line.me/\${LIFF_ID}/alert/${alert.id}`, label: '查看詳情' },
                            style: 'primary',
                        },
                        {
                            type: 'button',
                            action: { type: 'uri', uri: `https://liff.line.me/\${LIFF_ID}/shelter?area=${alert.affectedArea}`, label: '避難所' },
                            style: 'secondary',
                            margin: 'sm',
                        },
                    ],
                },
            },
        };
    }

    /**
     * 災情回報確認 Flex Message
     */
    buildReportConfirmFlexMessage(report: ReportData): FlexMessage {
        return {
            type: 'flex',
            altText: '✅ 災情回報已收到',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#27AE60',
                    contents: [
                        { type: 'text', text: '✅ 回報已收到', color: '#FFFFFF', size: 'lg', weight: 'bold' },
                    ],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: `案號: ${report.caseNumber}`, size: 'md', weight: 'bold' },
                        { type: 'text', text: report.description, size: 'sm', wrap: true, margin: 'md' },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'lg',
                            contents: [
                                { type: 'text', text: '類型', size: 'sm', color: '#999999', flex: 1 },
                                { type: 'text', text: report.type, size: 'sm', flex: 2 },
                            ],
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'sm',
                            contents: [
                                { type: 'text', text: '狀態', size: 'sm', color: '#999999', flex: 1 },
                                { type: 'text', text: '處理中', size: 'sm', color: '#FF8C00', flex: 2 },
                            ],
                        },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: { type: 'uri', uri: `https://liff.line.me/\${LIFF_ID}/report/status/${report.id}`, label: '追蹤進度' },
                            style: 'primary',
                        },
                    ],
                },
            },
        };
    }

    /**
     * 避難所卡片 Carousel
     */
    buildShelterCarousel(shelters: ShelterData[]): FlexMessage {
        return {
            type: 'flex',
            altText: '附近避難所',
            contents: {
                type: 'carousel',
                contents: shelters.slice(0, 10).map((shelter) => ({
                    type: 'bubble',
                    size: 'kilo',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: shelter.name, size: 'md', weight: 'bold', wrap: true },
                            { type: 'text', text: shelter.address, size: 'xs', color: '#999999', wrap: true, margin: 'sm' },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                margin: 'md',
                                contents: [
                                    { type: 'text', text: `${shelter.distance}m`, size: 'sm', color: '#27AE60' },
                                    { type: 'text', text: `${shelter.currentOccupancy}/${shelter.capacity}人`, size: 'sm', align: 'end' },
                                ],
                            },
                        ],
                    },
                    footer: {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'uri',
                                    uri: `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`,
                                    label: '導航',
                                },
                                style: 'primary',
                                height: 'sm',
                            },
                        ],
                    },
                })),
            },
        };
    }

    /**
     * 志工簽到成功 Flex Message
     */
    buildCheckinSuccessFlexMessage(checkin: CheckinData): FlexMessage {
        return {
            type: 'flex',
            altText: '✅ 簽到成功',
            contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#3498DB',
                    contents: [
                        { type: 'text', text: '✅ 簽到成功', color: '#FFFFFF', size: 'lg', weight: 'bold', align: 'center' },
                    ],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: checkin.volunteerName, size: 'lg', weight: 'bold', align: 'center' },
                        { type: 'text', text: checkin.location, size: 'sm', color: '#999999', align: 'center', margin: 'sm' },
                        { type: 'text', text: this.formatDateTime(checkin.checkinTime), size: 'sm', align: 'center', margin: 'sm' },
                    ],
                },
            },
        };
    }

    // ==========================================
    // 工具方法
    // ==========================================

    private formatDateTime(date: Date): string {
        return new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }
}

// ==========================================
// 類型定義
// ==========================================
export interface LiffConfig {
    liffId: string;
    withLoginOnExternalBrowser: boolean;
}

export interface RichMenuStructure {
    size: { width: number; height: number };
    selected: boolean;
    name: string;
    chatBarText: string;
    areas: RichMenuArea[];
}

export interface RichMenuArea {
    bounds: { x: number; y: number; width: number; height: number };
    action: { type: string; uri?: string; data?: string; label: string };
}

export interface FlexMessage {
    type: 'flex';
    altText: string;
    contents: any;
}

export interface AlertData {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: 'red' | 'orange' | 'yellow' | 'green';
    affectedArea: string;
    issuedAt: Date;
}

export interface ReportData {
    id: string;
    caseNumber: string;
    type: string;
    description: string;
}

export interface ShelterData {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    distance: number;
    capacity: number;
    currentOccupancy: number;
}

export interface CheckinData {
    volunteerName: string;
    location: string;
    checkinTime: Date;
}

