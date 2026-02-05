/**
 * LINE Flex Message Service
 * 
 * Templates and builders for LINE Flex Messages
 * v1.0
 */

import { Injectable, Logger } from '@nestjs/common';

// Flex Message Types
export interface FlexMessage {
    type: 'flex';
    altText: string;
    contents: FlexContainer;
}

export type FlexContainer = FlexBubble | FlexCarousel;

export interface FlexBubble {
    type: 'bubble';
    size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
    direction?: 'ltr' | 'rtl';
    header?: FlexBox;
    hero?: FlexImage | FlexBox;
    body?: FlexBox;
    footer?: FlexBox;
    styles?: FlexBubbleStyle;
}

export interface FlexCarousel {
    type: 'carousel';
    contents: FlexBubble[];
}

export interface FlexBox {
    type: 'box';
    layout: 'horizontal' | 'vertical' | 'baseline';
    contents: FlexComponent[];
    flex?: number;
    spacing?: string;
    margin?: string;
    paddingAll?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingStart?: string;
    paddingEnd?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: string;
    cornerRadius?: string;
    action?: FlexAction;
}

export interface FlexText {
    type: 'text';
    text: string;
    size?: string;
    color?: string;
    weight?: 'regular' | 'bold';
    style?: 'normal' | 'italic';
    decoration?: 'none' | 'underline' | 'line-through';
    wrap?: boolean;
    maxLines?: number;
    flex?: number;
    align?: 'start' | 'end' | 'center';
    gravity?: 'top' | 'bottom' | 'center';
    margin?: string;
    action?: FlexAction;
}

export interface FlexImage {
    type: 'image';
    url: string;
    size?: string;
    aspectRatio?: string;
    aspectMode?: 'cover' | 'fit';
    backgroundColor?: string;
    action?: FlexAction;
}

export interface FlexButton {
    type: 'button';
    action: FlexAction;
    style?: 'primary' | 'secondary' | 'link';
    color?: string;
    height?: 'sm' | 'md';
    flex?: number;
    gravity?: 'top' | 'bottom' | 'center';
}

export interface FlexSeparator {
    type: 'separator';
    margin?: string;
    color?: string;
}

export interface FlexSpacer {
    type: 'spacer';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export interface FlexIcon {
    type: 'icon';
    url: string;
    size?: string;
    aspectRatio?: string;
}

export type FlexComponent = FlexBox | FlexText | FlexImage | FlexButton | FlexSeparator | FlexSpacer | FlexIcon;

export type FlexAction =
    | { type: 'uri'; label: string; uri: string }
    | { type: 'message'; label: string; text: string }
    | { type: 'postback'; label: string; data: string; displayText?: string }
    | { type: 'datetimepicker'; label: string; data: string; mode: 'date' | 'time' | 'datetime' };

export interface FlexBubbleStyle {
    header?: { backgroundColor?: string };
    hero?: { backgroundColor?: string };
    body?: { backgroundColor?: string };
    footer?: { backgroundColor?: string };
}

@Injectable()
export class FlexMessageService {
    private readonly logger = new Logger(FlexMessageService.name);

    // Brand colors
    private readonly COLORS = {
        primary: '#D4AF37',
        secondary: '#1E293B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        dark: '#0F172A',
        light: '#F8FAFC',
        textPrimary: '#FFFFFF',
        textSecondary: '#94A3B8',
    };

