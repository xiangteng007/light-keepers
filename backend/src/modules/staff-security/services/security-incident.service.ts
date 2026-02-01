/**
 * Security Incident Service
 * 
 * Manages security incidents for staff safety tracking
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityIncident } from '../entities/security-incident.entity';

export enum IncidentSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export enum IncidentType {
    THEFT = 'theft',
    ASSAULT = 'assault',
    INTIMIDATION = 'intimidation',
    VEHICLE_INCIDENT = 'vehicle_incident',
    NATURAL_HAZARD = 'natural_hazard',
    CIVIL_UNREST = 'civil_unrest',
    MEDICAL_EMERGENCY = 'medical_emergency',
    OTHER = 'other',
}

export interface CreateIncidentDto {
    type: IncidentType;
    severity: IncidentSeverity;
    description: string;
    location: {
        latitude?: number;
        longitude?: number;
        address?: string;
    };
    affectedStaffIds?: string[];
    reporterId: string;
}

@Injectable()
export class SecurityIncidentService {
    private readonly logger = new Logger(SecurityIncidentService.name);

    constructor(
        @InjectRepository(SecurityIncident)
        private readonly incidentRepo: Repository<SecurityIncident>,
    ) { }

    /**
     * Report a new security incident
     */
    async reportIncident(dto: CreateIncidentDto): Promise<SecurityIncident> {
        this.logger.warn(`Security incident reported: ${dto.type} - ${dto.severity}`);

        const incident = this.incidentRepo.create({
            type: dto.type,
            severity: dto.severity,
            description: dto.description,
            latitude: dto.location.latitude,
            longitude: dto.location.longitude,
            address: dto.location.address,
            affectedStaffIds: dto.affectedStaffIds || [],
            reporterId: dto.reporterId,
            status: 'reported',
            reportedAt: new Date(),
        });

        const saved = await this.incidentRepo.save(incident);
        
        // TODO: Trigger notifications based on severity
        if (dto.severity === IncidentSeverity.CRITICAL || dto.severity === IncidentSeverity.HIGH) {
            await this.triggerCriticalAlert(saved);
        }

        return saved;
    }

    /**
     * Get active incidents
     */
    async getActiveIncidents(): Promise<SecurityIncident[]> {
        return this.incidentRepo.find({
            where: { status: 'reported' },
            order: { reportedAt: 'DESC' },
        });
    }

    /**
     * Update incident status
     */
    async updateStatus(
        incidentId: string,
        status: string,
        resolution?: string
    ): Promise<SecurityIncident | null> {
        await this.incidentRepo.update(incidentId, {
            status,
            resolution,
            resolvedAt: status === 'resolved' ? new Date() : undefined,
        });
        return this.incidentRepo.findOne({ where: { id: incidentId } });
    }

    /**
     * Get incidents by location radius
     */
    async getIncidentsNearLocation(
        lat: number,
        lon: number,
        radiusKm: number
    ): Promise<SecurityIncident[]> {
        // Haversine formula approximation using degrees
        const latDelta = radiusKm / 111;
        const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

        return this.incidentRepo
            .createQueryBuilder('incident')
            .where('incident.latitude BETWEEN :minLat AND :maxLat', {
                minLat: lat - latDelta,
                maxLat: lat + latDelta,
            })
            .andWhere('incident.longitude BETWEEN :minLon AND :maxLon', {
                minLon: lon - lonDelta,
                maxLon: lon + lonDelta,
            })
            .orderBy('incident.reportedAt', 'DESC')
            .getMany();
    }

    private async triggerCriticalAlert(incident: SecurityIncident): Promise<void> {
        this.logger.error(`🚨 CRITICAL SECURITY ALERT: ${incident.type} at ${incident.address}`);
        // TODO: Integrate with notification system
    }
}
