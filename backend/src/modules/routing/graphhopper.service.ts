/**
 * GraphHopper/ORS Routing Service - 路徑規劃整合
 * 連接 GraphHopper 或 OpenRouteService API
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// GeoJSON 類型定義
interface GeoJSONPolygon {
    type: 'Polygon';
    coordinates: number[][][];
}

interface GeoJSONLineString {
    type: 'LineString';
    coordinates: number[][];
}

interface GeoJSONFeature {
    type: 'Feature';
    properties: Record<string, any>;
    geometry: GeoJSONPolygon | GeoJSONLineString;
}

// ============ Types ============

export interface RoutePoint {
    lat: number;
    lng: number;
}

export interface RouteOptions {
    profile?: 'car' | 'foot' | 'bike' | 'emergency';
    avoidAreas?: GeoJSONPolygon[];
    optimize?: boolean;
    alternatives?: number;
    locale?: string;
}

export interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
    geometry: GeoJSONLineString;
    instructions?: RouteInstruction[];
    warnings?: string[];
}

export interface RouteInstruction {
    distance: number;
    duration: number;
    type: number;
    text: string;
    streetName?: string;
}

export interface IsochroneResult {
    polygons: GeoJSONFeature[];
    center: RoutePoint;
    intervals: number[];
}

// ============ Service ============

@Injectable()
export class GraphHopperService implements OnModuleInit {
    private readonly logger = new Logger(GraphHopperService.name);
    private apiUrl: string;
    private apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('GRAPHHOPPER_API_URL', 'https://graphhopper.com/api/1');
        this.apiKey = this.configService.get<string>('GRAPHHOPPER_API_KEY', '');
    }

    onModuleInit() {
        if (!this.apiKey) {
            this.logger.warn('GraphHopper API key not configured - using fallback routing');
        } else {
            this.logger.log(`GraphHopper service initialized: ${this.apiUrl}`);
        }
    }

    /**
     * 計算兩點間路線
     */
    async route(from: RoutePoint, to: RoutePoint, options: RouteOptions = {}): Promise<RouteResult> {
        if (!this.apiKey) {
            return this.fallbackRoute(from, to);
        }

        try {
            const profile = options.profile === 'emergency' ? 'car' : (options.profile || 'car');
            const url = `${this.apiUrl}/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&profile=${profile}&key=${this.apiKey}&instructions=true&locale=${options.locale || 'zh-TW'}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GraphHopper API error: ${response.status}`);
            }

            const data = await response.json();
            const path = data.paths[0];

            return {
                distance: path.distance,
                duration: path.time / 1000,
                geometry: this.decodePolyline(path.points),
                instructions: path.instructions?.map((i: any) => ({
                    distance: i.distance,
                    duration: i.time / 1000,
                    type: i.sign,
                    text: i.text,
                    streetName: i.street_name,
                })),
            };
        } catch (error) {
            this.logger.error(`GraphHopper routing failed: ${error}`);
            return this.fallbackRoute(from, to);
        }
    }

    /**
     * 計算多點最佳化路線 (TSP)
     */
    async optimizedRoute(points: RoutePoint[], options: RouteOptions = {}): Promise<RouteResult> {
        if (!this.apiKey || points.length < 2) {
            return this.fallbackRoute(points[0], points[points.length - 1]);
        }

        try {
            const body = {
                vehicles: [{ vehicle_id: 'v1', start_address: { location_id: 'start', lon: points[0].lng, lat: points[0].lat } }],
                services: points.slice(1).map((p, i) => ({
                    id: `s${i}`,
                    address: { location_id: `loc${i}`, lon: p.lng, lat: p.lat },
                })),
            };

            const response = await fetch(`${this.apiUrl}/vrp?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`GraphHopper VRP error: ${response.status}`);
            }

            const data = await response.json();
            const solution = data.solution;

            return {
                distance: solution.distance,
                duration: solution.time,
                geometry: this.mergeGeometries(solution.routes[0].points),
            };
        } catch (error) {
            this.logger.error(`GraphHopper VRP failed: ${error}`);
            return this.fallbackRoute(points[0], points[points.length - 1]);
        }
    }

    /**
     * 計算等時圈 (Isochrone)
     */
    async isochrone(center: RoutePoint, minutes: number[], profile: string = 'car'): Promise<IsochroneResult> {
        if (!this.apiKey) {
            return this.fallbackIsochrone(center, minutes);
        }

        try {
            const timeLimit = Math.max(...minutes) * 60;
            const url = `${this.apiUrl}/isochrone?point=${center.lat},${center.lng}&time_limit=${timeLimit}&profile=${profile}&key=${this.apiKey}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GraphHopper isochrone error: ${response.status}`);
            }

            const data = await response.json();

            return {
                polygons: data.polygons,
                center,
                intervals: minutes,
            };
        } catch (error) {
            this.logger.error(`GraphHopper isochrone failed: ${error}`);
            return this.fallbackIsochrone(center, minutes);
        }
    }

    /**
     * 後備路線計算 (Haversine 直線)
     */
    private fallbackRoute(from: RoutePoint, to: RoutePoint): RouteResult {
        const distance = this.haversineDistance(from, to);
        const duration = distance / 10; // Assume 36 km/h average

        return {
            distance,
            duration,
            geometry: {
                type: 'LineString',
                coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
            },
            warnings: ['Using fallback straight-line routing'],
        };
    }

    /**
     * 後備等時圈 (圓形近似)
     */
    private fallbackIsochrone(center: RoutePoint, minutes: number[]): IsochroneResult {
        const polygons = minutes.map(m => {
            const radiusKm = (m * 0.6); // Assume 36 km/h
            const points = this.createCircle(center, radiusKm);
            return {
                type: 'Feature' as const,
                properties: { bucket: m },
                geometry: { type: 'Polygon' as const, coordinates: [points] },
            };
        });

        return { polygons, center, intervals: minutes };
    }

    private createCircle(center: RoutePoint, radiusKm: number): number[][] {
        const points: number[][] = [];
        for (let i = 0; i <= 36; i++) {
            const angle = (i * 10) * Math.PI / 180;
            const lat = center.lat + (radiusKm / 111) * Math.cos(angle);
            const lng = center.lng + (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
            points.push([lng, lat]);
        }
        return points;
    }

    private haversineDistance(from: RoutePoint, to: RoutePoint): number {
        const R = 6371000;
        const dLat = (to.lat - from.lat) * Math.PI / 180;
        const dLng = (to.lng - from.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private decodePolyline(encoded: string): GeoJSONLineString {
        // GraphHopper uses encoded polyline format
        const coords: number[][] = [];
        let lat = 0, lng = 0;
        let index = 0;

        while (index < encoded.length) {
            let shift = 0, result = 0;
            let byte: number;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lat += (result & 1) ? ~(result >> 1) : (result >> 1);

            shift = 0;
            result = 0;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            lng += (result & 1) ? ~(result >> 1) : (result >> 1);

            coords.push([lng / 1e5, lat / 1e5]);
        }

        return { type: 'LineString', coordinates: coords };
    }

    private mergeGeometries(points: string): GeoJSONLineString {
        return this.decodePolyline(points);
    }
}
