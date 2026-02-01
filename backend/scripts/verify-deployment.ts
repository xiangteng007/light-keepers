#!/usr/bin/env node
/**
 * Production Deployment Verification Script
 * 生產環境部署驗證
 * 
 * 使用方式:
 *   npx ts-node scripts/verify-deployment.ts [environment]
 *   
 * 環境:
 *   staging  - 測試環境 (default)
 *   prod     - 生產環境
 */

const https = require('https');
const http = require('http');

// ==================== 配置 ====================

interface Environment {
    name: string;
    apiUrl: string;
    frontendUrl: string;
    expectedVersion?: string;
}

const ENVIRONMENTS: Record<string, Environment> = {
    staging: {
        name: 'Staging',
        apiUrl: process.env.STAGING_API_URL || 'https://erp-api-staging-xxxxx.run.app',
        frontendUrl: process.env.STAGING_FRONTEND_URL || 'https://light-keepers-staging.vercel.app',
    },
    prod: {
        name: 'Production',
        apiUrl: process.env.PROD_API_URL || 'https://erp-api-xxxxx.run.app',
        frontendUrl: process.env.PROD_FRONTEND_URL || 'https://light-keepers.vercel.app',
    },
};

// ==================== 驗證結果 ====================

interface VerificationResult {
    category: string;
    check: string;
    status: 'pass' | 'fail' | 'warn' | 'skip';
    details?: string;
    duration?: number;
}

const results: VerificationResult[] = [];

// ==================== HTTP 工具 ====================

async function httpGet(url: string, options: { timeout?: number; headers?: Record<string, string> } = {}): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    duration: number;
}> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const protocol = url.startsWith('https') ? https : http;
        const timeout = options.timeout || 10000;

        const req = protocol.get(url, {
            timeout,
            headers: options.headers || {},
        }, (res: any) => {
            let body = '';
            res.on('data', (chunk: string) => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body,
                    duration: Date.now() - start,
                });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeout}ms`));
        });

        req.on('error', reject);
    });
}

async function httpPost(url: string, data: any, options: { timeout?: number; headers?: Record<string, string> } = {}): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    duration: number;
}> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const urlObj = new URL(url);
        const protocol = url.startsWith('https') ? https : http;
        const timeout = options.timeout || 10000;
        const postData = JSON.stringify(data);

        const req = protocol.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            timeout,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                ...options.headers,
            },
        }, (res: any) => {
            let body = '';
            res.on('data', (chunk: string) => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body,
                    duration: Date.now() - start,
                });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeout}ms`));
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ==================== 驗證函數 ====================

async function verifyHealthEndpoint(env: Environment): Promise<void> {
    console.log('  🔍 Checking health endpoint...');
    
    try {
        const response = await httpGet(`${env.apiUrl}/health`);
        
        if (response.status === 200) {
            results.push({
                category: 'API Health',
                check: 'Health endpoint',
                status: 'pass',
                details: `Response in ${response.duration}ms`,
                duration: response.duration,
            });
        } else {
            results.push({
                category: 'API Health',
                check: 'Health endpoint',
                status: 'fail',
                details: `HTTP ${response.status}`,
            });
        }
    } catch (error: any) {
        results.push({
            category: 'API Health',
            check: 'Health endpoint',
            status: 'fail',
            details: error.message,
        });
    }
}

async function verifyApiVersion(env: Environment): Promise<void> {
    console.log('  🔍 Checking API version...');
    
    try {
        const response = await httpGet(`${env.apiUrl}/health`);
        const body = JSON.parse(response.body);
        
        if (body.version) {
            results.push({
                category: 'API Health',
                check: 'API version',
                status: 'pass',
                details: `Version: ${body.version}`,
            });
        } else {
            results.push({
                category: 'API Health',
                check: 'API version',
                status: 'warn',
                details: 'Version not exposed in health check',
            });
        }
    } catch (error: any) {
        results.push({
            category: 'API Health',
            check: 'API version',
            status: 'skip',
            details: 'Could not parse health response',
        });
    }
}

async function verifyDatabaseConnection(env: Environment): Promise<void> {
    console.log('  🔍 Checking database connection...');
    
    try {
        const response = await httpGet(`${env.apiUrl}/health/db`);
        
        if (response.status === 200) {
            results.push({
                category: 'Infrastructure',
                check: 'Database connection',
                status: 'pass',
                details: `Response in ${response.duration}ms`,
                duration: response.duration,
            });
        } else if (response.status === 404) {
            // Fallback: check general health
            const healthResponse = await httpGet(`${env.apiUrl}/health`);
            const body = JSON.parse(healthResponse.body);
            
            if (body.database === 'ok' || body.db === 'healthy') {
                results.push({
                    category: 'Infrastructure',
                    check: 'Database connection',
                    status: 'pass',
                    details: 'Database healthy (from /health)',
                });
            } else {
                results.push({
                    category: 'Infrastructure',
                    check: 'Database connection',
                    status: 'warn',
                    details: 'DB health endpoint not available',
                });
            }
        } else {
            results.push({
                category: 'Infrastructure',
                check: 'Database connection',
                status: 'fail',
                details: `HTTP ${response.status}`,
            });
        }
    } catch (error: any) {
        results.push({
            category: 'Infrastructure',
            check: 'Database connection',
            status: 'fail',
            details: error.message,
        });
    }
}

