// VMS (Volunteer Management System) API Services
import api from './client';

// ========== Skills API ==========
export interface Skill {
    id: string;
    code: string;
    name: string;
    category: 'water' | 'mountain' | 'medical' | 'mechanical' | 'communication' | 'drone' | 'other';
    description?: string;
    sortOrder: number;
    isActive: boolean;
}

export interface SkillCategory {
    code: string;
    name: string;
}

export const skillsApi = {
    getAll: (activeOnly = true) =>
        api.get<Skill[]>(`/skills?activeOnly=${activeOnly}`),

    getById: (id: string) =>
        api.get<Skill>(`/skills/${id}`),

    getCategories: () =>
        api.get<SkillCategory[]>('/skills/categories'),

    create: (data: Partial<Skill>) =>
        api.post<Skill>('/skills', data),

    update: (id: string, data: Partial<Skill>) =>
        api.patch<Skill>(`/skills/${id}`, data),

    seedDefaults: () =>
        api.post('/skills/seed'),
};

// ========== Vehicles API ==========
export type VehicleType = 'car' | 'motorcycle' | 'boat' | 'atv' | 'truck' | 'other';
export type VehiclePurpose = 'rescue' | 'transport' | 'towing' | 'patrol' | 'other';

export interface VolunteerVehicle {
    id: string;
    volunteerId: string;
    licensePlate: string;
    vehicleType: VehicleType;
    brand?: string;
    model?: string;
    engineCc?: number;
    color?: string;
    purposes?: VehiclePurpose[];
    modifications?: string;
    insuranceCompany?: string;
    insurancePolicyNo?: string;
    insuranceExpiresAt?: string;
    photoUrl?: string;
    notes?: string;
    isActive: boolean;
}

export const vehiclesApi = {
    getByVolunteer: (volunteerId: string) =>
        api.get<VolunteerVehicle[]>(`/vehicles/volunteer/${volunteerId}`),

    getById: (id: string) =>
        api.get<VolunteerVehicle>(`/vehicles/${id}`),

    getTypes: () =>
        api.get<{ code: VehicleType; name: string }[]>('/vehicles/types'),

    getPurposes: () =>
        api.get<{ code: VehiclePurpose; name: string }[]>('/vehicles/purposes'),

    getExpiringInsurance: (days = 30) =>
        api.get<VolunteerVehicle[]>(`/vehicles/expiring?days=${days}`),

    create: (data: Partial<VolunteerVehicle>) =>
        api.post<VolunteerVehicle>('/vehicles', data),

    update: (id: string, data: Partial<VolunteerVehicle>) =>
        api.patch<VolunteerVehicle>(`/vehicles/${id}`, data),

    delete: (id: string) =>
        api.delete(`/vehicles/${id}`),
};

// ========== Insurance API ==========
export type InsuranceType = 'personal' | 'group' | 'task_specific';

export interface VolunteerInsurance {
    id: string;
    volunteerId: string;
    insuranceType: InsuranceType;
    insuranceCompany: string;
    policyNumber?: string;
    coverageType?: string;
    coverageAmount?: number;
    validFrom: string;
    validTo: string;
    coversTasks?: string[];
    isActive: boolean;
    fileUrl?: string;
    notes?: string;
}

export interface CoverageCheck {
    hasCoverage: boolean;
    insurances: VolunteerInsurance[];
}

export const insuranceApi = {
    getByVolunteer: (volunteerId: string) =>
        api.get<VolunteerInsurance[]>(`/insurance/volunteer/${volunteerId}`),

    getActiveByVolunteer: (volunteerId: string) =>
        api.get<VolunteerInsurance[]>(`/insurance/volunteer/${volunteerId}/active`),

    getById: (id: string) =>
        api.get<VolunteerInsurance>(`/insurance/${id}`),

    getTypes: () =>
        api.get<{ code: InsuranceType; name: string }[]>('/insurance/types'),

    getExpiring: (days = 30) =>
        api.get<VolunteerInsurance[]>(`/insurance/expiring?days=${days}`),

    checkCoverage: (volunteerId: string, taskType?: string) =>
        api.post<CoverageCheck>('/insurance/check-coverage', { volunteerId, taskType }),

    create: (data: Partial<VolunteerInsurance>) =>
        api.post<VolunteerInsurance>('/insurance', data),

    update: (id: string, data: Partial<VolunteerInsurance>) =>
        api.patch<VolunteerInsurance>(`/insurance/${id}`, data),

    delete: (id: string) =>
        api.delete(`/insurance/${id}`),
};

// ========== Points API ==========
export type PointsRecordType = 'task' | 'training' | 'special' | 'adjustment';

export interface PointsRecord {
    id: string;
    volunteerId: string;
    taskId?: string;
    recordType: PointsRecordType;
    hours: number;
    points: number;
    multiplier: number;
    description?: string;
    recordedBy?: string;
    createdAt: string;
}

export interface PointsSummary {
    totalHours: number;
    totalPoints: number;
    taskCount: number;
    trainingCount: number;
    byType: Record<PointsRecordType, { hours: number; points: number }>;
}

export const pointsApi = {
    getByVolunteer: (volunteerId: string) =>
        api.get<PointsRecord[]>(`/points/volunteer/${volunteerId}`),

    getSummary: (volunteerId: string) =>
        api.get<PointsSummary>(`/points/volunteer/${volunteerId}/summary`),

    getYearlySummary: (volunteerId: string, year: number) =>
        api.get<PointsSummary>(`/points/volunteer/${volunteerId}/yearly/${year}`),

    recordTask: (data: {
        volunteerId: string;
        taskId: string;
        hours: number;
        isNight?: boolean;
        isHighRisk?: boolean;
        description?: string;
        recordedBy?: string;
    }) => api.post<PointsRecord>('/points/task', data),

    recordTraining: (data: {
        volunteerId: string;
        hours: number;
        description: string;
        recordedBy?: string;
    }) => api.post<PointsRecord>('/points/training', data),

    adjustPoints: (data: {
        volunteerId: string;
        points: number;
        description: string;
        recordedBy: string;
    }) => api.post<PointsRecord>('/points/adjust', data),

    exportReport: (startDate: string, endDate: string) =>
        api.get(`/points/export?startDate=${startDate}&endDate=${endDate}`),
};
