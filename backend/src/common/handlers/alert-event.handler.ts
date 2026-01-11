/**
 * alert-event.handler.ts
 * 
 * P7: Event Handler Example - Alert Domain Events
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface AlertEventPayload {
    eventId: string;
    eventType: string;
    aggregateId: string;
    payload: {
        alertId: string;
        source: string;
        category: string;
        severity: string;
        title: string;
        description: string;
        location?: { latitude: number; longitude: number };
        affectedArea?: object;
    };
    metadata: {
        userId?: string;
        tenantId?: string;
        correlationId?: string;
    };
    createdAt: Date;
}

@Injectable()
export class AlertEventHandler {
    private readonly logger = new Logger(AlertEventHandler.name);

    /**
     * Handle alert.received event
     * - Classify severity
     * - Auto-create incident if severe
     * - Notify relevant teams
     */
    @OnEvent('alert.received')
    async handleAlertReceived(event: AlertEventPayload): Promise<void> {
        this.logger.log(`[EVENT] Alert Received: ${event.payload.title} [${event.payload.severity}]`);

        try {
            // Check if this warrants auto-incident creation
            if (this.shouldAutoCreateIncident(event.payload.severity)) {
                await this.createIncidentFromAlert(event);
            }

            // Notify based on severity
            await this.notifyBySevetiry(event);

        } catch (error) {
            this.logger.error(`Failed to handle alert.received: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Handle alert.expired event
     * - Close related incidents if still active
     * - Archive alert data
     */
    @OnEvent('alert.expired')
    async handleAlertExpired(event: AlertEventPayload): Promise<void> {
        this.logger.log(`[EVENT] Alert Expired: ${event.payload.alertId}`);

        try {
            await this.archiveAlert(event);
        } catch (error) {
            this.logger.error(`Failed to handle alert.expired: ${error.message}`, error.stack);
            throw error;
        }
    }

    // ============================================================
    // Private helper methods
    // ============================================================

    private shouldAutoCreateIncident(severity: string): boolean {
        return ['extreme', 'severe'].includes(severity);
    }

    private async createIncidentFromAlert(event: AlertEventPayload): Promise<void> {
        this.logger.debug(`Auto-creating incident for severe alert: ${event.payload.alertId}`);
        // TODO: Integrate with incident service
    }

    private async notifyBySevetiry(event: AlertEventPayload): Promise<void> {
        this.logger.debug(`Notifying by severity: ${event.payload.severity}`);
        // TODO: Integrate with notification service
    }

    private async archiveAlert(event: AlertEventPayload): Promise<void> {
        this.logger.debug(`Archiving expired alert: ${event.payload.alertId}`);
    }
}
