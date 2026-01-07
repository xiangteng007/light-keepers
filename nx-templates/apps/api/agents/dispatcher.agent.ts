/**
 * Dispatcher Agent - Dynamic Fatigue Monitoring & Auto-Dispatch
 * File: apps/api/src/app/agents/dispatcher.agent.ts
 * 
 * 🤖 AI Agent that listens to telemetry events and manages volunteer fatigue.
 * 
 * Fatigue Policy:
 * - WARNING: Heart Rate > 150 bpm sustained for 10 minutes
 * - CRITICAL: Heart Rate > 175 bpm sustained for 2 minutes
 * 
 * Actions:
 * - Warning: Notify supervisor, continue monitoring
 * - Critical: Auto-reassign tasks, emit HEART_RATE_CRITICAL event
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    TELEMETRY_EVENTS,
    HeartRateReadingEvent,
    VOLUNTEER_EVENTS,
    HeartRateCriticalEvent,
    HeartRateWarningEvent,
    GEO_INTEL_EVENTS,
    DisasterDetectedEvent,
    DISPATCHER_EVENTS,
    VolunteerFatigueDetectedEvent,
    MISSION_EVENTS,
    TaskReassignedEvent,
} from '@light-keepers/shared/events';

// ============================================================
// Configuration Constants
// ============================================================

const FATIGUE_CONFIG = {
    WARNING_THRESHOLD_BPM: 150,
    WARNING_DURATION_MINUTES: 10,
    CRITICAL_THRESHOLD_BPM: 175,
    CRITICAL_DURATION_MINUTES: 2,
    READING_INTERVAL_SECONDS: 10,
    // How many consecutive readings to trigger
    get WARNING_READINGS_REQUIRED() {
        return (this.WARNING_DURATION_MINUTES * 60) / this.READING_INTERVAL_SECONDS;
    },
    get CRITICAL_READINGS_REQUIRED() {
        return (this.CRITICAL_DURATION_MINUTES * 60) / this.READING_INTERVAL_SECONDS;
    },
} as const;

// ============================================================
// In-Memory State (Replace with Redis in production)
// ============================================================

interface VolunteerTelemetryState {
    volunteerId: string;
    volunteerName?: string;
    currentHeartRate: number;
    elevatedReadingsCount: number; // Consecutive readings above threshold
    criticalReadingsCount: number;
    lastLocation?: { latitude: number; longitude: number };
    currentTaskId?: string;
    lastReadingAt: Date;
    status: 'normal' | 'warning' | 'critical';
}

@Injectable()
export class DispatcherAgent implements OnModuleInit {
    private readonly logger = new Logger(DispatcherAgent.name);

    // Volunteer ID -> Telemetry State
    private volunteerStates = new Map<string, VolunteerTelemetryState>();

    constructor(private readonly eventEmitter: EventEmitter2) { }

    onModuleInit() {
        this.logger.log('🤖 Dispatcher Agent initialized');
        this.logger.log(`   ⚠️ Warning: HR > ${FATIGUE_CONFIG.WARNING_THRESHOLD_BPM} bpm for ${FATIGUE_CONFIG.WARNING_DURATION_MINUTES} min`);
        this.logger.log(`   🚨 Critical: HR > ${FATIGUE_CONFIG.CRITICAL_THRESHOLD_BPM} bpm for ${FATIGUE_CONFIG.CRITICAL_DURATION_MINUTES} min`);
    }

    // ============================================================
    // Event Listeners
    // ============================================================

    /**
     * 👂 Listen for heart rate readings from wearable devices
     * This is the PRIMARY data source - no DB polling!
     */
    @OnEvent(TELEMETRY_EVENTS.HEART_RATE_READING)
    async handleHeartRateReading(event: HeartRateReadingEvent) {
        const { volunteerId, heartRate, timestamp } = event;

        // Get or initialize state
        let state = this.volunteerStates.get(volunteerId);
        if (!state) {
            state = this.initializeVolunteerState(volunteerId);
        }

        // Update current reading
        state.currentHeartRate = heartRate;
        state.lastReadingAt = new Date(timestamp);

        // Evaluate fatigue level
        await this.evaluateFatigue(state, heartRate);

        // Update state
        this.volunteerStates.set(volunteerId, state);
    }

    /**
     * 👂 Listen for GPS readings to update volunteer location
     */
    @OnEvent(TELEMETRY_EVENTS.GPS_READING)
    handleGPSReading(event: { volunteerId: string; location: any }) {
        const state = this.volunteerStates.get(event.volunteerId);
        if (state) {
            state.lastLocation = event.location;
        }
    }

    /**
     * 👂 Listen for disaster detection to prepare for auto-dispatch
     */
    @OnEvent(GEO_INTEL_EVENTS.DISASTER_DETECTED)
    async handleDisasterDetected(event: DisasterDetectedEvent) {
        this.logger.log(`🚨 [Dispatcher] Disaster detected: ${event.alertId}`);
        this.logger.log(`   Type: ${event.type}, Severity: ${event.severity}`);
        this.logger.log(`   Location: ${event.location.latitude}, ${event.location.longitude}`);

        if (event.requiresImmediateResponse) {
            await this.prepareAutoDispatch(event);
        }
    }

    // ============================================================
    // Core Fatigue Evaluation Logic
    // ============================================================

    private async evaluateFatigue(state: VolunteerTelemetryState, heartRate: number): Promise<void> {
        const previousStatus = state.status;

        // Check CRITICAL threshold first (higher priority)
        if (heartRate > FATIGUE_CONFIG.CRITICAL_THRESHOLD_BPM) {
            state.criticalReadingsCount++;
            state.elevatedReadingsCount++; // Also counts as elevated

            if (state.criticalReadingsCount >= FATIGUE_CONFIG.CRITICAL_READINGS_REQUIRED) {
                await this.handleCriticalFatigue(state);
                state.status = 'critical';
            }
        }
        // Check WARNING threshold
        else if (heartRate > FATIGUE_CONFIG.WARNING_THRESHOLD_BPM) {
            state.elevatedReadingsCount++;
            state.criticalReadingsCount = 0; // Reset critical counter

            if (state.elevatedReadingsCount >= FATIGUE_CONFIG.WARNING_READINGS_REQUIRED) {
                if (previousStatus === 'normal') {
                    await this.handleWarningFatigue(state);
                }
                state.status = 'warning';
            }
        }
        // Normal reading - reset counters
        else {
            state.elevatedReadingsCount = 0;
            state.criticalReadingsCount = 0;

            // If recovering from warning/critical, log it
            if (previousStatus !== 'normal') {
                this.logger.log(`✅ [Dispatcher] Volunteer ${state.volunteerId} heart rate normalized`);
            }
            state.status = 'normal';
        }
    }

    private async handleWarningFatigue(state: VolunteerTelemetryState): Promise<void> {
        this.logger.warn(`⚠️ [Dispatcher] WARNING: Volunteer ${state.volunteerId} elevated HR`);
        this.logger.warn(`   Heart Rate: ${state.currentHeartRate} bpm`);
        this.logger.warn(`   Duration: ${FATIGUE_CONFIG.WARNING_DURATION_MINUTES} minutes`);

        // Emit warning event
        const warningEvent: HeartRateWarningEvent = {
            volunteerId: state.volunteerId,
            volunteerName: state.volunteerName || 'Unknown',
            heartRate: state.currentHeartRate,
            sustainedDurationMinutes: FATIGUE_CONFIG.WARNING_DURATION_MINUTES,
            timestamp: new Date(),
        };

        this.eventEmitter.emit(VOLUNTEER_EVENTS.HEART_RATE_WARNING, warningEvent);

        // Emit internal dispatcher event
        const fatigueEvent: VolunteerFatigueDetectedEvent = {
            volunteerId: state.volunteerId,
            fatigueLevel: 'warning',
            heartRate: state.currentHeartRate,
            workDurationMinutes: FATIGUE_CONFIG.WARNING_DURATION_MINUTES,
            recommendedAction: 'monitor',
            timestamp: new Date(),
        };

        this.eventEmitter.emit(DISPATCHER_EVENTS.VOLUNTEER_FATIGUE_DETECTED, fatigueEvent);
    }

    private async handleCriticalFatigue(state: VolunteerTelemetryState): Promise<void> {
        this.logger.error(`🚨 [Dispatcher] CRITICAL: Volunteer ${state.volunteerId} dangerous HR!`);
        this.logger.error(`   Heart Rate: ${state.currentHeartRate} bpm`);
        this.logger.error(`   Duration: ${FATIGUE_CONFIG.CRITICAL_DURATION_MINUTES} minutes`);
        this.logger.error(`   ➡️ Initiating auto-reassignment...`);

        // Emit CRITICAL event (this is what other systems listen for)
        const criticalEvent: HeartRateCriticalEvent = {
            volunteerId: state.volunteerId,
            volunteerName: state.volunteerName || 'Unknown',
            heartRate: state.currentHeartRate,
            sustainedDurationMinutes: FATIGUE_CONFIG.CRITICAL_DURATION_MINUTES,
            location: state.lastLocation || { latitude: 0, longitude: 0 },
            currentTaskId: state.currentTaskId,
            timestamp: new Date(),
        };

        this.eventEmitter.emit(VOLUNTEER_EVENTS.HEART_RATE_CRITICAL, criticalEvent);

        // Auto-reassign tasks
        if (state.currentTaskId) {
            await this.autoReassignTask(state);
        }

        // Emit internal fatigue event
        const fatigueEvent: VolunteerFatigueDetectedEvent = {
            volunteerId: state.volunteerId,
            fatigueLevel: 'critical',
            heartRate: state.currentHeartRate,
            workDurationMinutes: FATIGUE_CONFIG.CRITICAL_DURATION_MINUTES,
            recommendedAction: 'reassign',
            timestamp: new Date(),
        };

        this.eventEmitter.emit(DISPATCHER_EVENTS.VOLUNTEER_FATIGUE_DETECTED, fatigueEvent);
    }

    // ============================================================
    // Auto-Dispatch Logic
    // ============================================================

    private async autoReassignTask(state: VolunteerTelemetryState): Promise<void> {
        this.logger.log(`🔄 [Dispatcher] Auto-reassigning task ${state.currentTaskId}`);

        // In production: Query available volunteers via service or cache
        // For now, emit event for mission-command domain to handle
        const reassignEvent: TaskReassignedEvent = {
            taskId: state.currentTaskId!,
            previousVolunteerId: state.volunteerId,
            newVolunteerId: 'pending-assignment', // Mission-command will fill this
            reason: 'fatigue',
            timestamp: new Date(),
        };

        this.eventEmitter.emit(MISSION_EVENTS.TASK_REASSIGNED, reassignEvent);
    }

    private async prepareAutoDispatch(event: DisasterDetectedEvent): Promise<void> {
        this.logger.log(`🚀 [Dispatcher] Preparing auto-dispatch for ${event.severity} disaster`);

        // Find available volunteers near the disaster location
        // This would typically query a geospatial index
        const nearbyVolunteers = this.findNearbyAvailableVolunteers(
            event.location,
            event.affectedRadiusMeters
        );

        this.logger.log(`   Found ${nearbyVolunteers.length} available volunteers nearby`);

        this.eventEmitter.emit(DISPATCHER_EVENTS.AUTO_DISPATCH_TRIGGERED, {
            alertId: event.alertId,
            eligibleVolunteers: nearbyVolunteers,
            timestamp: new Date(),
        });
    }

    private findNearbyAvailableVolunteers(location: any, radius: number): string[] {
        // Filter volunteers by:
        // 1. Status is 'normal' (not fatigued)
        // 2. Has valid location
        // 3. Within radius (Haversine calculation in production)
        const available: string[] = [];

        for (const [volunteerId, state] of this.volunteerStates) {
            if (state.status === 'normal' && state.lastLocation && !state.currentTaskId) {
                available.push(volunteerId);
            }
        }

        return available;
    }

    // ============================================================
    // Scheduled Tasks
    // ============================================================

    /**
     * 🕐 Every 5 minutes: Clean up stale volunteer states
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    handleStaleStateCleanup() {
        const staleThresholdMs = 15 * 60 * 1000; // 15 minutes
        const now = Date.now();

        for (const [volunteerId, state] of this.volunteerStates) {
            if (now - state.lastReadingAt.getTime() > staleThresholdMs) {
                this.logger.debug(`🧹 Removing stale state for volunteer ${volunteerId}`);
                this.volunteerStates.delete(volunteerId);
            }
        }
    }

    // ============================================================
    // Helpers
    // ============================================================

    private initializeVolunteerState(volunteerId: string): VolunteerTelemetryState {
        return {
            volunteerId,
            currentHeartRate: 0,
            elevatedReadingsCount: 0,
            criticalReadingsCount: 0,
            lastReadingAt: new Date(),
            status: 'normal',
        };
    }

    /**
     * 📊 Get current status of all monitored volunteers (for debugging)
     */
    getVolunteerStatuses(): Map<string, VolunteerTelemetryState> {
        return new Map(this.volunteerStates);
    }
}
