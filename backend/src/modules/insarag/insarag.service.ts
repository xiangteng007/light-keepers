import { Injectable, Logger } from '@nestjs/common';

/**
 * INSARAG Service
 * International Search and Rescue Advisory Group data exchange
 */
@Injectable()
export class InsaragService {
    private readonly logger = new Logger(InsaragService.name);

    private virtualOsocc: VirtualOsocc | null = null;
    private usarTeams: Map<string, UsarTeam> = new Map();

    /**
     * Register USAR team for international deployment
     */
    registerUsarTeam(team: UsarTeamRegistration): UsarTeam {
        const usarTeam: UsarTeam = {
            id: `usar-${Date.now()}`,
            ...team,
            classification: team.classification || 'light',
            status: 'standby',
            currentDeployment: null,
            registeredAt: new Date(),
        };

        this.usarTeams.set(usarTeam.id, usarTeam);
        this.logger.log(`USAR team registered: ${usarTeam.name} (${usarTeam.classification})`);

        return usarTeam;
    }

    /**
     * Generate INSARAG External Classification (IEC) report
     */
    generateIecReport(teamId: string): IecReport {
        const team = this.usarTeams.get(teamId);
        if (!team) throw new Error('Team not found');

        return {
            teamId,
            teamName: team.name,
            country: team.country,
            classification: team.classification,
            sectors: {
                management: this.assessManagement(team),
                search: this.assessSearch(team),
                rescue: this.assessRescue(team),
                medical: this.assessMedical(team),
                logistics: this.assessLogistics(team),
            },
            overallScore: 0, // Would calculate based on sectors
            generatedAt: new Date(),
            validUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
        };
    }

    /**
     * Connect to Virtual OSOCC (On-Site Operations Coordination Centre)
     */
    async connectToVosocc(disasterId: string): Promise<VirtualOsocc> {
        this.virtualOsocc = {
            disasterId,
            name: `VOSOCC-${disasterId}`,
            status: 'active',
            connectedAt: new Date(),
            registeredTeams: [],
            coordinationMessages: [],
        };

        this.logger.log(`Connected to Virtual OSOCC: ${disasterId}`);

        return this.virtualOsocc;
    }

    /**
     * Submit team to VOSOCC
     */
    submitTeamToVosocc(teamId: string): UsarTeam {
        if (!this.virtualOsocc) throw new Error('Not connected to VOSOCC');

        const team = this.usarTeams.get(teamId);
        if (!team) throw new Error('Team not found');

        team.status = 'mobilizing';
        this.virtualOsocc.registeredTeams.push(teamId);

        return team;
    }

    /**
     * Generate Worksite Report
     */
    generateWorksiteReport(data: WorksiteData): WorksiteReport {
        return {
            id: `ws-${Date.now()}`,
            ...data,
            sectors: this.divideIntoSectors(data.area),
            searchProgress: 0,
            rescueProgress: 0,
            estimatedVictims: this.estimateVictims(data),
            createdAt: new Date(),
        };
    }

    /**
     * Generate INSARAG Coordination Message
     */
    generateCoordinationMessage(type: IcmType, content: any): InsaragMessage {
        const message: InsaragMessage = {
            id: `icm-${Date.now()}`,
            type,
            content,
            timestamp: new Date(),
            sender: 'Light Keepers EOC',
        };

        if (this.virtualOsocc) {
            this.virtualOsocc.coordinationMessages.push(message);
        }

        return message;
    }