async function verifyAuthEndpoint(env: Environment): Promise<void> {
    console.log('  🔍 Checking auth endpoint...');
    
    try {
        const response = await httpPost(`${env.apiUrl}/auth/login`, {
            email: 'verification-test@example.com',
            password: 'invalid',
        });
        
        // Should return 401 (not 500 or connection error)
        if (response.status === 401 || response.status === 400) {
            results.push({
                category: 'API Functionality',
                check: 'Auth endpoint',
                status: 'pass',
                details: 'Auth rejection working correctly',
                duration: response.duration,
            });
        } else if (response.status === 404) {
            results.push({
                category: 'API Functionality',
                check: 'Auth endpoint',
                status: 'warn',
                details: 'Auth endpoint not found',
            });
        } else {
            results.push({
                category: 'API Functionality',
                check: 'Auth endpoint',
                status: 'fail',
                details: `Unexpected status: ${response.status}`,
            });
        }
    } catch (error: any) {
        results.push({
            category: 'API Functionality',
            check: 'Auth endpoint',
            status: 'fail',
            details: error.message,
        });
    }
}

async function verifyPublicEndpoints(env: Environment): Promise<void> {
    console.log('  🔍 Checking public endpoints...');
    
    const publicEndpoints = [
        '/public/announcements',
        '/public/emergency-info',
        '/public/shelter-locations',
    ];

    for (const endpoint of publicEndpoints) {
        try {
            const response = await httpGet(`${env.apiUrl}${endpoint}`);
            
            if (response.status === 200) {
                results.push({
                    category: 'API Functionality',
                    check: `Public endpoint: ${endpoint}`,
                    status: 'pass',
                    duration: response.duration,
                });
            } else if (response.status === 404) {
                results.push({
                    category: 'API Functionality',
                    check: `Public endpoint: ${endpoint}`,
                    status: 'skip',
                    details: 'Endpoint not implemented',
                });
            } else {
                results.push({
                    category: 'API Functionality',
                    check: `Public endpoint: ${endpoint}`,
                    status: 'fail',
                    details: `HTTP ${response.status}`,
                });
            }
        } catch (error: any) {
            results.push({
                category: 'API Functionality',
                check: `Public endpoint: ${endpoint}`,
                status: 'fail',
                details: error.message,
            });
        }
    }
}

async function verifySecurityHeaders(env: Environment): Promise<void> {
    console.log('  🔍 Checking security headers...');
    
    try {
        const response = await httpGet(`${env.apiUrl}/health`);
        
        const securityHeaders: Record<string, string | undefined> = {
            'x-content-type-options': response.headers['x-content-type-options'],
            'x-frame-options': response.headers['x-frame-options'],
            'strict-transport-security': response.headers['strict-transport-security'],
        };

        const missingHeaders = Object.entries(securityHeaders)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingHeaders.length === 0) {
            results.push({
                category: 'Security',
                check: 'Security headers',
                status: 'pass',
                details: 'All security headers present',
            });
        } else {
            results.push({
                category: 'Security',
                check: 'Security headers',
                status: 'warn',
                details: `Missing: ${missingHeaders.join(', ')}`,
            });
        }
    } catch (error: any) {
        results.push({
            category: 'Security',
            check: 'Security headers',
            status: 'fail',
            details: error.message,
        });
    }
}

async function verifyProtectedEndpoints(env: Environment): Promise<void> {
    console.log('  🔍 Checking protected endpoint access control...');
    
    const protectedEndpoints = ['/volunteers', '/missions', '/resources'];

    for (const endpoint of protectedEndpoints) {
        try {
            const response = await httpGet(`${env.apiUrl}${endpoint}`);
            
            if (response.status === 401) {
                results.push({
                    category: 'Security',
                    check: `Protected: ${endpoint}`,
                    status: 'pass',
                    details: 'Returns 401 without auth',
                });
            } else if (response.status === 404) {
                results.push({
                    category: 'Security',
                    check: `Protected: ${endpoint}`,
                    status: 'skip',
                    details: 'Endpoint not found',
                });
            } else {
                results.push({
                    category: 'Security',
                    check: `Protected: ${endpoint}`,
                    status: 'fail',
                    details: `Expected 401, got ${response.status}`,
                });
            }
        } catch (error: any) {
            results.push({
                category: 'Security',
                check: `Protected: ${endpoint}`,
                status: 'fail',
                details: error.message,
            });
        }
    }
}

