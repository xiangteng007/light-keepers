/**
 * Field Reports API Service
 * Handles REST API calls for field reports, SOS, and live locations
 */

const API_URL = import.meta.env.VITE_API_URL || '';

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

        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/reports?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status}`);
        return res.json();
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
        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(report),
        });
        if (!res.ok) throw new Error(`Failed to create report: ${res.status}`);
        return res.json();
    },

    async updateReport(reportId: string, update: {
        status?: string;
        severity?: number;
        message?: string;
        metadata?: Record<string, any>;
    }, version: number, token: string): Promise<FieldReport> {
        const res = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'If-Match': `"${version}"`,
            },
            body: JSON.stringify(update),
        });
        if (res.status === 409) {
            const error = await res.json();
            throw new Error(`VERSION_CONFLICT:${error.currentVersion}`);
        }
        if (!res.ok) throw new Error(`Failed to update report: ${res.status}`);
        return res.json();
    },

    // SOS
    async triggerSos(missionSessionId: string, sos: {
        latitude: number;
        longitude: number;
        accuracyM?: number;
        message?: string;
    }, token: string): Promise<{ sosId: string; reportId: string; status: string }> {
        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/sos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(sos),
        });
        if (!res.ok) throw new Error(`Failed to trigger SOS: ${res.status}`);
        return res.json();
    },

    async ackSos(sosId: string, note?: string, token?: string): Promise<SosSignal> {
        const res = await fetch(`${API_URL}/sos/${sosId}/ack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ note }),
        });
        if (!res.ok) throw new Error(`Failed to ACK SOS: ${res.status}`);
        return res.json();
    },

    async resolveSos(sosId: string, resolutionNote?: string, token?: string): Promise<SosSignal> {
        const res = await fetch(`${API_URL}/sos/${sosId}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ resolutionNote }),
        });
        if (!res.ok) throw new Error(`Failed to resolve SOS: ${res.status}`);
        return res.json();
    },

    async getActiveSos(missionSessionId: string, token: string): Promise<SosSignal[]> {
        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/sos/active`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get active SOS: ${res.status}`);
        return res.json();
    },

    // Live Locations
    async getLiveLocations(missionSessionId: string, token: string): Promise<GeoJSON.FeatureCollection> {
        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/live-locations`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get live locations: ${res.status}`);
        return res.json();
    },

    async startLocationShare(missionSessionId: string, mode: 'mission' | 'sos', token: string): Promise<any> {
        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/location-share/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ mode }),
        });
        if (!res.ok) throw new Error(`Failed to start location share: ${res.status}`);
        return res.json();
    },

    async stopLocationShare(missionSessionId: string, token: string): Promise<any> {
        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/location-share/stop`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to stop location share: ${res.status}`);
        return res.json();
    },

    // Photo Evidence
    async getPhotoEvidence(missionSessionId: string, bbox?: string, token?: string): Promise<GeoJSON.FeatureCollection> {
        const params = new URLSearchParams();
        if (bbox) params.set('bbox', bbox);

        const res = await fetch(`${API_URL}/mission-sessions/${missionSessionId}/photo-evidence?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get photo evidence: ${res.status}`);
        return res.json();
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
        const res = await fetch(`${API_URL}/reports/${reportId}/attachments/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(upload),
        });
        if (!res.ok) throw new Error(`Failed to initiate upload: ${res.status}`);
        return res.json();
    },

    async completeUpload(reportId: string, attachmentId: string, success: boolean, token: string): Promise<ReportAttachment> {
        const res = await fetch(`${API_URL}/reports/${reportId}/attachments/${attachmentId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ success }),
        });
        if (!res.ok) throw new Error(`Failed to complete upload: ${res.status}`);
        return res.json();
    },
};

export default fieldReportsApi;
