/**
 * NIEM (National Information Exchange Model) Mapping Service
 * 
 * US-based standard for information exchange between government agencies
 * @see https://www.niem.gov/
 * 
 * Domains supported:
 * - Emergency Management (em)
 * - Justice (j)
 * - Infrastructure Protection (ip)
 * - Intelligence (intel)
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * NIEM Core Elements (simplified)
 */
export interface NiemPerson {
    'nc:PersonName'?: {
        'nc:PersonGivenName'?: string;
        'nc:PersonSurName'?: string;
        'nc:PersonFullName'?: string;
    };
    'nc:PersonBirthDate'?: { 'nc:Date': string };
    'nc:PersonSexCode'?: string;
    'nc:PersonCitizenshipISO3166Alpha3Code'?: string;
}

export interface NiemLocation {
    'nc:LocationAddress'?: {
        'nc:AddressFullText'?: string;
        'nc:LocationCountryISO3166Alpha3Code'?: string;
        'nc:LocationStateName'?: string;
        'nc:LocationCityName'?: string;
    };
    'nc:LocationGeospatialCoordinate'?: {
        'nc:GeographicCoordinateLatitude'?: { 'nc:LatitudeDegreeValue': number };
        'nc:GeographicCoordinateLongitude'?: { 'nc:LongitudeDegreeValue': number };
    };
}

export interface NiemIncident {
    'nc:ActivityIdentification'?: { 'nc:IdentificationID': string };
    'nc:ActivityName'?: string;
    'nc:ActivityDescriptionText'?: string;
    'nc:ActivityDate'?: { 'nc:DateTime': string };
    'nc:ActivityCategoryText'?: string;
    'em:IncidentEMCategoryCode'?: string;
    'em:IncidentSeverityCode'?: string;
    'nc:IncidentLocation'?: NiemLocation;
}

export interface NiemMessage {
    '@context'?: string;
    'nc:Message'?: {
        'nc:MessageSenderEntity'?: { 'nc:EntityOrganization'?: { 'nc:OrganizationName': string } };
        'nc:MessageRecipientEntity'?: { 'nc:EntityOrganization'?: { 'nc:OrganizationName': string } };
        'nc:MessageCreationDate'?: { 'nc:DateTime': string };
        'nc:MessageCategoryCode'?: string;
        'nc:MessageText'?: string;
    };
}

@Injectable()
export class NiemMappingService {
    private readonly logger = new Logger(NiemMappingService.name);

    /**
     * Map internal incident to NIEM Incident format
     */
    toNiemIncident(incident: {
        id: string;
        name: string;
        description?: string;
        category?: string;
        severity?: string;
        startTime?: Date;
        location?: {
            address?: string;
            city?: string;
            state?: string;
            country?: string;
            lat?: number;
            lng?: number;
        };
    }): NiemIncident {
        return {
            'nc:ActivityIdentification': {
                'nc:IdentificationID': incident.id,
            },
            'nc:ActivityName': incident.name,
            'nc:ActivityDescriptionText': incident.description,
            'nc:ActivityDate': incident.startTime ? {
                'nc:DateTime': incident.startTime.toISOString(),
            } : undefined,
            'nc:ActivityCategoryText': incident.category,
            'em:IncidentEMCategoryCode': this.mapToEmCategory(incident.category),
            'em:IncidentSeverityCode': this.mapToNiemSeverity(incident.severity),
            'nc:IncidentLocation': incident.location ? this.toNiemLocation(incident.location) : undefined,
        };
    }

    /**
     * Map internal person to NIEM Person format
     */
    toNiemPerson(person: {
        firstName?: string;
        lastName?: string;
        fullName?: string;
        birthDate?: Date;
        gender?: string;
        nationality?: string;
    }): NiemPerson {
        return {
            'nc:PersonName': {
                'nc:PersonGivenName': person.firstName,
                'nc:PersonSurName': person.lastName,
                'nc:PersonFullName': person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim(),
            },
            'nc:PersonBirthDate': person.birthDate ? {
                'nc:Date': person.birthDate.toISOString().split('T')[0],
            } : undefined,
            'nc:PersonSexCode': this.mapGender(person.gender),
            'nc:PersonCitizenshipISO3166Alpha3Code': person.nationality,
        };
    }

