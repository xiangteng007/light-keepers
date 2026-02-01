/**
 * Custom type declarations for packages missing type definitions
 */

// uuid module - v9+ has built-in types but CommonJS may need explicit declaration
declare module 'uuid' {
    export function v4(): string;
    export function v1(): string;
    export function v3(name: string | Buffer, namespace: string | Buffer): string;
    export function v5(name: string | Buffer, namespace: string | Buffer): string;
    export function parse(uuid: string): Buffer;
    export function stringify(arr: Buffer): string;
    export function validate(uuid: string): boolean;
    export function version(uuid: string): number;
}

// papaparse CSV parser
declare module 'papaparse' {
    export interface ParseConfig {
        delimiter?: string;
        newline?: string;
        quoteChar?: string;
        escapeChar?: string;
        header?: boolean;
        transformHeader?: (header: string) => string;
        dynamicTyping?: boolean;
        preview?: number;
        encoding?: string;
        worker?: boolean;
        comments?: boolean | string;
        step?: (results: ParseResult<any>, parser: Parser) => void;
        complete?: (results: ParseResult<any>, file?: File) => void;
        error?: (error: Error, file?: File) => void;
        download?: boolean;
        skipEmptyLines?: boolean | 'greedy';
        chunk?: (results: ParseResult<any>, parser: Parser) => void;
        fastMode?: boolean;
        beforeFirstChunk?: (chunk: string) => string | void;
        withCredentials?: boolean;
        transform?: (value: string, field: string | number) => any;
        delimitersToGuess?: string[];
    }

    export interface UnparseConfig {
        quotes?: boolean | boolean[];
        quoteChar?: string;
        escapeChar?: string;
        delimiter?: string;
        header?: boolean;
        newline?: string;
        skipEmptyLines?: boolean | 'greedy';
        columns?: string[];
    }

    export interface ParseResult<T> {
        data: T[];
        errors: ParseError[];
        meta: ParseMeta;
    }

    export interface ParseError {
        type: string;
        code: string;
        message: string;
        row: number;
    }

    export interface ParseMeta {
        delimiter: string;
        linebreak: string;
        aborted: boolean;
        truncated: boolean;
        cursor: number;
        fields?: string[];
    }

    export interface Parser {
        abort: () => void;
        pause: () => void;
        resume: () => void;
    }

    export function parse<T>(input: string | File, config?: ParseConfig): ParseResult<T>;
    export function unparse(data: any[], config?: UnparseConfig): string;
    export function unparse(data: { fields: string[]; data: any[] }, config?: UnparseConfig): string;
    
    const Papa: {
        parse: typeof parse;
        unparse: typeof unparse;
    };
    
    export default Papa;
}

// mqtt module for mesh network
declare module 'mqtt' {
    export interface IClientOptions {
        clientId?: string;
        clean?: boolean;
        keepalive?: number;
        reconnectPeriod?: number;
        connectTimeout?: number;
        username?: string;
        password?: string | Buffer;
        protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss';
        host?: string;
        port?: number;
        path?: string;
        will?: {
            topic: string;
            payload: string | Buffer;
            qos?: 0 | 1 | 2;
            retain?: boolean;
        };
    }

    export interface IPublishPacket {
        topic: string;
        payload: Buffer;
        qos: 0 | 1 | 2;
        retain: boolean;
        dup: boolean;
    }

    export interface MqttClient {
        on(event: 'connect', callback: () => void): this;
        on(event: 'message', callback: (topic: string, message: Buffer, packet: IPublishPacket) => void): this;
        on(event: 'error', callback: (error: Error) => void): this;
        on(event: 'close', callback: () => void): this;
        on(event: 'offline', callback: () => void): this;
        on(event: 'reconnect', callback: () => void): this;
        
        publish(topic: string, message: string | Buffer, options?: { qos?: 0 | 1 | 2; retain?: boolean }, callback?: (error?: Error) => void): this;
        subscribe(topic: string | string[], options?: { qos?: 0 | 1 | 2 }, callback?: (error: Error | null, granted?: { topic: string; qos: number }[]) => void): this;
        unsubscribe(topic: string | string[], callback?: (error?: Error) => void): this;
        end(force?: boolean, callback?: () => void): this;
        connected: boolean;
    }

    export function connect(brokerUrl: string, opts?: IClientOptions): MqttClient;
    export function connect(opts: IClientOptions): MqttClient;
}
