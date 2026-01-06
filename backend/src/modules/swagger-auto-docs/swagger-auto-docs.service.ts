import { Injectable, Logger } from '@nestjs/common';

/**
 * Swagger Auto Docs Service
 * Automatic API documentation generation
 */
@Injectable()
export class SwaggerAutoDocsService {
    private readonly logger = new Logger(SwaggerAutoDocsService.name);
    private apiDocs: Map<string, ApiEndpoint> = new Map();

    /**
     * 註冊 API 端點
     */
    registerEndpoint(endpoint: ApiEndpoint): void {
        const key = `${endpoint.method}:${endpoint.path}`;
        this.apiDocs.set(key, endpoint);
    }

    /**
     * 取得所有端點
     */
    getAllEndpoints(): ApiEndpoint[] {
        return Array.from(this.apiDocs.values());
    }

    /**
     * 依模組分組
     */
    getEndpointsByModule(): Record<string, ApiEndpoint[]> {
        const grouped: Record<string, ApiEndpoint[]> = {};

        for (const endpoint of this.apiDocs.values()) {
            const module = endpoint.module || 'default';
            if (!grouped[module]) grouped[module] = [];
            grouped[module].push(endpoint);
        }

        return grouped;
    }

    /**
     * 產生 OpenAPI 規格
     */
    generateOpenApiSpec(): OpenApiSpec {
        const paths: Record<string, any> = {};

        for (const endpoint of this.apiDocs.values()) {
            if (!paths[endpoint.path]) paths[endpoint.path] = {};

            paths[endpoint.path][endpoint.method.toLowerCase()] = {
                summary: endpoint.summary,
                description: endpoint.description,
                tags: [endpoint.module],
                operationId: endpoint.operationId,
                parameters: endpoint.parameters?.map((p) => ({
                    name: p.name,
                    in: p.in,
                    required: p.required,
                    schema: { type: p.type },
                    description: p.description,
                })),
                requestBody: endpoint.requestBody ? {
                    required: true,
                    content: { 'application/json': { schema: endpoint.requestBody } },
                } : undefined,
                responses: {
                    200: { description: 'Success', content: { 'application/json': { schema: endpoint.responseSchema } } },
                    400: { description: 'Bad Request' },
                    401: { description: 'Unauthorized' },
                    403: { description: 'Forbidden' },
                    500: { description: 'Internal Server Error' },
                },
                security: endpoint.requiresAuth ? [{ bearerAuth: [] }] : [],
            };
        }

        return {
            openapi: '3.0.3',
            info: {
                title: '光守護者災防平台 API',
                version: '18.0.0',
                description: 'Light Keepers Disaster Prevention Platform API Documentation',
                contact: { name: 'Light Keepers', email: 'api@lightkeepers.org' },
            },
            servers: [
                { url: 'https://api.lightkeepers.org', description: 'Production' },
                { url: 'http://localhost:3000', description: 'Development' },
            ],
            paths,
            components: {
                securitySchemes: {
                    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                },
            },
            tags: this.generateTags(),
        };
    }

    /**
     * 產生 Markdown 文件
     */
    generateMarkdownDocs(): string {
        const grouped = this.getEndpointsByModule();
        let md = '# 光守護者 API 文件\n\n';

        for (const [module, endpoints] of Object.entries(grouped)) {
            md += `## ${module}\n\n`;

            for (const ep of endpoints) {
                md += `### ${ep.method} ${ep.path}\n\n`;
                md += `**${ep.summary}**\n\n`;
                if (ep.description) md += `${ep.description}\n\n`;

                if (ep.parameters?.length) {
                    md += '#### Parameters\n\n';
                    md += '| Name | In | Type | Required | Description |\n';
                    md += '|------|-----|------|----------|-------------|\n';
                    for (const p of ep.parameters) {
                        md += `| ${p.name} | ${p.in} | ${p.type} | ${p.required ? '✓' : ''} | ${p.description || ''} |\n`;
                    }
                    md += '\n';
                }

                md += '---\n\n';
            }
        }

        return md;
    }

    /**
     * 自動掃描並註冊
     */
    autoRegister(controllers: any[]): void {
        // 實際應使用 Reflect metadata 掃描裝飾器
        this.logger.log(`Auto-registering ${controllers.length} controllers`);
    }

    private generateTags(): { name: string; description: string }[] {
        const modules = new Set(Array.from(this.apiDocs.values()).map((e) => e.module));
        return Array.from(modules).map((m) => ({ name: m!, description: `${m} related endpoints` }));
    }
}

// Types
interface ApiParameter { name: string; in: 'path' | 'query' | 'header'; type: string; required: boolean; description?: string; }
interface ApiEndpoint { method: string; path: string; summary: string; description?: string; module?: string; operationId?: string; parameters?: ApiParameter[]; requestBody?: any; responseSchema?: any; requiresAuth?: boolean; }
interface OpenApiSpec { openapi: string; info: any; servers: any[]; paths: any; components: any; tags: any[]; }