async function verifyResponseTimes(env: Environment): Promise<void> {
    console.log('  🔍 Checking response times...');
    
    const thresholds: Record<string, number> = {
        '/health': 200,
        '/public/announcements': 500,
    };

    for (const [endpoint, threshold] of Object.entries(thresholds)) {
        try {
            const response = await httpGet(`${env.apiUrl}${endpoint}`);
            
            if (response.status === 200) {
                const passed = response.duration < threshold;
                results.push({
                    category: 'Performance',
                    check: `Response time: ${endpoint}`,
                    status: passed ? 'pass' : 'warn',
                    details: `${response.duration}ms (threshold: ${threshold}ms)`,
                    duration: response.duration,
                });
            } else if (response.status === 404) {
                results.push({
                    category: 'Performance',
                    check: `Response time: ${endpoint}`,
                    status: 'skip',
                    details: 'Endpoint not found',
                });
            }
        } catch (error: any) {
            results.push({
                category: 'Performance',
                check: `Response time: ${endpoint}`,
                status: 'fail',
                details: error.message,
            });
        }
    }
}

async function verifyFrontend(env: Environment): Promise<void> {
    console.log('  🔍 Checking frontend deployment...');
    
    try {
        const response = await httpGet(env.frontendUrl);
        
        if (response.status === 200) {
            results.push({
                category: 'Frontend',
                check: 'Frontend accessibility',
                status: 'pass',
                duration: response.duration,
            });

            // Check for expected content
            if (response.body.includes('<html') || response.body.includes('<!DOCTYPE')) {
                results.push({
                    category: 'Frontend',
                    check: 'HTML content',
                    status: 'pass',
                    details: 'Valid HTML response',
                });
            } else {
                results.push({
                    category: 'Frontend',
                    check: 'HTML content',
                    status: 'warn',
                    details: 'Response may not be HTML',
                });
            }
        } else {
            results.push({
                category: 'Frontend',
                check: 'Frontend accessibility',
                status: 'fail',
                details: `HTTP ${response.status}`,
            });
        }
    } catch (error: any) {
        results.push({
            category: 'Frontend',
            check: 'Frontend accessibility',
            status: 'fail',
            details: error.message,
        });
    }
}

// ==================== 報告生成 ====================

function generateReport(): void {
    console.log('\n' + '═'.repeat(70));
    console.log('📋 DEPLOYMENT VERIFICATION REPORT');
    console.log('═'.repeat(70));

    const byCategory = results.reduce((acc, r) => {
        if (!acc[r.category]) acc[r.category] = [];
        acc[r.category].push(r);
        return acc;
    }, {} as Record<string, VerificationResult[]>);

    for (const [category, checks] of Object.entries(byCategory)) {
        console.log(`\n📌 ${category}`);
        console.log('-'.repeat(50));

        for (const check of checks) {
            const icons: Record<string, string> = {
                pass: '✅',
                fail: '❌',
                warn: '⚠️',
                skip: '⏭️',
            };
            const icon = icons[check.status];
            console.log(`  ${icon} ${check.check}`);
            if (check.details) {
                console.log(`     ${check.details}`);
            }
        }
    }

    // Summary
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'warn').length;
    const skipped = results.filter(r => r.status === 'skip').length;

    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`  ✅ Passed:  ${passed}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log(`  ⚠️  Warnings: ${warned}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log('═'.repeat(70));

    if (failed > 0) {
        console.log('\n🚨 DEPLOYMENT VERIFICATION FAILED');
        console.log('Please fix the failing checks before proceeding.');
        process.exit(1);
    } else if (warned > 0) {
        console.log('\n⚠️  DEPLOYMENT VERIFIED WITH WARNINGS');
        console.log('Consider addressing the warnings for optimal operation.');
        process.exit(0);
    } else {
        console.log('\n✅ DEPLOYMENT VERIFICATION PASSED');
        process.exit(0);
    }
}

// ==================== 主程式 ====================

async function main(): Promise<void> {
    const envName = process.argv[2] || 'staging';
    const env = ENVIRONMENTS[envName];

    if (!env) {
        console.error(`❌ Unknown environment: ${envName}`);
        console.error(`Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
        process.exit(1);
    }

    console.log('═'.repeat(70));
    console.log(`🚀 Deployment Verification: ${env.name}`);
    console.log('═'.repeat(70));
    console.log(`  API:      ${env.apiUrl}`);
    console.log(`  Frontend: ${env.frontendUrl}`);
    console.log('═'.repeat(70));

    console.log('\n📡 Running verification checks...\n');

    // Run all verifications
    await verifyHealthEndpoint(env);
    await verifyApiVersion(env);
    await verifyDatabaseConnection(env);
    await verifyAuthEndpoint(env);
    await verifyPublicEndpoints(env);
    await verifySecurityHeaders(env);
    await verifyProtectedEndpoints(env);
    await verifyResponseTimes(env);
    await verifyFrontend(env);

    // Generate report
    generateReport();
}

main().catch(error => {
    console.error('❌ Verification failed with error:', error.message);
    process.exit(1);
});
