/**
 * Voice Assistant Integration
 * 
 * Web Speech API integration for voice commands and TTS.
 * Enables hands-free operation during field work.
 */

/**
 * Supported voice command types
 */
export type VoiceCommandType =
    | 'CREATE_TASK'
    | 'REPORT_STATUS'
    | 'SOS'
    | 'NAVIGATE'
    | 'REQUEST_RESOURCE'
    | 'CHECK_STATUS'
    | 'SEND_MESSAGE';

/**
 * Voice command result
 */
export interface VoiceCommandResult {
    type: VoiceCommandType;
    confidence: number;
    parameters: Record<string, any>;
    rawTranscript: string;
}

/**
 * Voice assistant configuration
 */
export interface VoiceAssistantConfig {
    language: string;
    continuous: boolean;
    interimResults: boolean;
    wakeWord?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: VoiceAssistantConfig = {
    language: 'zh-TW',
    continuous: false,
    interimResults: true,
    wakeWord: '光守護者',
};

/**
 * Command patterns for recognition
 */
const COMMAND_PATTERNS: { pattern: RegExp; type: VoiceCommandType; extractParams: (match: RegExpMatchArray) => Record<string, any> }[] = [
    {
        pattern: /建立任務\s*(.+)/i,
        type: 'CREATE_TASK',
        extractParams: (match) => ({ title: match[1] }),
    },
    {
        pattern: /報告狀態\s*(.+)/i,
        type: 'REPORT_STATUS',
        extractParams: (match) => ({ status: match[1] }),
    },
    {
        pattern: /(緊急|求救|SOS)/i,
        type: 'SOS',
        extractParams: () => ({}),
    },
    {
        pattern: /導航到\s*(.+)/i,
        type: 'NAVIGATE',
        extractParams: (match) => ({ destination: match[1] }),
    },
    {
        pattern: /請求\s*(\d+)\s*(個|份|箱)?\s*(.+)/i,
        type: 'REQUEST_RESOURCE',
        extractParams: (match) => ({ quantity: parseInt(match[1]), unit: match[2] || '個', resource: match[3] }),
    },
    {
        pattern: /查詢\s*(.+)\s*狀態/i,
        type: 'CHECK_STATUS',
        extractParams: (match) => ({ target: match[1] }),
    },
    {
        pattern: /發送訊息\s*(.+)/i,
        type: 'SEND_MESSAGE',
        extractParams: (match) => ({ message: match[1] }),
    },
];

/**
 * Voice Assistant Service
 */
class VoiceAssistantService {
    private recognition: SpeechRecognition | null = null;
    private synthesis: SpeechSynthesis | null = null;
    private config: VoiceAssistantConfig = DEFAULT_CONFIG;
    private isListening = false;
    private commandCallback: ((result: VoiceCommandResult) => void) | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initRecognition();
            this.synthesis = window.speechSynthesis;
        }
    }

    /**
     * Initialize speech recognition
     */
    private initRecognition(): void {
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('[VoiceAssistant] Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.config.language;
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');

            // Check for wake word if configured
            if (this.config.wakeWord && !transcript.includes(this.config.wakeWord)) {
                return;
            }

            const command = this.parseCommand(transcript);
            if (command && this.commandCallback) {
                this.commandCallback(command);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[VoiceAssistant] Recognition error:', event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.config.continuous) {
                this.startListening();
            }
        };
    }

    /**
     * Start listening for commands
     */
    startListening(callback?: (result: VoiceCommandResult) => void): void {
        if (!this.recognition) {
            console.error('[VoiceAssistant] Recognition not initialized');
            return;
        }

        if (callback) {
            this.commandCallback = callback;
        }

        if (!this.isListening) {
            this.recognition.start();
            this.isListening = true;
        }
    }

    /**
     * Stop listening
     */
    stopListening(): void {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    /**
     * Parse voice input to command
     */
    private parseCommand(transcript: string): VoiceCommandResult | null {
        const cleanedTranscript = transcript.replace(this.config.wakeWord || '', '').trim();

        for (const { pattern, type, extractParams } of COMMAND_PATTERNS) {
            const match = cleanedTranscript.match(pattern);
            if (match) {
                return {
                    type,
                    confidence: 0.85,
                    parameters: extractParams(match),
                    rawTranscript: transcript,
                };
            }
        }

        return null;
    }

    /**
     * Speak text using TTS
     */
    speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.config.language;
            utterance.rate = options?.rate ?? 1;
            utterance.pitch = options?.pitch ?? 1;
            utterance.volume = options?.volume ?? 1;

            // Select Chinese voice if available
            const voices = this.synthesis.getVoices();
            const chineseVoice = voices.find(v => v.lang.includes('zh'));
            if (chineseVoice) {
                utterance.voice = chineseVoice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);

            this.synthesis.speak(utterance);
        });
    }

    /**
     * Stop speaking
     */
    stopSpeaking(): void {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    /**
     * Check if speech recognition is supported
     */
    isSupported(): boolean {
        return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
    }

    /**
     * Get available voices
     */
    getVoices(): SpeechSynthesisVoice[] {
        return this.synthesis?.getVoices() || [];
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<VoiceAssistantConfig>): void {
        this.config = { ...this.config, ...config };
        if (this.recognition) {
            this.recognition.lang = this.config.language;
            this.recognition.continuous = this.config.continuous;
        }
    }

    /**
     * Get listening state
     */
    getIsListening(): boolean {
        return this.isListening;
    }
}

// Singleton instance
export const voiceAssistant = new VoiceAssistantService();
export default voiceAssistant;
