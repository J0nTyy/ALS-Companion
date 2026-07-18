/**
 * {@link AiAssistant} that routes to the provider named on each request. Gemini uses
 * the `generateContent` shape; Groq (and other OpenAI-compatible providers) use the
 * chat-completions shape. Either way the actual HTTPS call is the narrow Rust
 * `ai_generate` command, which injects the stored key and talks to the provider —
 * so the key stays out of the webview/bundle and the request bypasses the webview
 * CSP. This adapter only maps to/from each provider's wire format. Guarded by
 * {@link isTauri}: unavailable in the browser preview.
 */
import { invoke } from "@tauri-apps/api/core";

import type { AiAssistant } from "@/application/ports/ai-assistant";
import type {
  AiGenerateRequest,
  AiGenerateResult,
} from "@/application/ai/ai-types";
import { DesktopRequiredError } from "@/application/errors";
import { isTauri } from "@/infrastructure/platform/environment";
import {
  fromGeminiResponse,
  toGeminiRequest,
} from "@/infrastructure/ai/gemini-mapping";
import {
  fromOpenAiResponse,
  toOpenAiRequest,
} from "@/infrastructure/ai/openai-mapping";

export class MultiProviderAssistant implements AiAssistant {
  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    if (!isTauri()) throw new DesktopRequiredError();

    if (request.provider === "groq") {
      const body = toOpenAiRequest(request);
      const raw = await invoke<unknown>("ai_generate", {
        provider: "groq",
        model: request.model,
        body,
      });
      return fromOpenAiResponse(raw);
    }

    const body = toGeminiRequest(request);
    const raw = await invoke<unknown>("ai_generate", {
      provider: "gemini",
      model: request.model,
      body,
    });
    return fromGeminiResponse(raw);
  }
}
