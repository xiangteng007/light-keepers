/**
 * incident-event.handler.ts
 * 
 * P7: Event Handler Example - Incident Domain Events
 * 
 * Demonstrates how to handle domain events emitted via the Outbox Pattern
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface IncidentEventPayload {
    eventId: string;
    eventType: string;
    aggregateId: string;
    payload: {
        incidentId: string;
        incidentNumber?: string;
        title?: string;
        status?: string;
        priority?: number;
        location?: { latitude: number; longitude: number };
        previousStatus?: string;
        newStatus?: string;
    };
    metadata: {
        userId?: string;
        tenantId?: string;
        correlationId?: string;
    };
    createdAt: Date;
}

@Injectable()
export class IncidentEventHandler {
    private readonly logger = new Logger(IncidentEventHandler.name);

    /**
     * Handle incident.created event
     * - Notify relevant parties
     * - Update statistics
     * - Trigger initial resource allocation
     */
    @OnEvent('incident.created')
    async handleIncidentCreated(event: IncidentEventPayload): Promise<void> {
        this.logger.log(`[EVENT] Incident Created: ${event.payload.incidentNumber}`);

        try {
            // Example: Notify command center
            await this.notifyCommandCenter(event);

            // Example: Update real-time dashboard
            await this.updateDashboard(event);

            // Example: Trigger initial resource check
            await this.checkResourceAvailability(event);

        } catch (error) {
            this.logger.error(`Failed to handle incident.created: ${error.message}`, error.stack);
            throw error; // Re-throw to mark event as failed in outbox
        }
    }

    /**
     * Handle incident.status_changed event
     * - Log status transition
     * - Notify affected teams
     * - Update related tasks
     */
    @OnEvent('incident.status_changed')
    async handleStatusChanged(event: IncidentEventPayload): Promise<void> {
        const { previousStatus, newStatus, incidentNumber } = event.payload;
        this.logger.log(`[EVENT] Incident Status Changed: ${incidentNumber} (${previousStatus} → ${newStatus})`);

        try {
            // Example: Notify teams about status change
            await this.notifyTeamsOfStatusChange(event);

            // Example: If resolved, archive related tasks
            if (newStatus === 'resolved') {
                await this.handleIncidentResolved(event);
            }

        } catch (error) {
            this.logger.error(`Failed to handle incident.status_changed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Handle incident.closed event
     * - Generate AAR (After Action Report)
     * - Update statistics
     * - Archive incident data
     */
    @OnEvent('incident.closed')
    async handleIncidentClosed(event: IncidentEventPayload): Promise<void> {
        this.logger.log(`[EVENT] Incident Closed: ${event.payload.incidentNumber}`);

        try {
            // Example: Generate AAR
            await this.generateAfterActionReport(event);

            // Example: Update organization statistics
            await this.updateStatistics(event);

        } catch (error) {
            this.logger.error(`Failed to handle incident.closed: ${error.message}`, error.stack);
            throw error;
        }
    }

    // ============================================================
    // Private helper methods (stubs for demonstration)
    // ============================================================

    private async notifyCommandCenter(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Notifying command center of new incident: ${event.payload.incidentId}`);
        // TODO: Integrate with notification service
    }

    private async updateDashboard(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Updating dashboard for incident: ${event.payload.incidentId}`);
        // TODO: Push to WebSocket for real-time updates
    }

    private async checkResourceAvailability(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Checking resource availability for incident: ${event.payload.incidentId}`);
        // TODO: Integrate with resource matching service
    }

    private async notifyTeamsOfStatusChange(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Notifying teams of status change: ${event.payload.incidentId}`);
        // TODO: Integrate with notification service
    }

    private async handleIncidentResolved(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Handling resolved incident: ${event.payload.incidentId}`);
        // TODO: Archive tasks, release resources
    }

    private async generateAfterActionReport(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Generating AAR for incident: ${event.payload.incidentId}`);
        // TODO: Integrate with AAR module
    }

    private async updateStatistics(event: IncidentEventPayload): Promise<void> {
        this.logger.debug(`Updating statistics for closed incident: ${event.payload.incidentId}`);
        // TODO: Update analytics dashboard
    }
}
