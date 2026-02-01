/**
 * Interoperability Controller
 * 
 * REST API for multi-agency data exchange
 * - CAP 1.2 alert conversion
 * - EDXL-DE 2.0 distribution
 * - NIEM mapping
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CapAdapterService, CapAlert } from './cap-adapter.service';
import { EdxlDeAdapterService, EdxlDistribution } from './edxl-de-adapter.service';
import { NiemMappingService } from './niem-mapping.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('Interoperability')
@Controller('api/v1/interop')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class InteroperabilityController {
    constructor(
        private readonly capAdapter: CapAdapterService,
        private readonly edxlAdapter: EdxlDeAdapterService,
        private readonly niemMapper: NiemMappingService,
    ) {}

    // ==================== CAP 1.2 ====================

    @Post('cap/from-alert')
    @ApiOperation({ summary: 'Convert internal alert to CAP 1.2 format' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    convertToCapAlert(
        @Body() alert: {
            id: string;
            title: string;
            description: string;
            severity: string;
            category: string;
            location?: string;
            startTime?: string;
            endTime?: string;
            source?: string;
            instruction?: string;
        },
    ): CapAlert {
        return this.capAdapter.toCapAlert({
            ...alert,
            startTime: alert.startTime ? new Date(alert.startTime) : undefined,
            endTime: alert.endTime ? new Date(alert.endTime) : undefined,
        });
    }

    @Post('cap/to-xml')
    @ApiOperation({ summary: 'Convert CAP alert to XML' })
    @Header('Content-Type', 'application/xml')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    convertCapToXml(@Body() alert: CapAlert): string {
        return this.capAdapter.toCapXml(alert);
    }

    @Post('cap/parse-xml')
    @ApiOperation({ summary: 'Parse CAP XML to internal format' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    parseCapXml(@Body() body: { xml: string }): any {
        return this.capAdapter.fromCapXml(body.xml);
    }

    // ==================== EDXL-DE 2.0 ====================

    @Post('edxl/create-distribution')
    @ApiOperation({ summary: 'Create EDXL-DE 2.0 distribution envelope' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    createEdxlDistribution(
        @Body() body: {
            sender: string;
            type: 'Report' | 'Update' | 'Cancel' | 'Request' | 'Response' | 'Dispatch';
            payload: any;
            recipients?: string[];
            targetAreas?: string[];
            keywords?: string[];
            incidentId?: string;
        },
    ): EdxlDistribution {
        return this.edxlAdapter.createDistribution(body);
    }

    @Post('edxl/to-xml')
    @ApiOperation({ summary: 'Convert EDXL-DE distribution to XML' })
    @Header('Content-Type', 'application/xml')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    convertEdxlToXml(@Body() distribution: EdxlDistribution): string {
        return this.edxlAdapter.toXml(distribution);
    }

    @Post('edxl/extract-payload')
    @ApiOperation({ summary: 'Extract payload from EDXL-DE distribution' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    extractEdxlPayload(@Body() distribution: EdxlDistribution): any {
        return this.edxlAdapter.extractPayload(distribution);
    }

    @Post('edxl/wrap-cap')
    @ApiOperation({ summary: 'Wrap CAP alert in EDXL-DE distribution' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    wrapCapInEdxl(
        @Body() body: { capXml: string; sender: string; incidentId?: string },
    ): EdxlDistribution {
        return this.edxlAdapter.wrapCapAlert(body.capXml, body.sender, body.incidentId);
    }

    // ==================== NIEM ====================

    @Post('niem/incident')
    @ApiOperation({ summary: 'Convert internal incident to NIEM format' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    convertToNiemIncident(
        @Body() incident: {
            id: string;
            name: string;
            description?: string;
            category?: string;
            severity?: string;
            startTime?: string;
            location?: {
                address?: string;
                city?: string;
                state?: string;
                country?: string;
                lat?: number;
                lng?: number;
            };
        },
    ) {
        return this.niemMapper.toNiemIncident({
            ...incident,
            startTime: incident.startTime ? new Date(incident.startTime) : undefined,
        });
    }

    @Post('niem/person')
    @ApiOperation({ summary: 'Convert internal person to NIEM format' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    convertToNiemPerson(
        @Body() person: {
            firstName?: string;
            lastName?: string;
            fullName?: string;
            birthDate?: string;
            gender?: string;
            nationality?: string;
        },
    ) {
        return this.niemMapper.toNiemPerson({
            ...person,
            birthDate: person.birthDate ? new Date(person.birthDate) : undefined,
        });
    }

    @Post('niem/message')
    @ApiOperation({ summary: 'Create NIEM message wrapper' })
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    createNiemMessage(
        @Body() body: {
            senderOrg: string;
            recipientOrg?: string;
            category: string;
            text: string;
        },
    ) {
        return this.niemMapper.createMessage(body);
    }

    @Get('niem/domains')
    @ApiOperation({ summary: 'Get supported NIEM domains' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getNiemDomains() {
        return {
            success: true,
            data: this.niemMapper.getSupportedDomains(),
        };
    }

    // ==================== Standards Info ====================

    @Get('standards')
    @ApiOperation({ summary: 'Get supported interoperability standards' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    getSupportedStandards() {
        return {
            success: true,
            data: [
                {
                    code: 'CAP',
                    version: '1.2',
                    name: 'Common Alerting Protocol',
                    organization: 'OASIS',
                    url: 'https://docs.oasis-open.org/emergency/cap/v1.2/',
                },
                {
                    code: 'EDXL-DE',
                    version: '2.0',
                    name: 'Emergency Data Exchange Language - Distribution Element',
                    organization: 'OASIS',
                    url: 'https://docs.oasis-open.org/emergency/edxl-de/v2.0/',
                },
                {
                    code: 'NIEM',
                    version: '5.0',
                    name: 'National Information Exchange Model',
                    organization: 'US Government',
                    url: 'https://www.niem.gov/',
                },
            ],
        };
    }
}
