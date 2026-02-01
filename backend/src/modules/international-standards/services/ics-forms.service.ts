import { Injectable, Logger } from '@nestjs/common';

/**
 * ICS 表單類型
 */
export enum IcsFormType {
    ICS_201 = 'ICS-201',  // 事件概述
    ICS_202 = 'ICS-202',  // 事件目標
    ICS_203 = 'ICS-203',  // 組織分配
    ICS_204 = 'ICS-204',  // 任務分配
    ICS_205 = 'ICS-205',  // 通訊計劃
    ICS_206 = 'ICS-206',  // 醫療計劃
    ICS_207 = 'ICS-207',  // 組織架構圖
    ICS_208 = 'ICS-208',  // 安全訊息
    ICS_209 = 'ICS-209',  // 事件狀態摘要
    ICS_210 = 'ICS-210',  // 資源狀態變更
    ICS_211 = 'ICS-211',  // 簽到單
    ICS_213 = 'ICS-213',  // 一般訊息
    ICS_214 = 'ICS-214',  // 活動日誌
    ICS_215 = 'ICS-215',  // 戰術計劃工作表
    ICS_215A = 'ICS-215A', // 空中作業摘要
}

export interface IcsFormData {
    formType: IcsFormType;
    incidentName: string;
    incidentNumber?: string;
    operationalPeriod: {
        from: Date;
        to: Date;
    };
    preparedBy: string;
    approvedBy?: string;
    data: Record<string, any>;
    createdAt: Date;
}

export interface Ics201Data {
    incidentName: string;
    incidentNumber: string;
    dateTimePrepared: Date;
    mapSketch?: string;
    situation: string;
    objectives: string[];
    currentOrganization: {
        incidentCommander: string;
        operations?: string;
        planning?: string;
        logistics?: string;
        finance?: string;
    };
    resourcesSummary: Array<{
        resource: string;
        quantity: number;
        location: string;
        status: string;
    }>;
}

export interface Ics214Data {
    incidentName: string;
    operationalPeriod: { from: Date; to: Date };
    name: string;
    position: string;
    homeAgency: string;
    activityLog: Array<{
        time: Date;
        activity: string;
    }>;
}

/**
 * ICS-202 事件目標
 */
export interface Ics202Data {
    incidentName: string;
    incidentNumber?: string;
    operationalPeriod: { from: Date; to: Date };
    objectives: string[];
    generalControlObjectives: string;
    weatherForecast: string;
    safetyMessage: string;
    attachments?: string[];
    preparedBy: string;
    approvedBy: string;
}

/**
 * ICS-203 組織分配
 */
export interface Ics203Data {
    incidentName: string;
    operationalPeriod: { from: Date; to: Date };
    incidentCommander: { name: string; agency: string };
    deputyIc?: { name: string; agency: string };
    safetyOfficer?: { name: string; agency: string };
    infoOfficer?: { name: string; agency: string };
    liaisonOfficer?: { name: string; agency: string };
    operationsChief?: { name: string; agency: string };
    planningChief?: { name: string; agency: string };
    logisticsChief?: { name: string; agency: string };
    financeChief?: { name: string; agency: string };
    branches?: Array<{
        name: string;
        director: string;
        divisions: Array<{ name: string; supervisor: string }>;
    }>;
    preparedBy: string;
}

/**
 * ICS-205 通訊計劃
 */
export interface Ics205Data {
    incidentName: string;
    operationalPeriod: { from: Date; to: Date };
    basicRadioChannels: Array<{
        zone: string;
        channel: string;
        function: string;
        assignment: string;
        rxFreq: string;
        rxTone?: string;
        txFreq: string;
        txTone?: string;
        mode: 'A' | 'D' | 'M'; // Analog, Digital, Mixed
        remarks?: string;
    }>;
    specialInstructions?: string;
    preparedBy: string;
}

/**
 * ICS Forms Service
 * 
 * 提供 NIMS/ICS 標準表單功能：
 * - 表單生成
 * - 表單驗證
 * - 表單匯出
 */
@Injectable()
export class IcsFormsService {
    private readonly logger = new Logger(IcsFormsService.name);
    private forms: Map<string, IcsFormData> = new Map();

    /**
     * 生成 ICS-201 事件概述
     */
    generateIcs201(data: Ics201Data): IcsFormData {
        const form: IcsFormData = {
            formType: IcsFormType.ICS_201,
            incidentName: data.incidentName,
            incidentNumber: data.incidentNumber,
            operationalPeriod: {
                from: new Date(),
                to: new Date(Date.now() + 12 * 3600000),
            },
            preparedBy: data.currentOrganization.incidentCommander,
            data,
            createdAt: new Date(),
        };

        this.forms.set(`${form.formType}-${Date.now()}`, form);
        return form;
    }

    /**
     * 生成 ICS-214 活動日誌
     */
    generateIcs214(data: Ics214Data): IcsFormData {
        const form: IcsFormData = {
            formType: IcsFormType.ICS_214,
            incidentName: data.incidentName,
            operationalPeriod: data.operationalPeriod,
            preparedBy: data.name,
            data,
            createdAt: new Date(),
        };

        this.forms.set(`${form.formType}-${Date.now()}`, form);
        return form;
    }

