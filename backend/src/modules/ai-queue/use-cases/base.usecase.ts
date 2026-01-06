import { AiJob } from '../entities';

/**
 * Base interface for all AI use cases
 */
export interface AiUseCase {
    /**
     * Use case identifier
     */
    readonly useCaseId: string;

    /**
     * Execute AI processing
     */
    execute(job: AiJob): Promise<object>;

    /**
     * Fallback when AI is unavailable
     */
    fallback(job: AiJob): Promise<object>;
}

/**
 * Base class with common utilities
 */
export abstract class BaseUseCase implements AiUseCase {
    abstract readonly useCaseId: string;
    abstract execute(job: AiJob): Promise<object>;
    abstract fallback(job: AiJob): Promise<object>;

    /**
     * Build prompt from template
     */
    protected buildPrompt(template: string, data: Record<string, any>): string {
        let prompt = template;
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
        }
        return prompt;
    }

    /**
     * Truncate text to max length
     */
    protected truncate(text: string, maxLength: number): string {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
}
