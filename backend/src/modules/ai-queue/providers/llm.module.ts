import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { LlmProviderService } from './llm-provider.service';

/**
 * Shared LLM access layer (M.2).
 *
 * Import this module anywhere that needs an LLM instead of instantiating a
 * client directly. Consumers should depend on `LlmProviderService` so that the
 * `LLM_PROVIDER` routing (gemini / local / hybrid) applies uniformly.
 *
 * `GeminiProvider` stays exported for the multimodal call sites
 * (`generateWithImage` / `generateWithAudio`) that have no local equivalent yet.
 */
@Module({
    imports: [ConfigModule],
    providers: [GeminiProvider, OpenAiCompatibleProvider, LlmProviderService],
    exports: [GeminiProvider, OpenAiCompatibleProvider, LlmProviderService],
})
export class LlmModule { }
