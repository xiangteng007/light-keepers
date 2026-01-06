import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types matching backend DTOs
export interface OverlayDto {
    id: string;
    sessionId: string;
    type: 'aoi' | 'hazard' | 'poi' | 'line' | 'polygon';
    code?: string;
    name?: string;
    geometry: GeoJSON.Geometry;
    hazardType?: string;
    severity?: number;
    hazardStatus?: 'active' | 'watch' | 'cleared';
    confidence?: number;
    poiType?: string;
    capacity?: number;
    locationId?: string;
    followLocation: boolean;
    props: Record<string, any>;
    state: 'draft' | 'published' | 'removed';
    version: number;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    lockedBy?: string;
    lockedUntil?: string;
}

export interface CreateOverlayDto {
    type: 'aoi' | 'hazard' | 'poi' | 'line' | 'polygon';
    code?: string;
    name?: string;
    geometry: GeoJSON.Geometry;
    hazardType?: string;
    severity?: number;
    hazardStatus?: 'active' | 'watch' | 'cleared';
    confidence?: number;
    poiType?: string;
    capacity?: number;
    locationId?: string;
    followLocation?: boolean;
    props?: Record<string, any>;
}

export interface UpdateOverlayDto extends Partial<CreateOverlayDto> {
    version: number;
}

export interface LocationAliasDto {
    id: string;
    alias: string;
    language: string;
}

export interface LocationDto {
    id: string;
    source: string;
    sourceId?: string;
    name: string;
    category: string;
    geometry: { type: 'Point'; coordinates: [number, number] };
    address?: string;
    city?: string;
    district?: string;
    props: Record<string, any>;
    version: number;
    updatedAt: string;
    aliases?: LocationAliasDto[];
}

// Get auth header
function getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Overlays API
export const overlaysApi = {
    // List overlays for a session
    async list(sessionId: string, options?: { since?: string; type?: string; state?: string }): Promise<OverlayDto[]> {
        const params = new URLSearchParams();
        if (options?.since) params.set('since', options.since);
        if (options?.type) params.set('type', options.type);
        if (options?.state) params.set('state', options.state);

        const response = await axios.get(
            `${API_URL}/mission-sessions/${sessionId}/overlays?${params}`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Get single overlay
    async get(sessionId: string, overlayId: string): Promise<OverlayDto> {
        const response = await axios.get(
            `${API_URL}/mission-sessions/${sessionId}/overlays/${overlayId}`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Create overlay
    async create(sessionId: string, dto: CreateOverlayDto): Promise<OverlayDto> {
        const response = await axios.post(
            `${API_URL}/mission-sessions/${sessionId}/overlays`,
            dto,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Update overlay with optimistic locking
    async update(sessionId: string, overlayId: string, dto: UpdateOverlayDto): Promise<OverlayDto> {
        const response = await axios.patch(
            `${API_URL}/mission-sessions/${sessionId}/overlays/${overlayId}`,
            dto,
            {
                headers: {
                    ...getAuthHeader(),
                    'If-Match': dto.version.toString(),
                },
            }
        );
        return response.data;
    },

    // Publish overlay
    async publish(sessionId: string, overlayId: string): Promise<OverlayDto> {
        const response = await axios.post(
            `${API_URL}/mission-sessions/${sessionId}/overlays/${overlayId}/publish`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Delete overlay (soft delete)
    async delete(sessionId: string, overlayId: string): Promise<void> {
        await axios.delete(
            `${API_URL}/mission-sessions/${sessionId}/overlays/${overlayId}`,
            { headers: getAuthHeader() }
        );
    },

    // Acquire lock
    async acquireLock(sessionId: string, overlayId: string): Promise<{ success: boolean; expiresAt: string }> {
        const response = await axios.post(
            `${API_URL}/mission-sessions/${sessionId}/overlays/${overlayId}/lock`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Release lock
    async releaseLock(sessionId: string, overlayId: string): Promise<{ success: boolean }> {
        const response = await axios.delete(
            `${API_URL}/mission-sessions/${sessionId}/overlays/${overlayId}/lock`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Search locations (convenience wrapper)
    async searchLocations(options: {
        query: string;
        bbox?: [number, number, number, number];
        limit?: number
    }): Promise<LocationDto[]> {
        const params = new URLSearchParams();
        params.set('q', options.query);
        if (options.bbox) {
            params.set('bbox', options.bbox.join(','));
        }
        if (options.limit) {
            params.set('limit', options.limit.toString());
        }

        const response = await axios.get(
            `${API_URL}/locations/search?${params}`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },
};

// Locations API
export const locationsApi = {
    // Search locations
    async search(options: { q: string; category?: string; bbox?: string; limit?: number }): Promise<LocationDto[]> {
        const params = new URLSearchParams();
        params.set('q', options.q);
        if (options.category) params.set('category', options.category);
        if (options.bbox) params.set('bbox', options.bbox);
        if (options.limit) params.set('limit', options.limit.toString());

        const response = await axios.get(
            `${API_URL}/locations/search?${params}`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    // Get location changes
    async getChanges(since: string): Promise<LocationDto[]> {
        const response = await axios.get(
            `${API_URL}/locations/changes?since=${encodeURIComponent(since)}`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },
};

export default { overlaysApi, locationsApi };
