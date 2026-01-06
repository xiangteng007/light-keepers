import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * VR Command Service
 * Virtual Reality command center for multi-user collaboration
 */
@Injectable()
export class VrCommandService {
    private readonly logger = new Logger(VrCommandService.name);

    // Active VR sessions
    private sessions: Map<string, VrSession> = new Map();

    // Connected users
    private users: Map<string, VrUser> = new Map();

    // Shared annotations/markers
    private annotations: Map<string, VrAnnotation[]> = new Map();

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create VR command room
     */
    async createRoom(config: RoomConfig): Promise<VrSession> {
        const session: VrSession = {
            id: `vr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: config.name,
            type: config.type || 'command-center',
            hostUserId: config.hostUserId,
            participants: [],
            environment: config.environment || 'default',
            terrain: config.terrain ? { ...config.terrain, loadedAt: new Date() } : null,
            createdAt: new Date(),
            status: 'active',
            settings: {
                maxParticipants: config.maxParticipants || 10,
                allowAnnotations: config.allowAnnotations ?? true,
                syncInterval: 50, // ms
                renderQuality: config.renderQuality || 'medium',
            },
        };

        this.sessions.set(session.id, session);
        this.annotations.set(session.id, []);

        this.logger.log(`VR room created: ${session.id} by ${config.hostUserId}`);

        return session;
    }

    /**
     * Join VR session
     */
    async joinSession(sessionId: string, user: UserJoinRequest): Promise<VrUser> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`VR session not found: ${sessionId}`);
        }

        if (session.participants.length >= session.settings.maxParticipants) {
            throw new Error('Session is full');
        }

        const vrUser: VrUser = {
            id: user.userId,
            displayName: user.displayName,
            role: user.role || 'observer',
            avatar: user.avatar || 'default',
            position: { x: 0, y: 1.7, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            headPose: null,
            handPoses: { left: null, right: null },
            voiceActive: false,
            joinedAt: new Date(),
        };

        this.users.set(user.userId, vrUser);
        session.participants.push(user.userId);

        this.eventEmitter.emit('vr.user.joined', { sessionId, user: vrUser });

        return vrUser;
    }

    /**
     * Update user pose (position + rotation)
     */
    updateUserPose(userId: string, pose: UserPose): void {
        const user = this.users.get(userId);
        if (!user) return;

        user.position = pose.position;
        user.rotation = pose.rotation;
        user.headPose = pose.headPose ?? null;
        user.handPoses = pose.handPoses ?? { left: null, right: null };

        // Broadcast to session
        const session = this.findUserSession(userId);
        if (session) {
            this.eventEmitter.emit('vr.pose.updated', {
                sessionId: session.id,
                userId,
                pose,
            });
        }
    }

    /**
     * Create annotation in VR space
     */
    createAnnotation(sessionId: string, annotation: AnnotationRequest): VrAnnotation {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`VR session not found: ${sessionId}`);
        }

        const vrAnnotation: VrAnnotation = {
            id: `ann-${Date.now()}`,
            sessionId,
            createdBy: annotation.userId,
            type: annotation.type,
            position: annotation.position,
            content: annotation.content,
            color: annotation.color || '#FF0000',
            scale: annotation.scale || 1,
            createdAt: new Date(),
            visible: true,
        };

        const sessionAnnotations = this.annotations.get(sessionId) || [];
        sessionAnnotations.push(vrAnnotation);
        this.annotations.set(sessionId, sessionAnnotations);

        this.eventEmitter.emit('vr.annotation.created', vrAnnotation);

        return vrAnnotation;
    }

    /**
     * Load 3D terrain for disaster site
     */
    async loadTerrain(sessionId: string, terrain: TerrainConfig): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`VR session not found: ${sessionId}`);
        }

        session.terrain = {
            center: terrain.center,
            radius: terrain.radius,
            elevationSource: terrain.elevationSource || 'cesium',
            textureSource: terrain.textureSource || 'satellite',
            scale: terrain.scale || 1,
            loadedAt: new Date(),
        };

        this.eventEmitter.emit('vr.terrain.loaded', {
            sessionId,
            terrain: session.terrain,
        });
    }

    /**
     * Start 360 video stream
     */
    async start360Stream(sessionId: string, stream: StreamConfig): Promise<string> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`VR session not found: ${sessionId}`);
        }

        const streamId = `stream-${Date.now()}`;

        // In production, this would set up WebRTC or HLS stream
        this.eventEmitter.emit('vr.stream.started', {
            sessionId,
            streamId,
            source: stream.source,
        });

        return streamId;
    }

    /**
     * Get sandbox simulation state
     */
    getSandboxState(sessionId: string): SandboxState {
        const session = this.sessions.get(sessionId);
        const sessionAnnotations = this.annotations.get(sessionId) || [];

        return {
            sessionId,
            terrain: session?.terrain || null,
            annotations: sessionAnnotations,
            participants: session?.participants.map((id) => this.users.get(id)).filter(Boolean) as VrUser[],
            timestamp: new Date(),
        };
    }

    /**
     * Voice activity detection
     */
    setVoiceActive(userId: string, active: boolean): void {
        const user = this.users.get(userId);
        if (user) {
            user.voiceActive = active;

            const session = this.findUserSession(userId);
            if (session) {
                this.eventEmitter.emit('vr.voice.activity', {
                    sessionId: session.id,
                    userId,
                    active,
                });
            }
        }
    }

    /**
     * Leave VR session
     */
    leaveSession(userId: string): void {
        const session = this.findUserSession(userId);
        if (session) {
            session.participants = session.participants.filter((id) => id !== userId);
            this.users.delete(userId);

            this.eventEmitter.emit('vr.user.left', { sessionId: session.id, userId });

            // Close session if empty
            if (session.participants.length === 0) {
                this.closeSession(session.id);
            }
        }
    }

    /**
     * Close VR session
     */
    closeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'closed';

            // Remove all participants
            session.participants.forEach((userId) => {
                this.users.delete(userId);
            });

            this.sessions.delete(sessionId);
            this.annotations.delete(sessionId);

            this.logger.log(`VR session closed: ${sessionId}`);
            this.eventEmitter.emit('vr.session.closed', { sessionId });
        }
    }

    // Private helpers
    private findUserSession(userId: string): VrSession | undefined {
        for (const session of this.sessions.values()) {
            if (session.participants.includes(userId)) {
                return session;
            }
        }
        return undefined;
    }
}

// Type definitions
interface VrSession {
    id: string;
    name: string;
    type: 'command-center' | 'field-review' | 'training' | 'sandbox';
    hostUserId: string;
    participants: string[];
    environment: string;
    terrain: TerrainData | null;
    createdAt: Date;
    status: 'active' | 'paused' | 'closed';
    settings: {
        maxParticipants: number;
        allowAnnotations: boolean;
        syncInterval: number;
        renderQuality: 'low' | 'medium' | 'high';
    };
}

interface RoomConfig {
    name: string;
    type?: 'command-center' | 'field-review' | 'training' | 'sandbox';
    hostUserId: string;
    environment?: string;
    terrain?: TerrainConfig;
    maxParticipants?: number;
    allowAnnotations?: boolean;
    renderQuality?: 'low' | 'medium' | 'high';
}

interface VrUser {
    id: string;
    displayName: string;
    role: 'host' | 'commander' | 'participant' | 'observer';
    avatar: string;
    position: Vector3;
    rotation: Quaternion;
    headPose: HeadPose | null;
    handPoses: { left: HandPose | null; right: HandPose | null };
    voiceActive: boolean;
    joinedAt: Date;
}

interface UserJoinRequest {
    userId: string;
    displayName: string;
    role?: 'host' | 'commander' | 'participant' | 'observer';
    avatar?: string;
}

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface HeadPose {
    position: Vector3;
    rotation: Quaternion;
}

interface HandPose {
    position: Vector3;
    rotation: Quaternion;
    gesture: string;
}

interface UserPose {
    position: Vector3;
    rotation: Quaternion;
    headPose?: HeadPose;
    handPoses?: { left: HandPose | null; right: HandPose | null };
}

interface VrAnnotation {
    id: string;
    sessionId: string;
    createdBy: string;
    type: 'marker' | 'path' | 'area' | 'text' | 'arrow';
    position: Vector3;
    content: any;
    color: string;
    scale: number;
    createdAt: Date;
    visible: boolean;
}

interface AnnotationRequest {
    userId: string;
    type: 'marker' | 'path' | 'area' | 'text' | 'arrow';
    position: Vector3;
    content: any;
    color?: string;
    scale?: number;
}

interface TerrainConfig {
    center: { lat: number; lng: number };
    radius: number;
    elevationSource?: string;
    textureSource?: string;
    scale?: number;
}

interface TerrainData extends TerrainConfig {
    loadedAt: Date;
}

interface StreamConfig {
    source: string;
    type: '360' | '180' | 'flat';
}

interface SandboxState {
    sessionId: string;
    terrain: TerrainData | null;
    annotations: VrAnnotation[];
    participants: VrUser[];
    timestamp: Date;
}