    /**
     * Generate deployment checklist
     */
    getDeploymentChecklist(teamId: string): DeploymentChecklist {
        const team = this.usarTeams.get(teamId);
        if (!team) throw new Error('Team not found');

        return {
            teamId,
            items: [
                { category: 'Documentation', item: 'INSARAG Registration', required: true, completed: true },
                { category: 'Documentation', item: 'Team credentials', required: true, completed: false },
                { category: 'Equipment', item: 'Search dogs certified', required: team.classification !== 'light', completed: false },
                { category: 'Equipment', item: 'Heavy rescue equipment', required: team.classification === 'heavy', completed: false },
                { category: 'Medical', item: 'Team medic assigned', required: true, completed: true },
                { category: 'Logistics', item: 'Self-sufficiency supplies (7 days)', required: true, completed: false },
                { category: 'Communication', item: 'VOSOCC access configured', required: true, completed: !!this.virtualOsocc },
            ],
            overallProgress: 0.3,
            readyForDeployment: false,
        };
    }

    // Private assessment methods
    private assessManagement(team: UsarTeam): SectorAssessment {
        return { score: 80, notes: 'Management structure in place', gaps: [] };
    }

    private assessSearch(team: UsarTeam): SectorAssessment {
        return { score: 75, notes: 'Search capabilities verified', gaps: ['Need additional K9 units'] };
    }

    private assessRescue(team: UsarTeam): SectorAssessment {
        return { score: 70, notes: 'Basic rescue equipment available', gaps: [] };
    }

    private assessMedical(team: UsarTeam): SectorAssessment {
        return { score: 85, notes: 'Medical team fully staffed', gaps: [] };
    }

    private assessLogistics(team: UsarTeam): SectorAssessment {
        return { score: 65, notes: 'Logistics need improvement', gaps: ['Insufficient transport capacity'] };
    }

    private divideIntoSectors(area: any): WorksiteSector[] {
        return [
            { id: 'A', name: 'Sector A', status: 'pending', priority: 1 },
            { id: 'B', name: 'Sector B', status: 'pending', priority: 2 },
        ];
    }

    private estimateVictims(data: WorksiteData): VictimEstimate {
        return {
            minimum: data.populationDensity * 0.01,
            maximum: data.populationDensity * 0.05,
            confidence: 0.6,
        };
    }
}

// Types
interface UsarTeamRegistration {
    name: string;
    country: string;
    organization: string;
    classification?: 'light' | 'medium' | 'heavy';
    personnel: number;
    capabilities: string[];
    contactEmail: string;
}

interface UsarTeam extends UsarTeamRegistration {
    id: string;
    classification: 'light' | 'medium' | 'heavy';
    status: 'standby' | 'mobilizing' | 'deployed' | 'returning';
    currentDeployment: string | null;
    registeredAt: Date;
}

interface IecReport {
    teamId: string;
    teamName: string;
    country: string;
    classification: string;
    sectors: {
        management: SectorAssessment;
        search: SectorAssessment;
        rescue: SectorAssessment;
        medical: SectorAssessment;
        logistics: SectorAssessment;
    };
    overallScore: number;
    generatedAt: Date;
    validUntil: Date;
}

interface SectorAssessment {
    score: number;
    notes: string;
    gaps: string[];
}

interface VirtualOsocc {
    disasterId: string;
    name: string;
    status: 'active' | 'closed';
    connectedAt: Date;
    registeredTeams: string[];
    coordinationMessages: InsaragMessage[];
}

type IcmType = 'situation_update' | 'resource_request' | 'team_status' | 'coordination';

interface InsaragMessage {
    id: string;
    type: IcmType;
    content: any;
    timestamp: Date;
    sender: string;
}

interface WorksiteData {
    name: string;
    location: { lat: number; lng: number };
    area: any;
    buildingType: string;
    populationDensity: number;
}

interface WorksiteReport extends WorksiteData {
    id: string;
    sectors: WorksiteSector[];
    searchProgress: number;
    rescueProgress: number;
    estimatedVictims: VictimEstimate;
    createdAt: Date;
}

interface WorksiteSector {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: number;
}

interface VictimEstimate {
    minimum: number;
    maximum: number;
    confidence: number;
}

interface DeploymentChecklist {
    teamId: string;
    items: { category: string; item: string; required: boolean; completed: boolean }[];
    overallProgress: number;
    readyForDeployment: boolean;
}
