/**
 * Ports for the AI assistant boundary (implemented in infrastructure).
 *
 * `AiAssistant` is the model provider: given a request (system prompt, turns,
 * tool declarations), it returns the model's reply. `AiCredentialStore` manages
 * the provider API key, which is kept in the OS credential store on the native
 * side — never in the database, localStorage, or the app bundle.
 */
import type {
  AiGenerateRequest,
  AiGenerateResult,
  AiProvider,
} from "@/application/ai/ai-types";

export interface AiAssistant {
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
}

/** Per-provider key custody + model discovery (each provider has its own key). */
export interface AiCredentialStore {
  /** Whether a non-empty API key is stored for the provider. */
  hasKey(provider: AiProvider): Promise<boolean>;
  /** Save (replace) the provider's API key in secure storage. */
  saveKey(provider: AiProvider, key: string): Promise<void>;
  /** Remove the provider's stored API key (a missing key is not an error). */
  clearKey(provider: AiProvider): Promise<void>;
  /** Model ids the provider's key can use (for the Settings picker). */
  listModels(provider: AiProvider): Promise<string[]>;
}
