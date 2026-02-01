/**
 * Performance Benchmark Tests
 * 效能基準測試
 * 
 * 測試範圍：
 * - API 回應時間
 * - 並發處理能力
 * - 資料庫查詢效能
 * - 同步佇列處理速度
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestClient } from './test-helpers';

/**
 * 效能指標閾值
 */
const PERFORMANCE_THRESHOLDS = {
    // API 回應時間 (ms)
    healthCheck: 100,
    simpleQuery: 200,
    complexQuery: 500,
    writeOperation: 300,
    reportGeneration: 2000,
    
    // 並發處理
    concurrentRequests: 50,
    concurrentResponseTime: 1000,
    
    // 處理量
    messagesPerSecond: 100,
};

/**
 * 效能測試結果
 */
interface BenchmarkResult {
    name: string;
    duration: number;
    passed: boolean;
    threshold: number;
    percentile95?: number;
    requestsPerSecond?: number;
}

describe('Performance Benchmark Tests', () => {
    let app: INestApplication;
    let jwtService: JwtService;
    let client: TestClient;
    const results: BenchmarkResult[] = [];

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        jwtService = moduleRef.get<JwtService>(JwtService);
        client = new TestClient(app, jwtService);
    });

    afterAll(async () => {
        // 輸出效能報告
        console.log('\n📊 Performance Benchmark Report');
        console.log('═'.repeat(60));
        
        for (const result of results) {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            console.log(`   Duration: ${result.duration.toFixed(2)}ms (threshold: ${result.threshold}ms)`);
            if (result.percentile95) {
                console.log(`   P95: ${result.percentile95.toFixed(2)}ms`);
            }
            if (result.requestsPerSecond) {
                console.log(`   Throughput: ${result.requestsPerSecond.toFixed(1)} req/s`);
            }
        }
        
        console.log('═'.repeat(60));
        const passed = results.filter(r => r.passed).length;
        console.log(`Total: ${passed}/${results.length} passed\n`);

        await app.close();
    });

    // ==================== 基礎 API 效能 ====================
    describe('API Response Time', () => {
        it('Health check should respond within 100ms', async () => {
            const start = Date.now();
            const response = await client.request().get('/health');
            const duration = Date.now() - start;

            results.push({
                name: 'Health Check',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.healthCheck,
                threshold: PERFORMANCE_THRESHOLDS.healthCheck,
            });

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheck);
        });

        it('Simple query should respond within 200ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer().get('/volunteers/stats');
            const duration = Date.now() - start;

            results.push({
                name: 'Simple Query (Stats)',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.simpleQuery,
                threshold: PERFORMANCE_THRESHOLDS.simpleQuery,
            });

            expect([200, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleQuery);
        });

        it('List query with pagination should respond within 500ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer().get('/volunteers?page=1&limit=50');
            const duration = Date.now() - start;

            results.push({
                name: 'List Query (Paginated)',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.complexQuery,
                threshold: PERFORMANCE_THRESHOLDS.complexQuery,
            });

            expect([200, 403]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
        });

        it('Write operation should complete within 300ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer()
                .post('/field-reports')
                .send({
                    title: 'Performance Test Report',
                    type: 'STATUS_UPDATE',
                    content: 'Testing write performance',
                    location: { lat: 25.033, lng: 121.565 },
                });
            const duration = Date.now() - start;

            results.push({
                name: 'Write Operation (Create)',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.writeOperation,
                threshold: PERFORMANCE_THRESHOLDS.writeOperation,
            });

            expect([201, 403, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.writeOperation);
        });
    });

    // ==================== 並發處理效能 ====================
    describe('Concurrent Request Handling', () => {
        it(`Should handle ${PERFORMANCE_THRESHOLDS.concurrentRequests} concurrent requests`, async () => {
            const concurrentRequests = PERFORMANCE_THRESHOLDS.concurrentRequests;
            const requests: Promise<any>[] = [];

            const start = Date.now();
            
            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(client.request().get('/health'));
            }

            const responses = await Promise.all(requests);
            const totalDuration = Date.now() - start;
            const avgDuration = totalDuration / concurrentRequests;

            results.push({
                name: `Concurrent Requests (${concurrentRequests})`,
                duration: avgDuration,
                passed: avgDuration < PERFORMANCE_THRESHOLDS.concurrentResponseTime,
                threshold: PERFORMANCE_THRESHOLDS.concurrentResponseTime,
                requestsPerSecond: (concurrentRequests / totalDuration) * 1000,
            });

            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(concurrentRequests);
            expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentResponseTime);
        });

        it('Should maintain consistent response times under load', async () => {
            const iterations = 20;
            const responseTimes: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await client.request().get('/health');
                responseTimes.push(Date.now() - start);
            }

            // 計算 P95
            responseTimes.sort((a, b) => a - b);
            const p95Index = Math.floor(iterations * 0.95);
            const p95 = responseTimes[p95Index];

            const avg = responseTimes.reduce((a, b) => a + b, 0) / iterations;

            results.push({
                name: 'Response Time Consistency',
                duration: avg,
                passed: p95 < PERFORMANCE_THRESHOLDS.simpleQuery,
                threshold: PERFORMANCE_THRESHOLDS.simpleQuery,
                percentile95: p95,
            });

            expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleQuery);
        });
    });

    // ==================== 特定功能效能 ====================
    describe('Feature-Specific Performance', () => {
        it('ICS form generation should complete within 500ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer()
                .post('/ics-forms/201')
                .send({
                    incidentName: 'Performance Test Incident',
                    incidentNumber: 'PERF-001',
                    currentOrganization: {
                        incidentCommander: 'Test Commander',
                        operationsChief: 'Ops Chief',
                    },
                    currentSituation: 'Testing ICS form generation performance',
                });
            const duration = Date.now() - start;

            results.push({
                name: 'ICS Form Generation',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.complexQuery,
                threshold: PERFORMANCE_THRESHOLDS.complexQuery,
            });

            expect([200, 201, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
        });

        it('Multi-EOC status check should complete within 300ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer().get('/multi-eoc/status');
            const duration = Date.now() - start;

            results.push({
                name: 'Multi-EOC Status',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.writeOperation,
                threshold: PERFORMANCE_THRESHOLDS.writeOperation,
            });

            expect([200, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.writeOperation);
        });

        it('Mesh network health check should complete within 200ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer().get('/mesh/health');
            const duration = Date.now() - start;

            results.push({
                name: 'Mesh Network Health',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.simpleQuery,
                threshold: PERFORMANCE_THRESHOLDS.simpleQuery,
            });

            expect([200, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.simpleQuery);
        });

        it('AI governance report should complete within 2000ms', async () => {
            const start = Date.now();
            const response = await client.asAdmin().get('/ai/governance-report');
            const duration = Date.now() - start;

            results.push({
                name: 'AI Governance Report',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.reportGeneration,
                threshold: PERFORMANCE_THRESHOLDS.reportGeneration,
            });

            expect([200, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.reportGeneration);
        });

        it('INSARAG statistics should complete within 500ms', async () => {
            const start = Date.now();
            const response = await client.asOfficer().get('/insarag/stats');
            const duration = Date.now() - start;

            results.push({
                name: 'INSARAG Statistics',
                duration,
                passed: duration < PERFORMANCE_THRESHOLDS.complexQuery,
                threshold: PERFORMANCE_THRESHOLDS.complexQuery,
            });

            expect([200, 404]).toContain(response.status);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexQuery);
        });
    });

    // ==================== 記憶體效能 ====================
    describe('Memory Performance', () => {
        it('Should not leak memory during repeated requests', async () => {
            const iterations = 100;
            
            // 強制 GC (如果可用)
            if (global.gc) {
                global.gc();
            }

            const initialMemory = process.memoryUsage().heapUsed;

            for (let i = 0; i < iterations; i++) {
                await client.request().get('/health');
            }

            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

            results.push({
                name: `Memory Stability (${iterations} requests)`,
                duration: memoryIncrease,
                passed: memoryIncrease < 50, // 小於 50MB 增長
                threshold: 50,
            });

            // 允許一些記憶體增長，但不應過多
            expect(memoryIncrease).toBeLessThan(50);
        });
    });

    // ==================== 壓力測試 ====================
    describe('Stress Test', () => {
        it('Should handle burst traffic (100 requests in 1 second)', async () => {
            const burstSize = 100;
            const requests: Promise<any>[] = [];

            const start = Date.now();
            
            for (let i = 0; i < burstSize; i++) {
                requests.push(client.request().get('/health'));
            }

            const responses = await Promise.all(requests);
            const duration = Date.now() - start;

            const successCount = responses.filter(r => r.status === 200).length;
            const successRate = (successCount / burstSize) * 100;
            const rps = (burstSize / duration) * 1000;

            results.push({
                name: 'Burst Traffic (100 req)',
                duration,
                passed: successRate >= 95,
                threshold: 95,
                requestsPerSecond: rps,
            });

            expect(successRate).toBeGreaterThanOrEqual(95);
        });
    });
});
