import { Injectable, Logger, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * IP Whitelist Service
 * Access control by IP address
 */
@Injectable()
export class IpWhitelistService {
    private readonly logger = new Logger(IpWhitelistService.name);
    private whitelist: Set<string> = new Set();
    private blacklist: Set<string> = new Set();
    private cidrRules: CidrRule[] = [];

    constructor() {
        this.loadDefaultRules();
    }

    private loadDefaultRules() {
        // Localhost
        this.whitelist.add('127.0.0.1');
        this.whitelist.add('::1');

        // 內網範圍
        this.cidrRules.push(
            { cidr: '10.0.0.0/8', allowed: true },
            { cidr: '172.16.0.0/12', allowed: true },
            { cidr: '192.168.0.0/16', allowed: true },
        );
    }

    /**
     * 檢查 IP 是否允許
     */
    isAllowed(ip: string): boolean {
        // 黑名單優先
        if (this.blacklist.has(ip)) return false;

        // 白名單
        if (this.whitelist.has(ip)) return true;

        // CIDR 規則
        for (const rule of this.cidrRules) {
            if (this.matchCidr(ip, rule.cidr)) {
                return rule.allowed;
            }
        }

        // 預設允許 (可設為 false 改為嚴格模式)
        return true;
    }

    /**
     * 新增白名單
     */
    addToWhitelist(ip: string): void {
        this.whitelist.add(ip);
        this.blacklist.delete(ip);
        this.logger.log(`Added ${ip} to whitelist`);
    }

    /**
     * 新增黑名單
     */
    addToBlacklist(ip: string): void {
        this.blacklist.add(ip);
        this.whitelist.delete(ip);
        this.logger.log(`Added ${ip} to blacklist`);
    }

    /**
     * 移除 IP
     */
    remove(ip: string): void {
        this.whitelist.delete(ip);
        this.blacklist.delete(ip);
    }

    /**
     * 新增 CIDR 規則
     */
    addCidrRule(cidr: string, allowed: boolean): void {
        this.cidrRules.push({ cidr, allowed });
    }

    /**
     * 取得所有規則
     */
    getRules(): IpRules {
        return {
            whitelist: Array.from(this.whitelist),
            blacklist: Array.from(this.blacklist),
            cidrRules: this.cidrRules,
        };
    }

    /**
     * 匯入規則
     */
    importRules(rules: IpRules): void {
        this.whitelist = new Set(rules.whitelist);
        this.blacklist = new Set(rules.blacklist);
        this.cidrRules = rules.cidrRules;
    }

    /**
     * 取得存取日誌
     */
    getAccessLog(): AccessLogEntry[] {
        // TODO: 實作存取日誌
        return [];
    }

    private matchCidr(ip: string, cidr: string): boolean {
        const [range, bits] = cidr.split('/');
        const mask = parseInt(bits, 10);

        const ipNum = this.ipToNumber(ip);
        const rangeNum = this.ipToNumber(range);

        const maskNum = ~((1 << (32 - mask)) - 1);

        return (ipNum & maskNum) === (rangeNum & maskNum);
    }

    private ipToNumber(ip: string): number {
        if (ip.includes(':')) return 0; // IPv6 簡化處理

        const parts = ip.split('.').map(Number);
        return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    }
}

/**
 * IP Whitelist Guard
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
    constructor(private ipService: IpWhitelistService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const ip = request.ip || request.connection?.remoteAddress || 'unknown';

        return this.ipService.isAllowed(ip);
    }
}

// Types
interface CidrRule { cidr: string; allowed: boolean; }
interface IpRules { whitelist: string[]; blacklist: string[]; cidrRules: CidrRule[]; }
interface AccessLogEntry { ip: string; timestamp: Date; allowed: boolean; path: string; }