    /**
     * Map location to NIEM Location format
     */
    toNiemLocation(location: {
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        lat?: number;
        lng?: number;
    }): NiemLocation {
        return {
            'nc:LocationAddress': {
                'nc:AddressFullText': location.address,
                'nc:LocationCountryISO3166Alpha3Code': location.country,
                'nc:LocationStateName': location.state,
                'nc:LocationCityName': location.city,
            },
            'nc:LocationGeospatialCoordinate': (location.lat && location.lng) ? {
                'nc:GeographicCoordinateLatitude': { 'nc:LatitudeDegreeValue': location.lat },
                'nc:GeographicCoordinateLongitude': { 'nc:LongitudeDegreeValue': location.lng },
            } : undefined,
        };
    }

    /**
     * Create NIEM message wrapper
     */
    createMessage(params: {
        senderOrg: string;
        recipientOrg?: string;
        category: string;
        text: string;
    }): NiemMessage {
        return {
            '@context': 'http://release.niem.gov/niem/niem-core/5.0/',
            'nc:Message': {
                'nc:MessageSenderEntity': {
                    'nc:EntityOrganization': { 'nc:OrganizationName': params.senderOrg },
                },
                'nc:MessageRecipientEntity': params.recipientOrg ? {
                    'nc:EntityOrganization': { 'nc:OrganizationName': params.recipientOrg },
                } : undefined,
                'nc:MessageCreationDate': {
                    'nc:DateTime': new Date().toISOString(),
                },
                'nc:MessageCategoryCode': params.category,
                'nc:MessageText': params.text,
            },
        };
    }

    /**
     * Parse NIEM Incident to internal format
     */
    fromNiemIncident(niem: NiemIncident): {
        id?: string;
        name?: string;
        description?: string;
        category?: string;
        severity?: string;
        startTime?: Date;
    } {
        return {
            id: niem['nc:ActivityIdentification']?.['nc:IdentificationID'],
            name: niem['nc:ActivityName'],
            description: niem['nc:ActivityDescriptionText'],
            category: niem['nc:ActivityCategoryText'] || niem['em:IncidentEMCategoryCode'],
            severity: this.fromNiemSeverity(niem['em:IncidentSeverityCode']),
            startTime: niem['nc:ActivityDate']?.['nc:DateTime'] 
                ? new Date(niem['nc:ActivityDate']['nc:DateTime']) 
                : undefined,
        };
    }

    /**
     * Get supported NIEM domains
     */
    getSupportedDomains(): { code: string; name: string; description: string }[] {
        return [
            { code: 'nc', name: 'NIEM Core', description: 'Common data elements' },
            { code: 'em', name: 'Emergency Management', description: 'Emergency and incident data' },
            { code: 'j', name: 'Justice', description: 'Law enforcement and courts' },
            { code: 'ip', name: 'Infrastructure Protection', description: 'Critical infrastructure' },
        ];
    }

    private mapToEmCategory(category?: string): string {
        const mapping: Record<string, string> = {
            'earthquake': 'EQ',
            'typhoon': 'TC',
            'flood': 'FL',
            'tsunami': 'TS',
            'fire': 'WF',
            'hazmat': 'HM',
            'search-rescue': 'SAR',
        };
        return mapping[category?.toLowerCase() || ''] || 'OTH';
    }

    private mapToNiemSeverity(severity?: string): string {
        const mapping: Record<string, string> = {
            'critical': '1',
            'high': '2',
            'medium': '3',
            'low': '4',
        };
        return mapping[severity?.toLowerCase() || ''] || '5';
    }

    private fromNiemSeverity(code?: string): string {
        const mapping: Record<string, string> = {
            '1': 'critical',
            '2': 'high',
            '3': 'medium',
            '4': 'low',
            '5': 'info',
        };
        return mapping[code || ''] || 'unknown';
    }

    private mapGender(gender?: string): string {
        const mapping: Record<string, string> = {
            'male': 'M',
            'm': 'M',
            'female': 'F',
            'f': 'F',
            'other': 'X',
        };
        return mapping[gender?.toLowerCase() || ''] || 'U';
    }
}
