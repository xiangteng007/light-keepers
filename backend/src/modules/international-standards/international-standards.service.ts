import { Injectable, Logger } from '@nestjs/common';
import { IcsFormsService, IcsFormType, Ics201Data, Ics214Data, IcsFormData } from './services/ics-forms.service';
import { HxlExportService, HxlDataset, HxlExportOptions } from './services/hxl-export.service';
import { OchaIntegrationService, ThreeWRecord, ClusterReport } from './services/ocha-integration.service';
import { SphereStandardsService, SphereStandard, SphereIndicator, ComplianceReport } from './services/sphere-standards.service';

/**
 * International Standards Service (Unified Facade)
 */
@Injectable()
export class InternationalStandardsService {
    private readonly logger = new Logger(InternationalStandardsService.name);

    constructor(
        private readonly icsForms: IcsFormsService,
        private readonly hxlExport: HxlExportService,
        private readonly ocha: OchaIntegrationService,
        private readonly sphere: SphereStandardsService,
    ) {}

    // === ICS Forms ===

    generateIcs201(data: Ics201Data): IcsFormData {
        return this.icsForms.generateIcs201(data);
    }

    generateIcs214(data: Ics214Data): IcsFormData {
        return this.icsForms.generateIcs214(data);
    }

    getIcsFormTemplate(formType: IcsFormType): Record<string, any> {
        return this.icsForms.getFormTemplate(formType);
    }

    validateIcsForm(formType: IcsFormType, data: any): { valid: boolean; errors: string[] } {
        return this.icsForms.validateForm(formType, data);
    }

    listIcsForms(): IcsFormData[] {
        return this.icsForms.listForms();
    }

    // === HXL Export ===

    exportMissionsToHxl(missions: any[]): HxlDataset {
        return this.hxlExport.exportMissions(missions);
    }

    exportResourcesToHxl(resources: any[]): HxlDataset {
        return this.hxlExport.exportResources(resources);
    }

    export3WToHxl(activities: any[]): HxlDataset {
        return this.hxlExport.export3W(activities);
    }

    hxlToCsv(dataset: HxlDataset, options?: HxlExportOptions): string {
        return this.hxlExport.toCsv(dataset, options);
    }

    hxlToJson(dataset: HxlDataset): any {
        return this.hxlExport.toJson(dataset);
    }

    // === OCHA 3W ===

    add3WRecord(data: Omit<ThreeWRecord, 'id'>): ThreeWRecord {
        return this.ocha.add3WRecord(data);
    }

    getAll3WRecords(): ThreeWRecord[] {
        return this.ocha.getAll3WRecords();
    }

    get3WByCluster(cluster: string): ThreeWRecord[] {
        return this.ocha.getByCluster(cluster);
    }

    get3WByLocation(admin1: string, admin2?: string): ThreeWRecord[] {
        return this.ocha.getByLocation(admin1, admin2);
    }

    generateClusterReport(cluster: string): ClusterReport {
        return this.ocha.generateClusterReport(cluster);
    }

    generate3WMatrix(): any {
        return this.ocha.generate3WMatrix();
    }

    import3WData(data: any[]): number {
        return this.ocha.importFromOcha(data);
    }

    // === Sphere Standards ===

    getSphereIndicators(): SphereIndicator[] {
        return this.sphere.getIndicators();
    }

    getSphereIndicatorsByStandard(standard: SphereStandard): SphereIndicator[] {
        return this.sphere.getIndicatorsByStandard(standard);
    }

    checkSphereCompliance(
        missionId: string,
        missionName: string,
        data: Record<string, number>
    ): ComplianceReport {
        return this.sphere.checkCompliance(missionId, missionName, data);
    }

    quickSphereCheck(data: any): { passed: boolean; issues: string[] } {
        return this.sphere.quickCheck(data);
    }
}