    /**
     * 生成 ICS-202 事件目標
     */
    generateIcs202(data: Ics202Data): IcsFormData {
        const form: IcsFormData = {
            formType: IcsFormType.ICS_202,
            incidentName: data.incidentName,
            incidentNumber: data.incidentNumber,
            operationalPeriod: data.operationalPeriod,
            preparedBy: data.preparedBy,
            approvedBy: data.approvedBy,
            data,
            createdAt: new Date(),
        };

        this.forms.set(`${form.formType}-${Date.now()}`, form);
        this.logger.log(`Generated ICS-202 for ${data.incidentName}`);
        return form;
    }

    /**
     * 生成 ICS-203 組織分配
     */
    generateIcs203(data: Ics203Data): IcsFormData {
        const form: IcsFormData = {
            formType: IcsFormType.ICS_203,
            incidentName: data.incidentName,
            operationalPeriod: data.operationalPeriod,
            preparedBy: data.preparedBy,
            data,
            createdAt: new Date(),
        };

        this.forms.set(`${form.formType}-${Date.now()}`, form);
        this.logger.log(`Generated ICS-203 for ${data.incidentName}`);
        return form;
    }

    /**
     * 生成 ICS-205 通訊計劃
     */
    generateIcs205(data: Ics205Data): IcsFormData {
        const form: IcsFormData = {
            formType: IcsFormType.ICS_205,
            incidentName: data.incidentName,
            operationalPeriod: data.operationalPeriod,
            preparedBy: data.preparedBy,
            data,
            createdAt: new Date(),
        };

        this.forms.set(`${form.formType}-${Date.now()}`, form);
        this.logger.log(`Generated ICS-205 for ${data.incidentName}`);
        return form;
    }

    /**
     * 取得表單範本
     */
    getFormTemplate(formType: IcsFormType): Record<string, any> {
        const templates: Record<IcsFormType, any> = {
            [IcsFormType.ICS_201]: {
                incidentName: '',
                incidentNumber: '',
                dateTimePrepared: null,
                mapSketch: '',
                situation: '',
                objectives: [],
                currentOrganization: {
                    incidentCommander: '',
                    operations: '',
                    planning: '',
                    logistics: '',
                    finance: '',
                },
                resourcesSummary: [],
            },
            [IcsFormType.ICS_202]: {
                incidentName: '',
                incidentNumber: '',
                operationalPeriod: { from: null, to: null },
                objectives: [],
                generalControlObjectives: '',
                weatherForecast: '',
                safetyMessage: '',
                attachments: [],
                preparedBy: '',
                approvedBy: '',
            },
            [IcsFormType.ICS_203]: {
                incidentName: '',
                operationalPeriod: { from: null, to: null },
                incidentCommander: { name: '', agency: '' },
                deputyIc: { name: '', agency: '' },
                safetyOfficer: { name: '', agency: '' },
                infoOfficer: { name: '', agency: '' },
                liaisonOfficer: { name: '', agency: '' },
                operationsChief: { name: '', agency: '' },
                planningChief: { name: '', agency: '' },
                logisticsChief: { name: '', agency: '' },
                financeChief: { name: '', agency: '' },
                branches: [],
                preparedBy: '',
            },
            [IcsFormType.ICS_205]: {
                incidentName: '',
                operationalPeriod: { from: null, to: null },
                basicRadioChannels: [],
                specialInstructions: '',
                preparedBy: '',
            },
            [IcsFormType.ICS_214]: {
                incidentName: '',
                operationalPeriod: { from: null, to: null },
                name: '',
                position: '',
                homeAgency: '',
                activityLog: [],
            },
            // 其他表單範本 (尚未完整實作)
            [IcsFormType.ICS_204]: {},
            [IcsFormType.ICS_206]: {},
            [IcsFormType.ICS_207]: {},
            [IcsFormType.ICS_208]: {},
            [IcsFormType.ICS_209]: {},
            [IcsFormType.ICS_210]: {},
            [IcsFormType.ICS_211]: {},
            [IcsFormType.ICS_213]: {},
            [IcsFormType.ICS_215]: {},
            [IcsFormType.ICS_215A]: {},
        };

        return templates[formType] || {};
    }

    /**
     * 驗證表單資料
     */
    validateForm(formType: IcsFormType, data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 通用驗證
        if (!data.incidentName) {
            errors.push('Incident name is required');
        }

        // 表單特定驗證
        switch (formType) {
            case IcsFormType.ICS_201:
                if (!data.situation) errors.push('Situation summary is required');
                if (!data.currentOrganization?.incidentCommander) {
                    errors.push('Incident Commander is required');
                }
                break;
            case IcsFormType.ICS_214:
                if (!data.name) errors.push('Personnel name is required');
                if (!data.activityLog?.length) errors.push('At least one activity is required');
                break;
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * 匯出表單為 HTML
     */
    exportToHtml(formId: string): string {
        const form = this.forms.get(formId);
        if (!form) return '';

        return `
<!DOCTYPE html>
<html>
<head>
    <title>${form.formType} - ${form.incidentName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { border-bottom: 2px solid #333; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        td, th { border: 1px solid #333; padding: 8px; }
    </style>
</head>
<body>
    <h1>${form.formType}: ${form.incidentName}</h1>
    <p>Prepared by: ${form.preparedBy}</p>
    <p>Date: ${form.createdAt.toISOString()}</p>
    <hr>
    <pre>${JSON.stringify(form.data, null, 2)}</pre>
</body>
</html>
        `.trim();
    }

    /**
     * 列出所有表單
     */
    listForms(): IcsFormData[] {
        return Array.from(this.forms.values());
    }
}
