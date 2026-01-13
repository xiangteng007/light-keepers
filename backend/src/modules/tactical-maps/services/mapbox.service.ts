/**
 * Mapbox Service
 * 
 * Mapbox API integration for tactical maps
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocodingResult {
    placeName: string;
    coordinates: [number, number]; // [lng, lat]
    relevance: number;
    placeType: string[];
    context?: { id: string; text: string }[];
}

export interface DirectionsResult {
    distance: number;  // meters
    duration: number;  // seconds
    geometry: any;     // GeoJSON LineString
    legs: {
        distance: number;
        duration: number;
        steps: {
            instruction: string;
            distance: number;
            duration: number;
        }[];
    }[];
}

export interface IsochroneResult {
    type: 'Feature';
    geometry: any;  // GeoJSON Polygon
    properties: {
        contour: number;
        color: string;
    };
}

@Injectable()
export class MapboxService implements OnModuleInit {
    private readonly logger = new Logger(MapboxService.name);
    private readonly accessToken: string;
    private readonly baseUrl = 'https://api.mapbox.com';

    constructor(private readonly configService: ConfigService) {
        this.accessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN', '');
    }

    onModuleInit() {
        if (!this.accessToken) {
            this.logger.warn('MAPBOX_ACCESS_TOKEN not configured');
        } else {
            this.logger.log('Mapbox Service initialized');
        }
    }

    /**
     * Check if Mapbox is configured
     */
    isConfigured(): boolean {
        return !!this.accessToken;
    }

    /**
     * Forward geocoding - address to coordinates
     */
    async geocode(address: string, options?: {
        country?: string;
        proximity?: [number, number];
        limit?: number;
    }): Promise<GeocodingResult[]> {
        if (!this.accessToken) {
            return this.getMockGeocodeResults(address);
        }

        try {
            const params = new URLSearchParams({
                access_token: this.accessToken,
                limit: (options?.limit || 5).toString(),
            });

            if (options?.country) {
                params.set('country', options.country);
            }

            if (options?.proximity) {
                params.set('proximity', options.proximity.join(','));
            }

            const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Mapbox API error: ${response.status}`);
            }

            const data = await response.json();

            return data.features.map((f: any) => ({
                placeName: f.place_name,
                coordinates: f.center,
                relevance: f.relevance,
                placeType: f.place_type,
                context: f.context,
            }));
        } catch (error: any) {
            this.logger.error(`Geocoding error: ${error.message}`);
            return this.getMockGeocodeResults(address);
        }
    }

    /**
     * Reverse geocoding - coordinates to address
     */
    async reverseGeocode(lng: number, lat: number): Promise<GeocodingResult | null> {
        if (!this.accessToken) {
            return this.getMockReverseGeocode(lng, lat);
        }

        try {
            const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.accessToken}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Mapbox API error: ${response.status}`);
            }

            const data = await response.json();
            const feature = data.features[0];

            if (!feature) return null;

            return {
                placeName: feature.place_name,
                coordinates: feature.center,
                relevance: feature.relevance,
                placeType: feature.place_type,
                context: feature.context,
            };
        } catch (error: any) {
            this.logger.error(`Reverse geocoding error: ${error.message}`);
            return this.getMockReverseGeocode(lng, lat);
        }
    }

    /**
     * Get directions between points
     */
    async getDirections(
        coordinates: [number, number][],  // Array of [lng, lat]
        options?: {
            profile?: 'driving' | 'walking' | 'cycling' | 'driving-traffic';
            alternatives?: boolean;
            geometries?: 'geojson' | 'polyline';
            overview?: 'full' | 'simplified' | 'false';
        }
    ): Promise<DirectionsResult | null> {
        if (!this.accessToken) {
            return this.getMockDirections(coordinates);
        }

        const profile = options?.profile || 'driving';
        const coordString = coordinates.map(c => c.join(',')).join(';');

        try {
            const params = new URLSearchParams({
                access_token: this.accessToken,
                geometries: options?.geometries || 'geojson',
                overview: options?.overview || 'full',
                steps: 'true',
                alternatives: (options?.alternatives || false).toString(),
            });

            const url = `${this.baseUrl}/directions/v5/mapbox/${profile}/${coordString}?${params}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Mapbox API error: ${response.status}`);
            }

            const data = await response.json();
            const route = data.routes[0];

            if (!route) return null;

            return {
                distance: route.distance,
                duration: route.duration,
                geometry: route.geometry,
                legs: route.legs.map((leg: any) => ({
                    distance: leg.distance,
                    duration: leg.duration,
                    steps: leg.steps.map((step: any) => ({
                        instruction: step.maneuver?.instruction || '',
                        distance: step.distance,
                        duration: step.duration,
                    })),
                })),
            };
        } catch (error: any) {
            this.logger.error(`Directions error: ${error.message}`);
            return this.getMockDirections(coordinates);
        }
    }

    /**
     * Get isochrone (service area) from a point
     */
    async getIsochrone(
        center: [number, number],  // [lng, lat]
        options?: {
            profile?: 'driving' | 'walking' | 'cycling';
            contours_minutes?: number[];  // e.g., [5, 10, 15]
            contours_colors?: string[];
            polygons?: boolean;
        }
    ): Promise<IsochroneResult[]> {
        if (!this.accessToken) {
            return this.getMockIsochrone(center, options?.contours_minutes || [5, 10, 15]);
        }

        const profile = options?.profile || 'driving';
        const minutes = options?.contours_minutes || [5, 10, 15];

        try {
            const params = new URLSearchParams({
                access_token: this.accessToken,
                contours_minutes: minutes.join(','),
                polygons: (options?.polygons !== false).toString(),
            });

            if (options?.contours_colors) {
                params.set('contours_colors', options.contours_colors.join(','));
            }

            const url = `${this.baseUrl}/isochrone/v1/mapbox/${profile}/${center.join(',')}?${params}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Mapbox API error: ${response.status}`);
            }

            const data = await response.json();

            return data.features.map((f: any) => ({
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                    contour: f.properties.contour,
                    color: f.properties.color || '#3B82F6',
                },
            }));
        } catch (error: any) {
            this.logger.error(`Isochrone error: ${error.message}`);
            return this.getMockIsochrone(center, minutes);
        }
    }

    /**
     * Calculate optimal route for multiple stops
     */
    async optimizeRoute(
        waypoints: { id: string; coordinates: [number, number]; name?: string }[]
    ): Promise<{
        optimizedOrder: string[];
        totalDistance: number;
        totalDuration: number;
        route: DirectionsResult;
    } | null> {
        if (waypoints.length < 2) return null;

        const coordinates = waypoints.map(w => w.coordinates);
        const directions = await this.getDirections(coordinates);

        if (!directions) return null;

        return {
            optimizedOrder: waypoints.map(w => w.id),
            totalDistance: directions.distance,
            totalDuration: directions.duration,
            route: directions,
        };
    }

    /**
     * Get static map image URL
     */
    getStaticMapUrl(options: {
        center: [number, number];
        zoom: number;
        width?: number;
        height?: number;
        markers?: { coordinates: [number, number]; color?: string }[];
        style?: string;
    }): string {
        const width = options.width || 600;
        const height = options.height || 400;
        const style = options.style || 'mapbox/streets-v12';
        const [lng, lat] = options.center;

        let url = `${this.baseUrl}/styles/v1/${style}/static`;

        // Add markers
        if (options.markers && options.markers.length > 0) {
            const markerStr = options.markers
                .map(m => `pin-s+${(m.color || 'ff0000').replace('#', '')}(${m.coordinates.join(',')})`)
                .join(',');
            url += `/${markerStr}`;
        }

        url += `/${lng},${lat},${options.zoom}/${width}x${height}@2x`;
        url += `?access_token=${this.accessToken}`;

        return url;
    }

    // ===== Mock Data =====

    private getMockGeocodeResults(address: string): GeocodingResult[] {
        return [
            {
                placeName: `${address} (模擬結果)`,
                coordinates: [121.5654, 25.0330],
                relevance: 0.9,
                placeType: ['address'],
            },
        ];
    }

    private getMockReverseGeocode(lng: number, lat: number): GeocodingResult {
        return {
            placeName: `經度 ${lng.toFixed(4)}, 緯度 ${lat.toFixed(4)} 附近 (模擬)`,
            coordinates: [lng, lat],
            relevance: 1,
            placeType: ['address'],
        };
    }

    private getMockDirections(coordinates: [number, number][]): DirectionsResult {
        const distance = this.calculateMockDistance(coordinates);
        return {
            distance,
            duration: distance / 10,  // ~36 km/h average
            geometry: {
                type: 'LineString',
                coordinates,
            },
            legs: [{
                distance,
                duration: distance / 10,
                steps: [
                    { instruction: '出發', distance: 0, duration: 0 },
                    { instruction: '沿路前進', distance, duration: distance / 10 },
                    { instruction: '抵達目的地', distance: 0, duration: 0 },
                ],
            }],
        };
    }

    private getMockIsochrone(center: [number, number], minutes: number[]): IsochroneResult[] {
        const colors = ['#3B82F6', '#10B981', '#F59E0B'];

        return minutes.map((min, index) => {
            const radius = min * 0.005; // Rough approximation
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [this.createCirclePolygon(center, radius)],
                },
                properties: {
                    contour: min,
                    color: colors[index % colors.length],
                },
            };
        });
    }

    private calculateMockDistance(coordinates: [number, number][]): number {
        let total = 0;
        for (let i = 1; i < coordinates.length; i++) {
            const [lng1, lat1] = coordinates[i - 1];
            const [lng2, lat2] = coordinates[i];
            // Haversine formula approximation
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            total += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return total;
    }

    private createCirclePolygon(center: [number, number], radiusDeg: number): [number, number][] {
        const points: [number, number][] = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * 2 * Math.PI;
            points.push([
                center[0] + radiusDeg * Math.cos(angle),
                center[1] + radiusDeg * Math.sin(angle),
            ]);
        }
        return points;
    }
}