    /**
     * Create task notification Flex Message
     */
    createTaskNotification(task: {
        id: string;
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        location: string;
        deadline?: Date;
        assigneeName?: string;
    }): FlexMessage {
        const priorityColors = {
            low: this.COLORS.info,
            medium: this.COLORS.warning,
            high: this.COLORS.danger,
            critical: '#9333EA',
        };

        const priorityLabels = {
            low: '低',
            medium: '中',
            high: '高',
            critical: '緊急',
        };

        return {
            type: 'flex',
            altText: `新任務通知: ${task.title}`,
            contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📋 新任務',
                                    color: this.COLORS.textPrimary,
                                    size: 'sm',
                                    weight: 'bold',
                                },
                                {
                                    type: 'text',
                                    text: priorityLabels[task.priority],
                                    color: priorityColors[task.priority],
                                    size: 'sm',
                                    weight: 'bold',
                                    align: 'end',
                                },
                            ],
                        },
                    ],
                    paddingAll: '15px',
                    backgroundColor: this.COLORS.secondary,
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: task.title,
                            weight: 'bold',
                            size: 'lg',
                            color: this.COLORS.textPrimary,
                            wrap: true,
                        },
                        {
                            type: 'text',
                            text: task.description,
                            size: 'sm',
                            color: this.COLORS.textSecondary,
                            wrap: true,
                            margin: 'md',
                        },
                        { type: 'separator', margin: 'lg' },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '📍 地點', size: 'xs', color: this.COLORS.textSecondary },
                                        { type: 'text', text: task.location, size: 'xs', color: this.COLORS.textPrimary, align: 'end' },
                                    ],
                                },
                                ...(task.deadline ? [{
                                    type: 'box' as const,
                                    layout: 'horizontal' as const,
                                    contents: [
                                        { type: 'text' as const, text: '⏰ 期限', size: 'xs' as const, color: this.COLORS.textSecondary },
                                        { type: 'text' as const, text: this.formatDate(task.deadline), size: 'xs' as const, color: this.COLORS.textPrimary, align: 'end' as const },
                                    ],
                                    margin: 'sm',
                                }] : []),
                            ],
                            margin: 'lg',
                            spacing: 'sm',
                        },
                    ],
                    paddingAll: '15px',
                    backgroundColor: this.COLORS.dark,
                },
                footer: {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '接受任務',
                                data: `action=accept_task&taskId=${task.id}`,
                            },
                            style: 'primary',
                            color: this.COLORS.primary,
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '查看詳情',
                                uri: `https://lightkeepers.app/command/tasks/${task.id}`,
                            },
                            style: 'secondary',
                        },
                    ],
                    spacing: 'md',
                    paddingAll: '15px',
                    backgroundColor: this.COLORS.dark,
                },
            },
        };
    }

    /**
     * Create weather alert Flex Message
     */
    createWeatherAlert(alert: {
        type: string;
        title: string;
        description: string;
        areas: string[];
        severity: 'advisory' | 'watch' | 'warning';
        startTime: Date;
    }): FlexMessage {
        const severityColors = {
            advisory: this.COLORS.info,
            watch: this.COLORS.warning,
            warning: this.COLORS.danger,
        };

        const severityEmojis = {
            advisory: '📢',
            watch: '⚠️',
            warning: '🚨',
        };

        return {
            type: 'flex',
            altText: `${severityEmojis[alert.severity]} ${alert.title}`,
            contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: `${severityEmojis[alert.severity]} ${alert.type}`,
                            color: '#FFFFFF',
                            weight: 'bold',
                            size: 'md',
                        },
                    ],
                    paddingAll: '15px',
                    backgroundColor: severityColors[alert.severity],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: alert.title,
                            weight: 'bold',
                            size: 'lg',
                            wrap: true,
                            color: this.COLORS.textPrimary,
                        },
                        {
                            type: 'text',
                            text: alert.description,
                            size: 'sm',
                            wrap: true,
                            margin: 'md',
                            color: this.COLORS.textSecondary,
                        },
                        { type: 'separator', margin: 'lg' },
                        {
                            type: 'text',
                            text: `影響地區: ${alert.areas.join(', ')}`,
                            size: 'xs',
                            color: this.COLORS.textSecondary,
                            wrap: true,
                            margin: 'md',
                        },
                        {
                            type: 'text',
                            text: `發布時間: ${this.formatDate(alert.startTime)}`,
                            size: 'xs',
                            color: this.COLORS.textSecondary,
                            margin: 'sm',
                        },
                    ],
                    paddingAll: '15px',
                    backgroundColor: this.COLORS.dark,
                },
                footer: {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '查看詳情',
                                uri: 'https://lightkeepers.app/geo/alerts',
                            },
                            style: 'primary',
                            color: severityColors[alert.severity],
                        },
                    ],
                    paddingAll: '15px',
                    backgroundColor: this.COLORS.dark,
                },
            },
        };
    }

    /**
     * Create volunteer check-in confirmation
     */
    createCheckinConfirmation(volunteer: {
        name: string;
        action: 'in' | 'out';
        time: Date;
        location?: string;
        hoursWorked?: number;
    }): FlexMessage {
        const isCheckIn = volunteer.action === 'in';

        return {
            type: 'flex',
            altText: isCheckIn ? '簽到成功' : '簽退成功',
            contents: {
                type: 'bubble',
                size: 'kilo',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: isCheckIn ? '✅ 簽到成功' : '👋 簽退成功',
                            weight: 'bold',
                            size: 'lg',
                            color: isCheckIn ? this.COLORS.success : this.COLORS.info,
                        },
                        {
                            type: 'text',
                            text: volunteer.name,
                            size: 'md',
                            margin: 'md',
                            color: this.COLORS.textPrimary,
                        },
                        {
                            type: 'text',
                            text: this.formatDateTime(volunteer.time),
                            size: 'sm',
                            color: this.COLORS.textSecondary,
                            margin: 'sm',
                        },
                        ...(volunteer.location ? [{
                            type: 'text' as const,
                            text: `📍 ${volunteer.location}`,
                            size: 'xs' as const,
                            color: this.COLORS.textSecondary,
                            margin: 'sm' as const,
                        }] : []),
                        ...(!isCheckIn && volunteer.hoursWorked ? [{
                            type: 'text' as const,
                            text: `⏱ 本次服務 ${volunteer.hoursWorked.toFixed(1)} 小時`,
                            size: 'sm' as const,
                            color: this.COLORS.primary,
                            margin: 'md' as const,
                            weight: 'bold' as const,
                        }] : []),
                    ],
                    paddingAll: '20px',
                    backgroundColor: this.COLORS.dark,
                } as FlexBox,
            },
        };
    }

    /**
     * Create resource status card carousel
     */
    createResourceStatusCarousel(resources: {
        name: string;
        quantity: number;
        unit: string;
        status: 'normal' | 'low' | 'critical';
        location: string;
    }[]): FlexMessage {
        const statusColors = {
            normal: this.COLORS.success,
            low: this.COLORS.warning,
            critical: this.COLORS.danger,
        };

        const bubbles: FlexBubble[] = resources.slice(0, 10).map(resource => ({
            type: 'bubble',
            size: 'micro',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: resource.name,
                        weight: 'bold',
                        size: 'sm',
                        color: this.COLORS.textPrimary,
                    },
                    {
                        type: 'text',
                        text: `${resource.quantity} ${resource.unit}`,
                        size: 'xl',
                        color: statusColors[resource.status],
                        weight: 'bold',
                        margin: 'md',
                    },
                    {
                        type: 'text',
                        text: resource.location,
                        size: 'xxs',
                        color: this.COLORS.textSecondary,
                        margin: 'sm',
                    },
                ],
                paddingAll: '15px',
                backgroundColor: this.COLORS.dark,
            },
        }));

        return {
            type: 'flex',
            altText: '物資狀態一覽',
            contents: {
                type: 'carousel',
                contents: bubbles,
            },
        };
    }

    /**
     * Create quick reply options
     */
    createQuickReplyItems(options: { label: string; text: string }[]): { items: { type: string; action: { type: string; label: string; text: string } }[] } {
        return {
            items: options.map(opt => ({
                type: 'action',
                action: {
                    type: 'message',
                    label: opt.label,
                    text: opt.text,
                },
            })),
        };
    }

    // Helper methods
    private formatDate(date: Date): string {
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private formatDateTime(date: Date): string {
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}
