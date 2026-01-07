/**
 * Shared Events - Event Definitions for Cross-Domain Communication
 * File: libs/shared/events/src/lib/events.ts
 * 
 * 📡 All inter-domain communication MUST use these events.
 * Direct service calls between domains are FORBIDDEN.
 */

import { GeoLocationDto, DisasterSeverity, DisasterType } from '@light-keepers/shared/dtos';

// ============================================================
// Geo Intel Events
// ============================================================

export const GEO_INTEL_EVENTS = {
    DISASTER_DETECTED: 'geo-intel.disaster_detected',
    DISASTER_UPDATED: 'geo-intel.disaster_updated',
    DISASTER_RESOLVED: 'geo-intel.disaster_resolved',
    SOCIAL_MEDIA_ALERT: 'geo-intel.social_media_alert',
    WEATHER_WARNING: 'geo-intel.weather_warning',
} as const;

export interface DisasterDetectedEvent {
    alertId: string;
    type: DisasterType;
    severity: DisasterSeverity;
    location: GeoLocationDto;
    timestamp: Date;
    affectedRadiusMeters: number;
    source: string;
    requiresImmediateResponse: boolean;
}

export interface SocialMediaAlertEvent {
    platform: 'instagram' | 'facebook' | 'twitter' | 'line';
    postId: string;
    content: string;
    detectedKeywords: string[];
    location?: GeoLocationDto;
    confidenceScore: number; // 0-1
    timestamp: Date;
}

// ============================================================
// Volunteer Events
// ============================================================

export const VOLUNTEER_EVENTS = {
    HEART_RATE_CRITICAL: 'volunteer.heart_rate_critical',
    HEART_RATE_WARNING: 'volunteer.heart_rate_warning',
    LOCATION_UPDATED: 'volunteer.location_updated',
    STATUS_CHANGED: 'volunteer.status_changed',
    SOS_TRIGGERED: 'volunteer.sos_triggered',
    CHECK_IN: 'volunteer.check_in',
    CHECK_OUT: 'volunteer.check_out',
} as const;

export interface HeartRateCriticalEvent {
    volunteerId: string;
    volunteerName: string;
    heartRate: number;
    sustainedDurationMinutes: number;
    location: GeoLocationDto;
    currentTaskId?: string;
    timestamp: Date;
}

export interface HeartRateWarningEvent {
    volunteerId: string;
    volunteerName: string;
    heartRate: number;
    sustainedDurationMinutes: number;
    timestamp: Date;
}

export interface VolunteerLocationEvent {
    volunteerId: string;
    location: GeoLocationDto;
    speed?: number; // km/h
    heading?: number; // degrees
    timestamp: Date;
}

export interface VolunteerSOSEvent {
    volunteerId: string;
    volunteerName: string;
    location: GeoLocationDto;
    message?: string;
    timestamp: Date;
}

// ============================================================
// Mission Command Events
// ============================================================

export const MISSION_EVENTS = {
    SESSION_STARTED: 'mission.session_started',
    SESSION_ENDED: 'mission.session_ended',
    TASK_CREATED: 'mission.task_created',
    TASK_ASSIGNED: 'mission.task_assigned',
    TASK_COMPLETED: 'mission.task_completed',
    TASK_REASSIGNED: 'mission.task_reassigned',
} as const;

export interface MissionSessionStartedEvent {
    sessionId: string;
    sessionName: string;
    relatedAlertId?: string;
    incidentCommanderId: string;
    timestamp: Date;
}

export interface TaskAssignedEvent {
    taskId: string;
    sessionId: string;
    volunteerId: string;
    volunteerName: string;
    taskType: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    location: GeoLocationDto;
    timestamp: Date;
}

export interface TaskReassignedEvent {
    taskId: string;
    previousVolunteerId: string;
    newVolunteerId: string;
    reason: 'fatigue' | 'sos' | 'manual' | 'optimization';
    timestamp: Date;
}

// ============================================================
// Dispatcher Agent Events (Internal)
// ============================================================

export const DISPATCHER_EVENTS = {
    VOLUNTEER_FATIGUE_DETECTED: 'dispatcher.volunteer_fatigue_detected',
    AUTO_DISPATCH_TRIGGERED: 'dispatcher.auto_dispatch_triggered',
    REASSIGNMENT_COMPLETED: 'dispatcher.reassignment_completed',
} as const;

export interface VolunteerFatigueDetectedEvent {
    volunteerId: string;
    fatigueLevel: 'warning' | 'critical';
    heartRate: number;
    workDurationMinutes: number;
    recommendedAction: 'monitor' | 'reassign' | 'recall';
    timestamp: Date;
}

// ============================================================
// Telemetry Events (Wearable/IoT)
// ============================================================

export const TELEMETRY_EVENTS = {
    HEART_RATE_READING: 'telemetry.heart_rate_reading',
    GPS_READING: 'telemetry.gps_reading',
    DEVICE_BATTERY_LOW: 'telemetry.device_battery_low',
} as const;

export interface HeartRateReadingEvent {
    volunteerId: string;
    deviceId: string;
    heartRate: number;
    timestamp: Date;
}

export interface GPSReadingEvent {
    volunteerId: string;
    deviceId: string;
    location: GeoLocationDto;
    timestamp: Date;
}
