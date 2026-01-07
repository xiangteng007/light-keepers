/**
 * Scout Agent Service - 偵蒐飛控官 AI Agent
 * 
 * Domain: Air-Ops (空中與自主作業)
 * 
 * 自主功能：
 * - 監控影像串流，自動辨識受困者
 * - 動態規劃最佳航路
 * - 協調無人機群集
 * - 回報偵測結果至指揮中心
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AerialDetection {
    id: string;
    droneId: string;
    timestamp: Date;
    location: { lat: number; lng: number; altitude: number };
    detectionType: 'victim' | 'fire' | 'flood' | 'structural_damage' | 'vehicle';
    confidence: number;
    imageUrl: string;
    processed: boolean;
}

interface FlightPath {
    waypoints: { lat: number; lng: number; altitude: number }[];
    estimatedTime: number;  // 分鐘
    priority: 'low' | 'medium' | 'high' | 'urgent';
}

@Injectable()
export class ScoutAgentService {
    private readonly logger = new Logger(ScoutAgentService.name);
    private genAI: GoogleGenerativeAI;
    private visionModel: any;

    // 待處理的偵測結果佇列
    private detectionQueue: AerialDetection[] = [];

    // 活躍的無人機追蹤
    private activeDrones: Map<string, {
        status: string;
        lastUpdate: Date;
        currentPath: FlightPath | null;
    }> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.initializeAI();
        this.logger.log('🤖 Scout Agent (偵蒐飛控官) initialized');
    }

    private initializeAI() {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        }
    }

    // ==================== 影像串流分析 ====================

    /**
     * 處理無人機影像幀
     * 使用 Vision AI 辨識受困者或災情
     */
    async processVideoFrame(
        droneId: string,
        frameBase64: string,
        location: { lat: number; lng: number; altitude: number },
    ): Promise<AerialDetection | null> {
        if (!this.visionModel) {
            return null;
        }

        const prompt = `
你是災害救援影像分析專家。請分析這張空拍影像，辨識以下目標：

1. 受困者 (人員在危險區域、屋頂、洪水中)
2. 火災 (煙霧、火焰)
3. 水災 (積水、洪流)
4. 結構損壞 (建築倒塌、道路斷裂)
5. 車輛 (受困車輛、救援車輛)

請以 JSON 格式回應：
{
    "detected": true/false,
    "detectionType": "victim|fire|flood|structural_damage|vehicle|none",
    "confidence": 0.0-1.0,
    "description": "描述偵測到的情況",
    "estimatedCount": 數量 (如適用),
    "urgency": "low|medium|high|critical"
}
`;

        try {
            const result = await this.visionModel.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: frameBase64,
                    },
                },
            ]);

            const response = await result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) return null;

            const analysis = JSON.parse(jsonMatch[0]);

            if (analysis.detected && analysis.confidence > 0.7) {
                const detection: AerialDetection = {
                    id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    droneId,
                    timestamp: new Date(),
                    location,
                    detectionType: analysis.detectionType,
                    confidence: analysis.confidence,
                    imageUrl: '', // 需另外儲存影像
                    processed: false,
                };

                // 加入處理佇列
                this.detectionQueue.push(detection);

                // 高優先度立即通報
                if (analysis.urgency === 'critical' || analysis.urgency === 'high') {
                    this.eventEmitter.emit('scout.urgent_detection', {
                        detection,
                        analysis,
                    });
                }

                this.logger.log(
                    `🎯 Detection: [${analysis.detectionType}] confidence=${analysis.confidence.toFixed(2)} @ ${location.lat},${location.lng}`,
                );

                return detection;
            }

            return null;
        } catch (error) {
            this.logger.error('Video frame analysis failed', error);
            return null;
        }
    }

    // ==================== 航路規劃 ====================

    /**
     * 自動規劃搜救航路
     * 根據任務區域和優先順序生成最佳路徑
     */
    async planSearchPath(params: {
        searchArea: { lat: number; lng: number }[];
        startPoint: { lat: number; lng: number };
        altitude: number;
        pattern: 'grid' | 'spiral' | 'contour';
        priority: 'low' | 'medium' | 'high' | 'urgent';
    }): Promise<FlightPath> {
        const { searchArea, startPoint, altitude, pattern, priority } = params;

        // 計算區域邊界
        const bounds = this.calculateBounds(searchArea);

        // 根據搜索模式生成航點
        let waypoints: { lat: number; lng: number; altitude: number }[] = [];

        switch (pattern) {
            case 'grid':
                waypoints = this.generateGridPattern(bounds, altitude, 50); // 50m 間隔
                break;
            case 'spiral':
                waypoints = this.generateSpiralPattern(bounds, altitude);
                break;
            case 'contour':
                waypoints = this.generateContourPattern(searchArea, altitude);
                break;
        }

        // 從起點開始排序 (旅行推銷員問題的貪婪解)
        waypoints = this.optimizeWaypointOrder(waypoints, startPoint);

        const path: FlightPath = {
            waypoints,
            estimatedTime: this.calculateFlightTime(waypoints),
            priority,
        };

        this.logger.log(
            `📍 Search path planned: ${waypoints.length} waypoints, ~${path.estimatedTime} min`,
        );

        return path;
    }

    /**
     * 動態調整航路 (發現目標後)
     */
    async adjustPathForDetection(
        currentPath: FlightPath,
        detectionLocation: { lat: number; lng: number },
    ): Promise<FlightPath> {
        // 在偵測點周圍增加盤旋航點
        const orbitWaypoints = this.generateOrbitPattern(
            detectionLocation,
            30, // 30m 半徑
            50, // 50m 高度
        );

        // 插入盤旋航點
        const newWaypoints = [...orbitWaypoints, ...currentPath.waypoints];

        return {
            waypoints: newWaypoints,
            estimatedTime: this.calculateFlightTime(newWaypoints),
            priority: 'urgent',
        };
    }

    // ==================== 群集協調 ====================

    /**
     * 協調多架無人機分區搜索
     */
    async coordinateSwarmSearch(
        droneIds: string[],
        totalArea: { lat: number; lng: number }[],
    ): Promise<Map<string, FlightPath>> {
        const assignments = new Map<string, FlightPath>();

        // 將區域分割為 N 等份
        const sectors = this.divideArea(totalArea, droneIds.length);

        for (let i = 0; i < droneIds.length; i++) {
            const droneId = droneIds[i];
            const sector = sectors[i];

            // 取該無人機當前位置作為起點
            const droneInfo = this.activeDrones.get(droneId);
            const startPoint = { lat: sector[0].lat, lng: sector[0].lng };

            const path = await this.planSearchPath({
                searchArea: sector,
                startPoint,
                altitude: 50,
                pattern: 'grid',
                priority: 'high',
            });

            assignments.set(droneId, path);
        }

        this.logger.log(`🚁 Swarm coordination: ${droneIds.length} drones assigned`);

        return assignments;
    }

    // ==================== 輔助方法 ====================

    private calculateBounds(points: { lat: number; lng: number }[]) {
        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);
        return {
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
            minLng: Math.min(...lngs),
            maxLng: Math.max(...lngs),
        };
    }

    private generateGridPattern(
        bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
        altitude: number,
        spacing: number, // 公尺
    ): { lat: number; lng: number; altitude: number }[] {
        const waypoints: { lat: number; lng: number; altitude: number }[] = [];

        // 約 111,320 公尺/度 (赤道)
        const latStep = spacing / 111320;
        const lngStep = spacing / (111320 * Math.cos(bounds.minLat * Math.PI / 180));

        let goingEast = true;
        for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
            if (goingEast) {
                for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
                    waypoints.push({ lat, lng, altitude });
                }
            } else {
                for (let lng = bounds.maxLng; lng >= bounds.minLng; lng -= lngStep) {
                    waypoints.push({ lat, lng, altitude });
                }
            }
            goingEast = !goingEast;
        }

        return waypoints;
    }

    private generateSpiralPattern(
        bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
        altitude: number,
    ): { lat: number; lng: number; altitude: number }[] {
        // 簡化實作：從中心向外螺旋
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;
        const waypoints: { lat: number; lng: number; altitude: number }[] = [];

        const turns = 10;
        const pointsPerTurn = 20;
        const maxRadius = Math.max(
            bounds.maxLat - bounds.minLat,
            bounds.maxLng - bounds.minLng,
        ) / 2;

        for (let i = 0; i < turns * pointsPerTurn; i++) {
            const angle = (i / pointsPerTurn) * 2 * Math.PI;
            const radius = (i / (turns * pointsPerTurn)) * maxRadius;
            waypoints.push({
                lat: centerLat + radius * Math.cos(angle),
                lng: centerLng + radius * Math.sin(angle),
                altitude,
            });
        }

        return waypoints;
    }

    private generateContourPattern(
        polygon: { lat: number; lng: number }[],
        altitude: number,
    ): { lat: number; lng: number; altitude: number }[] {
        // 沿多邊形邊界飛行
        return polygon.map(p => ({ ...p, altitude }));
    }

    private generateOrbitPattern(
        center: { lat: number; lng: number },
        radius: number,
        altitude: number,
    ): { lat: number; lng: number; altitude: number }[] {
        const waypoints: { lat: number; lng: number; altitude: number }[] = [];
        const points = 8;
        const radiusDeg = radius / 111320;

        for (let i = 0; i < points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            waypoints.push({
                lat: center.lat + radiusDeg * Math.cos(angle),
                lng: center.lng + radiusDeg * Math.sin(angle),
                altitude,
            });
        }

        return waypoints;
    }

    private optimizeWaypointOrder(
        waypoints: { lat: number; lng: number; altitude: number }[],
        start: { lat: number; lng: number },
    ): { lat: number; lng: number; altitude: number }[] {
        if (waypoints.length === 0) return [];

        // 貪婪最近鄰演算法
        const result: typeof waypoints = [];
        const remaining = [...waypoints];
        let current = start;

        while (remaining.length > 0) {
            let nearestIdx = 0;
            let nearestDist = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const dist = Math.hypot(
                    remaining[i].lat - current.lat,
                    remaining[i].lng - current.lng,
                );
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = i;
                }
            }

            const nearest = remaining.splice(nearestIdx, 1)[0];
            result.push(nearest);
            current = { lat: nearest.lat, lng: nearest.lng };
        }

        return result;
    }

    private divideArea(
        polygon: { lat: number; lng: number }[],
        count: number,
    ): { lat: number; lng: number }[][] {
        // 簡化實作：垂直切割
        const bounds = this.calculateBounds(polygon);
        const lngStep = (bounds.maxLng - bounds.minLng) / count;

        const sectors: { lat: number; lng: number }[][] = [];
        for (let i = 0; i < count; i++) {
            sectors.push([
                { lat: bounds.minLat, lng: bounds.minLng + i * lngStep },
                { lat: bounds.maxLat, lng: bounds.minLng + i * lngStep },
                { lat: bounds.maxLat, lng: bounds.minLng + (i + 1) * lngStep },
                { lat: bounds.minLat, lng: bounds.minLng + (i + 1) * lngStep },
            ]);
        }

        return sectors;
    }

    private calculateFlightTime(
        waypoints: { lat: number; lng: number; altitude: number }[],
    ): number {
        if (waypoints.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const d = Math.hypot(
                (waypoints[i].lat - waypoints[i - 1].lat) * 111320,
                (waypoints[i].lng - waypoints[i - 1].lng) * 111320,
            );
            totalDistance += d;
        }

        // 假設平均速度 10 m/s
        return Math.round(totalDistance / 10 / 60);
    }

    // ==================== 事件處理 ====================

    @OnEvent('drone.frame.received')
    async handleDroneFrame(payload: {
        droneId: string;
        frameBase64: string;
        location: { lat: number; lng: number; altitude: number };
    }) {
        await this.processVideoFrame(
            payload.droneId,
            payload.frameBase64,
            payload.location,
        );
    }

    @OnEvent('drone.status.update')
    handleDroneStatus(payload: { droneId: string; status: string }) {
        this.activeDrones.set(payload.droneId, {
            status: payload.status,
            lastUpdate: new Date(),
            currentPath: null,
        });
    }

    /**
     * 每 30 秒處理偵測佇列
     */
    @Interval(30000)
    async processDetectionQueue() {
        const pending = this.detectionQueue.filter(d => !d.processed);

        if (pending.length === 0) return;

        this.logger.debug(`Processing ${pending.length} detections in queue`);

        for (const detection of pending) {
            // 傳送至指揮中心
            this.eventEmitter.emit('mission.detection.report', detection);
            detection.processed = true;
        }

        // 清理已處理的舊資料
        this.detectionQueue = this.detectionQueue.filter(
            d => Date.now() - d.timestamp.getTime() < 3600000 // 保留 1 小時
        );
    }
}
