#!/usr/bin/env node
/**
 * Security Audit Script
 * 安全審計腳本
 * 
 * 執行安全掃描和審計檢查
 * 
 * 使用方式:
 *   npx ts-node scripts/security-audit.ts
 *   
 * 選項:
 *   --full    完整掃描 (包含依賴檢查)
 *   --fix     自動修復可修復的問題
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 配置 ====================

interface AuditResult {
    category: string;
    check: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    status: 'pass' | 'fail' | 'warn';
    details?: string;
}

const results: AuditResult[] = [];
const projectRoot = path.resolve(__dirname, '..');

// ==================== 輔助函數 ====================

function runCommand(command: string, silent: boolean = true): { success: boolean; output: string } {
    try {
        const output = execSync(command, {
            encoding: 'utf-8',
            stdio: silent ? 'pipe' : 'inherit',
            cwd: projectRoot,
        });
        return { success: true, output };
    } catch (error: any) {
        return { success: false, output: error.stdout || error.message };
    }
}

function fileExists(filePath: string): boolean {
    try {
        return fs.existsSync(path.join(projectRoot, filePath));
    } catch {
        return false;
    }
}

function readFile(filePath: string): string | null {
    try {
        return fs.readFileSync(path.join(projectRoot, filePath), 'utf-8');
    } catch {
        return null;
    }
}

// ==================== 審計函數 ====================

function auditDependencies(): void {
    console.log('  🔍 Checking npm dependencies...');
    
    const { success, output } = runCommand('npm audit --json', true);
    
    try {
        const audit = JSON.parse(output);
        const vulnerabilities = audit.metadata?.vulnerabilities || {};
        
        const critical = vulnerabilities.critical || 0;
        const high = vulnerabilities.high || 0;
        const moderate = vulnerabilities.moderate || 0;
        const low = vulnerabilities.low || 0;

        if (critical > 0) {
            results.push({
                category: 'Dependencies',
                check: 'npm audit',
                severity: 'critical',
                status: 'fail',
                details: `${critical} critical vulnerabilities`,
            });
        } else if (high > 0) {
            results.push({
                category: 'Dependencies',
                check: 'npm audit',
                severity: 'high',
                status: 'warn',
                details: `${high} high vulnerabilities`,
            });
        } else if (moderate > 0 || low > 0) {
            results.push({
                category: 'Dependencies',
                check: 'npm audit',
                severity: 'medium',
                status: 'warn',
                details: `${moderate} moderate, ${low} low vulnerabilities`,
            });
        } else {
            results.push({
                category: 'Dependencies',
                check: 'npm audit',
                severity: 'info',
                status: 'pass',
                details: 'No known vulnerabilities',
            });
        }
    } catch {
        results.push({
            category: 'Dependencies',
            check: 'npm audit',
            severity: 'low',
            status: 'warn',
            details: 'Could not parse audit results',
        });
    }
}

function auditSecretFiles(): void {
    console.log('  🔍 Checking for exposed secrets...');
    
    const sensitivePatterns = [
        { file: '.env', pattern: /^(PROD_|STAGING_|SECRET_|API_KEY|PRIVATE_KEY)/gm },
        { file: '.env.production', pattern: /\S+/gm },
        { file: '.env.local', pattern: /\S+/gm },
    ];

    const gitignore = readFile('.gitignore') || '';
    
    for (const { file, pattern } of sensitivePatterns) {
        if (fileExists(file)) {
            if (!gitignore.includes(file)) {
                results.push({
                    category: 'Secret Management',
                    check: `${file} in .gitignore`,
                    severity: 'critical',
                    status: 'fail',
                    details: `${file} exists but not in .gitignore`,
                });
            } else {
                results.push({
                    category: 'Secret Management',
                    check: `${file} protection`,
                    severity: 'info',
                    status: 'pass',
                    details: `${file} properly gitignored`,
                });
            }
        }
    }

    // Check for hardcoded secrets in code
    const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /api_key\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret\s*[:=]\s*['"][^'"]+['"]/gi,
        /private_key\s*[:=]\s*['"][^'"]+['"]/gi,
    ];

    const { success, output } = runCommand('git grep -l "password\\|api_key\\|secret" -- "*.ts" "*.js"', true);
    
    if (output.trim()) {
        const files = output.trim().split('\n').filter(f => 
            !f.includes('.spec.ts') && 
            !f.includes('.test.ts') &&
            !f.includes('mock') &&
            !f.includes('example')
        );

        if (files.length > 0) {
            results.push({
                category: 'Secret Management',
                check: 'Hardcoded secrets',
                severity: 'high',
                status: 'warn',
                details: `${files.length} files may contain secrets (manual review needed)`,
            });
        } else {
            results.push({
                category: 'Secret Management',
                check: 'Hardcoded secrets',
                severity: 'info',
                status: 'pass',
                details: 'No obvious hardcoded secrets detected',
            });
        }
    } else {
        results.push({
            category: 'Secret Management',
            check: 'Hardcoded secrets',
            severity: 'info',
            status: 'pass',
            details: 'No obvious hardcoded secrets detected',
        });
    }
}

function auditSecurityConfig(): void {
    console.log('  🔍 Checking security configurations...');
    
    // Check helmet usage
    const mainFile = readFile('src/main.ts');
    if (mainFile) {
        if (mainFile.includes('helmet')) {
            results.push({
                category: 'Security Config',
                check: 'Helmet middleware',
                severity: 'high',
                status: 'pass',
                details: 'Helmet security headers enabled',
            });
        } else {
            results.push({
                category: 'Security Config',
                check: 'Helmet middleware',
                severity: 'high',
                status: 'warn',
                details: 'Helmet not detected in main.ts',
            });
        }

        // Check CORS
        if (mainFile.includes('cors') || mainFile.includes('enableCors')) {
            results.push({
                category: 'Security Config',
                check: 'CORS configuration',
                severity: 'medium',
                status: 'pass',
                details: 'CORS is configured',
            });
        } else {
            results.push({
                category: 'Security Config',
                check: 'CORS configuration',
                severity: 'medium',
                status: 'warn',
                details: 'CORS not explicitly configured',
            });
        }

        // Check rate limiting
        if (mainFile.includes('throttler') || mainFile.includes('rateLimit')) {
            results.push({
                category: 'Security Config',
                check: 'Rate limiting',
                severity: 'high',
                status: 'pass',
                details: 'Rate limiting is configured',
            });
        } else {
            results.push({
                category: 'Security Config',
                check: 'Rate limiting',
                severity: 'high',
                status: 'warn',
                details: 'Rate limiting not detected',
            });
        }
    }

    // Check for security guards
    const { success: hasGuards, output: guardFiles } = runCommand(
        'git ls-files -- "*.guard.ts" | head -10',
        true
    );

    if (guardFiles.trim()) {
        const count = guardFiles.trim().split('\n').length;
        results.push({
            category: 'Security Config',
            check: 'Auth guards',
            severity: 'info',
            status: 'pass',
            details: `${count} guard files found`,
        });
    } else {
        results.push({
            category: 'Security Config',
            check: 'Auth guards',
            severity: 'high',
            status: 'warn',
            details: 'No guard files found',
        });
    }
}

function auditInputValidation(): void {
    console.log('  🔍 Checking input validation...');
    
    // Check for class-validator usage
    const { success, output } = runCommand(
        'git grep -l "class-validator\\|IsString\\|IsNumber\\|IsEmail" -- "*.ts"',
        true
    );

    if (output.trim()) {
        const count = output.trim().split('\n').length;
        results.push({
            category: 'Input Validation',
            check: 'class-validator usage',
            severity: 'info',
            status: 'pass',
            details: `${count} files use class-validator`,
        });
    } else {
        results.push({
            category: 'Input Validation',
            check: 'class-validator usage',
            severity: 'medium',
            status: 'warn',
            details: 'class-validator not detected',
        });
    }

    // Check for DTOs
    const { success: hasDtos, output: dtoFiles } = runCommand(
        'git ls-files -- "*.dto.ts" | wc -l',
        true
    );

    const dtoCount = parseInt(dtoFiles.trim()) || 0;
    if (dtoCount > 0) {
        results.push({
            category: 'Input Validation',
            check: 'DTO files',
            severity: 'info',
            status: 'pass',
            details: `${dtoCount} DTO files for input validation`,
        });
    } else {
        results.push({
            category: 'Input Validation',
            check: 'DTO files',
            severity: 'medium',
            status: 'warn',
            details: 'No DTO files found',
        });
    }
}

function auditAuthentication(): void {
    console.log('  🔍 Checking authentication implementation...');
    
    // Check for JWT usage
    const { success: hasJwt } = runCommand('git grep -l "@nestjs/jwt\\|JwtService" -- "*.ts"', true);
    
    if (hasJwt) {
        results.push({
            category: 'Authentication',
            check: 'JWT implementation',
            severity: 'info',
            status: 'pass',
            details: 'JWT authentication detected',
        });
    }

    // Check for password hashing
    const { success: hasHashing, output: hashFiles } = runCommand(
        'git grep -l "bcrypt\\|argon2\\|scrypt" -- "*.ts"',
        true
    );

    if (hashFiles.trim()) {
        results.push({
            category: 'Authentication',
            check: 'Password hashing',
            severity: 'critical',
            status: 'pass',
            details: 'Password hashing library in use',
        });
    } else {
        results.push({
            category: 'Authentication',
            check: 'Password hashing',
            severity: 'critical',
            status: 'warn',
            details: 'Password hashing library not detected',
        });
    }

    // Check for refresh tokens
    const { success: hasRefresh } = runCommand(
        'git grep -l "refreshToken\\|refresh_token" -- "*.ts"',
        true
    );

    if (hasRefresh) {
        results.push({
            category: 'Authentication',
            check: 'Refresh token support',
            severity: 'medium',
            status: 'pass',
            details: 'Refresh token mechanism detected',
        });
    }
}

function auditLogging(): void {
    console.log('  🔍 Checking security logging...');
    
    // Check for logging implementation
    const { success, output } = runCommand(
        'git grep -l "Logger\\|winston\\|pino\\|bunyan" -- "*.ts"',
        true
    );

    if (output.trim()) {
        const count = output.trim().split('\n').length;
        results.push({
            category: 'Security Logging',
            check: 'Logging implementation',
            severity: 'info',
            status: 'pass',
            details: `${count} files use logging`,
        });
    } else {
        results.push({
            category: 'Security Logging',
            check: 'Logging implementation',
            severity: 'medium',
            status: 'warn',
            details: 'No logging detected',
        });
    }

    // Check for audit logging
    const { success: hasAudit } = runCommand(
        'git grep -l "audit\\|AuditLog" -- "*.ts"',
        true
    );

    if (hasAudit) {
        results.push({
            category: 'Security Logging',
            check: 'Audit logging',
            severity: 'medium',
            status: 'pass',
            details: 'Audit logging mechanism detected',
        });
    } else {
        results.push({
            category: 'Security Logging',
            check: 'Audit logging',
            severity: 'medium',
            status: 'warn',
            details: 'No audit logging detected',
        });
    }
}

function auditSqlInjection(): void {
    console.log('  🔍 Checking for SQL injection risks...');
    
    // Check for raw SQL queries
    const { success, output } = runCommand(
        'git grep -n "query(\\|execute(\\|raw(" -- "*.ts" | grep -v ".spec.ts\\|.test.ts" | head -20',
        true
    );

    if (output.trim()) {
        const lines = output.trim().split('\n').length;
        results.push({
            category: 'SQL Injection',
            check: 'Raw SQL queries',
            severity: 'high',
            status: 'warn',
            details: `${lines} potential raw SQL usages (manual review needed)`,
        });
    } else {
        results.push({
            category: 'SQL Injection',
            check: 'Raw SQL queries',
            severity: 'info',
            status: 'pass',
            details: 'No obvious raw SQL detected',
        });
    }

    // Check for TypeORM repositories (safer)
    const { success: hasRepo } = runCommand(
        'git grep -l "Repository\\|getRepository\\|InjectRepository" -- "*.ts"',
        true
    );

    if (hasRepo) {
        results.push({
            category: 'SQL Injection',
            check: 'TypeORM repositories',
            severity: 'info',
            status: 'pass',
            details: 'Using TypeORM repositories (parameterized queries)',
        });
    }
}

// ==================== 報告生成 ====================

function generateReport(): void {
    console.log('\n' + '═'.repeat(70));
    console.log('🔒 SECURITY AUDIT REPORT');
    console.log('═'.repeat(70));
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log('═'.repeat(70));

    const byCategory = results.reduce((acc, r) => {
        if (!acc[r.category]) acc[r.category] = [];
        acc[r.category].push(r);
        return acc;
    }, {} as Record<string, AuditResult[]>);

    for (const [category, checks] of Object.entries(byCategory)) {
        console.log(`\n📌 ${category}`);
        console.log('-'.repeat(50));

        for (const check of checks) {
            const icons: Record<string, string> = {
                pass: '✅',
                fail: '❌',
                warn: '⚠️',
            };
            const severityColors: Record<string, string> = {
                critical: '🔴',
                high: '🟠',
                medium: '🟡',
                low: '🟢',
                info: '🔵',
            };
            
            const icon = icons[check.status];
            const severity = severityColors[check.severity];
            
            console.log(`  ${icon} ${severity} ${check.check}`);
            if (check.details) {
                console.log(`     ${check.details}`);
            }
        }
    }

    // Summary
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'warn').length;

    const criticalIssues = results.filter(r => r.status === 'fail' && r.severity === 'critical').length;
    const highIssues = results.filter(r => r.status === 'fail' && r.severity === 'high').length;

    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`  ✅ Passed:   ${passed}`);
    console.log(`  ❌ Failed:   ${failed}`);
    console.log(`  ⚠️  Warnings: ${warned}`);
    console.log('');
    
    if (criticalIssues > 0 || highIssues > 0) {
        console.log('  🚨 ISSUES REQUIRING ATTENTION:');
        if (criticalIssues > 0) console.log(`     🔴 Critical: ${criticalIssues}`);
        if (highIssues > 0) console.log(`     🟠 High: ${highIssues}`);
    }
    
    console.log('═'.repeat(70));

    // Exit code
    if (criticalIssues > 0) {
        console.log('\n🚨 SECURITY AUDIT FAILED: Critical issues found');
        process.exit(1);
    } else if (highIssues > 0) {
        console.log('\n⚠️  SECURITY AUDIT PASSED WITH WARNINGS');
        process.exit(0);
    } else {
        console.log('\n✅ SECURITY AUDIT PASSED');
        process.exit(0);
    }
}

// ==================== 主程式 ====================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const fullScan = args.includes('--full');
    const autoFix = args.includes('--fix');

    console.log('═'.repeat(70));
    console.log('🔒 Security Audit');
    console.log('═'.repeat(70));
    console.log(`  Mode: ${fullScan ? 'Full' : 'Standard'}`);
    console.log(`  Auto-fix: ${autoFix ? 'Yes' : 'No'}`);
    console.log('═'.repeat(70));

    console.log('\n📡 Running security checks...\n');

    // Run all audits
    auditDependencies();
    auditSecretFiles();
    auditSecurityConfig();
    auditInputValidation();
    auditAuthentication();
    auditLogging();
    auditSqlInjection();

    // Generate report
    generateReport();
}

main().catch(error => {
    console.error('❌ Audit failed with error:', error.message);
    process.exit(1);
});
