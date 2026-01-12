/**
 * geo-intel-hub.service.ts
 * Frontend Client for GeoIntelHub
 */
import api from '../api';

export interface GeoAlert {
    id: string;
    source: 'ncdr' | 'weather' | 'cwa' | 'social';
    severity: 'info' | 'advisory' | 'watch' | 'warning' | 'critical';
    title: string;
    description: string;
    location?: string;
    coordinates?: [number, number];
    startTime: string;
    urgency?: number;
}

export const geoIntelHub = {
    getActiveAlerts: (filter?: { source?: string; severity?: string }) =>
        api.get<GeoAlert[]>('/geo-intel/alerts', { params: filter }),

    getMapAlerts: () =>
        api.get<GeoAlert[]>('/geo-intel/map-alerts'),

    getSummary: () =>
        api.get('/geo-intel/summary'),

    // 外部來源強制同步
    syncWeather: () => api.post('/geo-intel/sync/weather'),
    syncNcdr: () => api.post('/geo-intel/sync/ncdr'),
};
