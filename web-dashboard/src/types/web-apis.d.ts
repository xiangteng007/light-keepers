/**
 * Type declarations for Web APIs not included in default TypeScript lib
 */

// Web Speech API
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: null | ((this: SpeechRecognition, ev: Event) => void);
    onaudiostart: null | ((this: SpeechRecognition, ev: Event) => void);
    onend: null | ((this: SpeechRecognition, ev: Event) => void);
    onerror: null | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void);
    onnomatch: null | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void);
    onresult: null | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void);
    onsoundend: null | ((this: SpeechRecognition, ev: Event) => void);
    onsoundstart: null | ((this: SpeechRecognition, ev: Event) => void);
    onspeechend: null | ((this: SpeechRecognition, ev: Event) => void);
    onspeechstart: null | ((this: SpeechRecognition, ev: Event) => void);
    onstart: null | ((this: SpeechRecognition, ev: Event) => void);
    abort(): void;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

declare var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
};

interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
}

// WebXR API
interface Navigator {
    xr?: XRSystem;
}

interface XRSystem extends EventTarget {
    isSessionSupported(mode: XRSessionMode): Promise<boolean>;
    requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
}

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

interface XRSessionInit {
    requiredFeatures?: string[];
    optionalFeatures?: string[];
}

interface XRSession extends EventTarget {
    renderState: XRRenderState;
    inputSources: XRInputSourceArray;
    end(): Promise<void>;
}

interface XRRenderState {
    baseLayer?: XRWebGLLayer;
    depthNear?: number;
    depthFar?: number;
}

interface XRInputSourceArray {
    length: number;
    [index: number]: XRInputSource;
}

interface XRInputSource {
    handedness: 'none' | 'left' | 'right';
    targetRayMode: 'gaze' | 'tracked-pointer' | 'screen';
}

interface XRWebGLLayer {}
