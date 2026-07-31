/**
 * Field Reports API Service
 * Handles REST API calls for field reports, SOS, and live locations
 */
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

// Types
export interface FieldReport {
    id: string;
    missionSessionId: string;
    reporterUserId: string;
    reporterName: string;
    type: 'incident' | 'resource' | 'medical' | 'traffic' | 'sos' | 'other';
    category?: string;
    severity: number;
    confidence: number;
    status: 'new' | 'triaged' | 'task_created' | 'assigned' | 'in_progress' | 'closed' | 'cancelled';
    message?: string;
    geom: GeoJSON.Point;
    accuracyM?: number;
    occurredAt: string;
    attachmentsCount: number;
    metadata: Record<string, any>;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface SosSignal {
    id: string;
    missionSessionId: string;
    reportId?: string;
    userId: string;
    userName: string;
    status: 'active' | 'acked' | 'resolved' | 'cancelled';
    triggerGeom: GeoJSON.Point;
    triggerAccuracyM?: number;
    ackedBy?: string;
    ackedAt?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt: string;
}

export interface LiveLocation {
    userId: string;
    displayName: string;
    callsign?: string;
    lat: number;
    lng: number;
    accuracyM?: number;
    heading?: number;
    speed?: number;
    lastAt: string;
    mode: 'mission' | 'sos';
    isStale: boolean;
}

export interface ReportAttachment {
    id: string;
    reportId: string;
    kind: 'photo' | 'video' | 'file';
    mime: string;
    size: number;
    uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
    capturedAt?: string;
    showOnMap: boolean;
    thumbnailUrl?: string;
}

// Query params
interface ReportsQuery {
    since?: string;
    bbox?: string;
    type?: string;
    severity?: string;
    status?: string;
    limit?: number;
}

// API functions
export const fieldReportsApi = {
    // Reports
    async getReports(missionSessionId: string, query: ReportsQuery = {}, token: string): Promise<{
        data: FieldReport[];
        cursor: string;
        hasMore: boolean;
    }> {
        const params = new URLSearchParams();
        if (query.since) params.set('since', query.since);
        if (query.bbox) params.set('bbox', query.bbox);
        if (query.type) params.set('type', query.type);
        if (query.severity) params.set('severity', query.severity);
        if (query.status) params.set('status', query.status);
        if (query.limit) params.set('limit', query.limit.toString());

        try {
            const { data } = await api.get(`/mission-sessions/${missionSessionId}/reports`, {
                params,
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to fetch reports'));
        }
    },

    async createReport(missionSessionId: string, report: {
        type: string;
        category?: string;
        severity: number;
        confidence?: number;
        message?: string;
        latitude: number;
        longitude: number;
        accuracyM?: number;
        occurredAt?: string;
        metadata?: Record<string, any>;
    }, token: string): Promise<FieldReport> {
        try {
            const { data } = await api.post(`/mission-sessions/${missionSessionId}/reports`, report, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to create report'));
        }
    },

    async updateReport(reportId: string, update: {
        status?: string;
        severity?: number;
        message?: string;
        metadata?: Record<string, any>;
    }, version: number, token: string): Promise<FieldReport> {
        try {
            const { data } = await api.patch(`/reports/${reportId}`, update, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'If-Match': `"${version}"`,
                },
            });
            return data;
        } catch (err: any) {
            if (err?.response?.status === 409) {
                throw new Error(`VERSION_CONFLICT:${err.response.data.currentVersion}`);
            }
            throw new Error(getApiErrorMessage(err, 'Failed to update report'));
        }
    },

    // SOS
    async triggerSos(missionSessionId: string, sos: {
        latitude: number;
        longitude: number;
        accuracyM?: number;
        message?: string;
    }, token: string): Promise<{ sosId: string; reportId: string; status: string }> {
        try {
            const { data } = await api.post(`/mission-sessions/${missionSessionId}/sos`, sos, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to trigger SOS'));
        }
    },

    async ackSos(sosId: string, note?: string, token?: string): Promise<SosSignal> {
        try {
            const { data } = await api.post(`/sos/${sosId}/ack`, { note }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to ACK SOS'));
        }
    },

    async resolveSos(sosId: string, resolutionNote?: string, token?: string): Promise<SosSignal> {
        try {
            const { data } = await api.post(`/sos/${sosId}/resolve`, { resolutionNote }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to resolve SOS'));
        }
    },

    async getActiveSos(missionSessionId: string, token: string): Promise<SosSignal[]> {
        try {
            const { data } = await api.get(`/mission-sessions/${missionSessionId}/sos/active`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get active SOS'));
        }
    },

    // Live Locations
    async getLiveLocations(missionSessionId: string, token: string): Promise<GeoJSON.FeatureCollection> {
        try {
            const { data } = await api.get(`/mission-sessions/${missionSessionId}/live-locations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get live locations'));
        }
    },

    async startLocationShare(missionSessionId: string, mode: 'mission' | 'sos', token: string): Promise<any> {
        try {
            const { data } = await api.post(`/mission-sessions/${missionSessionId}/location-share/start`, { mode }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to start location share'));
        }
    },

    async stopLocationShare(missionSessionId: string, token: string): Promise<any> {
        try {
            const { data } = await api.post(`/mission-sessions/${missionSessionId}/location-share/stop`, undefined, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to stop location share'));
        }
    },

    // Photo Evidence
    async getPhotoEvidence(missionSessionId: string, bbox?: string, token?: string): Promise<GeoJSON.FeatureCollection> {
        try {
            const { data } = await api.get(`/mission-sessions/${missionSessionId}/photo-evidence`, {
                params: bbox ? { bbox } : undefined,
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get photo evidence'));
        }
    },

    // Attachments
    async initiateUpload(reportId: string, upload: {
        kind: 'photo' | 'video' | 'file';
        mime: string;
        size: number;
        sha256?: string;
        originalFilename?: string;
        capturedAt?: string;
        photoLatitude?: number;
        photoLongitude?: number;
        photoAccuracyM?: number;
        locationSource: 'exif' | 'device' | 'manual' | 'unknown';
        showOnMap?: boolean;
        exifJson?: Record<string, any>;
    }, token: string): Promise<{
        attachmentId: string;
        uploadUrl: string;
        uploadMethod: string;
        expiresAt: string;
    }> {
        try {
            const { data } = await api.post(`/reports/${reportId}/attachments/initiate`, upload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to initiate upload'));
        }
    },

    async completeUpload(reportId: string, attachmentId: string, success: boolean, token: string): Promise<ReportAttachment> {
        try {
            const { data } = await api.post(`/reports/${reportId}/attachments/${attachmentId}/complete`, { success }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to complete upload'));
        }
    },
};

export default fieldReportsApi;
