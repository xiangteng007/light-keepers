import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * AI Voice Assistant Service
 * Hands-free voice command interface for disaster response
 */
@Injectable()
export class VoiceAssistantService {
    private readonly logger = new Logger(VoiceAssistantService.name);

    // Active voice sessions
    private sessions: Map<string, VoiceSession> = new Map();

    // Command registry
    private commands: VoiceCommand[] = [];

    // Wake word detection state
    private wakeWordEnabled = true;
    private readonly WAKE_WORD = '助手';

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) {
        this.registerDefaultCommands();
    }

    /**
     * Start voice session for user
     */
    async startSession(userId: string, config?: SessionConfig): Promise<VoiceSession> {
        const session: VoiceSession = {
            id: `voice-${Date.now()}`,
            userId,
            status: 'listening',
            language: config?.language || 'zh-TW',
            wakeWordEnabled: config?.wakeWordEnabled ?? true,
            context: {
                currentMission: config?.missionId,
                location: null,
                lastCommand: null,
            },
            startedAt: new Date(),
            lastActivity: new Date(),
        };

        this.sessions.set(session.id, session);
        this.logger.log(`Voice session started: ${session.id} for user ${userId}`);

        return session;
    }

    /**
     * Process voice input
     */
    async processVoiceInput(sessionId: string, audioData: Buffer): Promise<VoiceResponse> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Voice session not found: ${sessionId}`);
        }

        session.lastActivity = new Date();

        // Step 1: Speech-to-text
        const transcript = await this.speechToText(audioData, session.language);

        if (!transcript) {
            return { success: false, message: '無法辨識語音' };
        }

        // Step 2: Check for wake word if enabled
        if (session.wakeWordEnabled && !transcript.includes(this.WAKE_WORD)) {
            return { success: false, message: 'wake_word_not_detected', silent: true };
        }

        // Step 3: Parse command intent
        const intent = await this.parseIntent(transcript, session.context);

        // Step 4: Execute command
        const result = await this.executeCommand(intent, session);

        // Step 5: Generate response
        const response = await this.generateResponse(result, session.language);

        session.context.lastCommand = intent.command;

        this.eventEmitter.emit('voice.command.executed', {
            sessionId,
            transcript,
            intent,
            result,
        });

        return {
            success: true,
            transcript,
            intent: intent.command,
            response,
            audioResponse: await this.textToSpeech(response, session.language),
        };
    }

    /**
     * Process text command (fallback)
     */
    async processTextCommand(sessionId: string, text: string): Promise<VoiceResponse> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Voice session not found: ${sessionId}`);
        }

        const intent = await this.parseIntent(text, session.context);
        const result = await this.executeCommand(intent, session);
        const response = await this.generateResponse(result, session.language);

        return {
            success: true,
            transcript: text,
            intent: intent.command,
            response,
        };
    }

    /**
     * Register custom voice command
     */
    registerCommand(command: VoiceCommand): void {
        this.commands.push(command);
        this.logger.log(`Voice command registered: ${command.name}`);
    }

    /**
     * Update session context
     */
    updateContext(sessionId: string, context: Partial<SessionContext>): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.context = { ...session.context, ...context };
        }
    }

    /**
     * End voice session
     */
    endSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        this.logger.log(`Voice session ended: ${sessionId}`);
    }

    // Private methods
    private registerDefaultCommands(): void {
        this.commands = [
            {
                name: 'report_casualty',
                patterns: ['報告傷患', '有傷患', '發現傷者'],
                handler: async (params, session) => ({
                    action: 'create_triage',
                    message: '請描述傷患位置和傷勢',
                    requiresFollowUp: true,
                }),
            },
            {
                name: 'request_resource',
                patterns: ['需要物資', '請求支援', '物資不足'],
                handler: async (params, session) => ({
                    action: 'resource_request',
                    message: '請說明需要的物資類型和數量',
                    requiresFollowUp: true,
                }),
            },
            {
                name: 'report_location',
                patterns: ['報告位置', '我的位置', '目前在'],
                handler: async (params, session) => ({
                    action: 'update_location',
                    message: '已記錄您的位置',
                }),
            },
            {
                name: 'status_update',
                patterns: ['狀態報告', '回報狀態', '任務進度'],
                handler: async (params, session) => ({
                    action: 'sitrep',
                    message: '請描述目前狀況',
                    requiresFollowUp: true,
                }),
            },
            {
                name: 'emergency_sos',
                patterns: ['緊急求救', 'SOS', '救命'],
                handler: async (params, session) => ({
                    action: 'sos',
                    message: '緊急求救信號已發送',
                    priority: 'critical',
                }),
            },
            {
                name: 'navigation',
                patterns: ['導航到', '怎麼去', '帶我去'],
                handler: async (params, session) => ({
                    action: 'navigate',
                    message: '正在規劃路線',
                }),
            },
            {
                name: 'team_status',
                patterns: ['隊員狀態', '團隊位置', '其他人在哪'],
                handler: async (params, session) => ({
                    action: 'team_status',
                    message: '正在查詢團隊狀態',
                }),
            },
        ];
    }

    private async speechToText(audio: Buffer, language: string): Promise<string> {
        // Integrate with Gemini or Google Speech-to-Text
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            return '模擬語音輸入';
        }

        // Actual implementation would use Gemini multimodal
        return '模擬語音輸入';
    }

    private async parseIntent(text: string, context: SessionContext): Promise<IntentResult> {
        const lowerText = text.toLowerCase();

        for (const command of this.commands) {
            for (const pattern of command.patterns) {
                if (lowerText.includes(pattern)) {
                    return {
                        command: command.name,
                        confidence: 0.9,
                        params: this.extractParams(text, command),
                    };
                }
            }
        }

        // Use AI for unknown commands
        return {
            command: 'unknown',
            confidence: 0.5,
            params: { rawText: text },
        };
    }

    private extractParams(text: string, command: VoiceCommand): Record<string, any> {
        // Extract entities like locations, numbers, etc.
        const params: Record<string, any> = {};

        // Extract numbers
        const numbers = text.match(/\d+/g);
        if (numbers) {
            params.numbers = numbers.map(Number);
        }

        return params;
    }

    private async executeCommand(intent: IntentResult, session: VoiceSession): Promise<CommandResult> {
        const command = this.commands.find((c) => c.name === intent.command);

        if (command) {
            return command.handler(intent.params, session);
        }

        return {
            action: 'unknown',
            message: '抱歉，我無法理解您的指令',
        };
    }

    private async generateResponse(result: CommandResult, language: string): Promise<string> {
        return result.message || '指令已執行';
    }

    private async textToSpeech(text: string, language: string): Promise<Buffer | null> {
        // Would integrate with TTS service
        return null;
    }
}

// Type definitions
interface VoiceSession {
    id: string;
    userId: string;
    status: 'listening' | 'processing' | 'speaking' | 'idle';
    language: string;
    wakeWordEnabled: boolean;
    context: SessionContext;
    startedAt: Date;
    lastActivity: Date;
}

interface SessionConfig {
    language?: string;
    wakeWordEnabled?: boolean;
    missionId?: string;
}

interface SessionContext {
    currentMission?: string;
    location?: { lat: number; lng: number } | null;
    lastCommand?: string | null;
}

interface VoiceCommand {
    name: string;
    patterns: string[];
    handler: (params: Record<string, any>, session: VoiceSession) => Promise<CommandResult>;
}

interface IntentResult {
    command: string;
    confidence: number;
    params: Record<string, any>;
}

interface CommandResult {
    action: string;
    message: string;
    requiresFollowUp?: boolean;
    priority?: string;
    data?: any;
}

interface VoiceResponse {
    success: boolean;
    message?: string;
    transcript?: string;
    intent?: string;
    response?: string;
    audioResponse?: Buffer | null;
    silent?: boolean;
}
