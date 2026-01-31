import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
    CLOSED = 'closed',     // 正常運作
    OPEN = 'open',         // 熔斷（拒絕請求）
    HALF_OPEN = 'half_open', // 測試恢復
}

export interface CircuitConfig {
    name: string;
    failureThreshold: number;  // 失敗次數閾值
    successThreshold: number;  // 恢復所需成功次數
    timeout: number;           // 開放狀態超時（ms）
    halfOpenRequests: number;  // 半開狀態允許的請求數
}

export interface CircuitStatus {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure?: Date;
    lastStateChange: Date;
}

/**
 * Circuit Breaker Service
 * 
 * 熔斷器模式實現：
 * - 失敗偵測
 * - 自動熔斷
 * - 漸進恢復
 */
@Injectable()
export class CircuitBreakerService {
    private readonly logger = new Logger(CircuitBreakerService.name);
    private circuits: Map<string, {
        config: CircuitConfig;
        state: CircuitState;
        failures: number;
        successes: number;
        lastFailure?: Date;
        lastStateChange: Date;
        halfOpenCount: number;
    }> = new Map();

    /**
     * 註冊熔斷器
     */
    register(config: CircuitConfig): void {
        this.circuits.set(config.name, {
            config,
            state: CircuitState.CLOSED,
            failures: 0,
            successes: 0,
            lastStateChange: new Date(),
            halfOpenCount: 0,
        });
        this.logger.log(`Circuit breaker registered: ${config.name}`);
    }

    /**
     * 執行受保護的操作
     */
    async execute<T>(name: string, operation: () => Promise<T>, fallback?: () => T): Promise<T> {
        const circuit = this.circuits.get(name);
        if (!circuit) {
            // 未註冊的熔斷器，建立預設配置
            this.register({
                name,
                failureThreshold: 5,
                successThreshold: 3,
                timeout: 30000,
                halfOpenRequests: 3,
            });
            return this.execute(name, operation, fallback);
        }

        // 檢查是否應從 OPEN 轉為 HALF_OPEN
        if (circuit.state === CircuitState.OPEN) {
            const elapsed = Date.now() - circuit.lastStateChange.getTime();
            if (elapsed >= circuit.config.timeout) {
                this.transitionTo(name, CircuitState.HALF_OPEN);
            }
        }

        // 檢查是否允許請求
        if (!this.canPass(name)) {
            this.logger.warn(`Circuit ${name} is OPEN, rejecting request`);
            if (fallback) {
                return fallback();
            }
            throw new Error(`Circuit breaker ${name} is open`);
        }

        try {
            const result = await operation();
            this.recordSuccess(name);
            return result;
        } catch (error) {
            this.recordFailure(name);
            if (fallback) {
                return fallback();
            }
            throw error;
        }
    }

    /**
     * 檢查是否可以通過
     */
    canPass(name: string): boolean {
        const circuit = this.circuits.get(name);
        if (!circuit) return true;

        switch (circuit.state) {
            case CircuitState.CLOSED:
                return true;
            case CircuitState.OPEN:
                return false;
            case CircuitState.HALF_OPEN:
                return circuit.halfOpenCount < circuit.config.halfOpenRequests;
        }
    }

    /**
     * 記錄成功
     */
    recordSuccess(name: string): void {
        const circuit = this.circuits.get(name);
        if (!circuit) return;

        circuit.successes++;

        if (circuit.state === CircuitState.HALF_OPEN) {
            if (circuit.successes >= circuit.config.successThreshold) {
                this.transitionTo(name, CircuitState.CLOSED);
            }
        }
    }

    /**
     * 記錄失敗
     */
    recordFailure(name: string): void {
        const circuit = this.circuits.get(name);
        if (!circuit) return;

        circuit.failures++;
        circuit.lastFailure = new Date();

        if (circuit.state === CircuitState.HALF_OPEN) {
            this.transitionTo(name, CircuitState.OPEN);
        } else if (circuit.state === CircuitState.CLOSED) {
            if (circuit.failures >= circuit.config.failureThreshold) {
                this.transitionTo(name, CircuitState.OPEN);
            }
        }
    }

    /**
     * 取得熔斷器狀態
     */
    getStatus(name: string): CircuitStatus | null {
        const circuit = this.circuits.get(name);
        if (!circuit) return null;

        return {
            name,
            state: circuit.state,
            failures: circuit.failures,
            successes: circuit.successes,
            lastFailure: circuit.lastFailure,
            lastStateChange: circuit.lastStateChange,
        };
    }

    /**
     * 取得所有熔斷器狀態
     */
    getAllStatus(): CircuitStatus[] {
        return Array.from(this.circuits.keys())
            .map(name => this.getStatus(name))
            .filter((s): s is CircuitStatus => s !== null);
    }

    /**
     * 重置熔斷器
     */
    reset(name: string): void {
        const circuit = this.circuits.get(name);
        if (!circuit) return;

        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
        circuit.lastStateChange = new Date();
        circuit.halfOpenCount = 0;

        this.logger.log(`Circuit ${name} reset to CLOSED`);
    }

    // === Private ===

    private transitionTo(name: string, newState: CircuitState): void {
        const circuit = this.circuits.get(name);
        if (!circuit) return;

        const oldState = circuit.state;
        circuit.state = newState;
        circuit.lastStateChange = new Date();
        
        if (newState === CircuitState.CLOSED) {
            circuit.failures = 0;
            circuit.successes = 0;
        } else if (newState === CircuitState.HALF_OPEN) {
            circuit.successes = 0;
            circuit.halfOpenCount = 0;
        }

        this.logger.log(`Circuit ${name}: ${oldState} -> ${newState}`);
    }
}
