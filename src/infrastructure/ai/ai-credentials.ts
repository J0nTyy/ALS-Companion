/**
 * {@link AiCredentialStore} backed by the OS credential store, reached through the
 * narrow, provider-aware Rust commands (`ai_has_key` / `ai_set_key` / `ai_clear_key`
 * / `ai_list_models`). Each provider's key is stored under its own entry; keys never
 * touch the webview beyond being passed to `ai_set_key`, and are never persisted in
 * the database, localStorage, or the app bundle. Guarded by {@link isTauri}.
 */
import { invoke } from "@tauri-apps/api/core";

import type { AiCredentialStore } from "@/application/ports/ai-assistant";
import type { AiProvider } from "@/application/ai/ai-types";
import { DesktopRequiredError } from "@/application/errors";
import { isTauri } from "@/infrastructure/platform/environment";

export class AiCredentials implements AiCredentialStore {
  async hasKey(provider: AiProvider): Promise<boolean> {
    if (!isTauri()) return false;
    return invoke<boolean>("ai_has_key", { provider });
  }

  async saveKey(provider: AiProvider, key: string): Promise<void> {
    if (!isTauri()) throw new DesktopRequiredError();
    await invoke("ai_set_key", { provider, key });
  }

  async clearKey(provider: AiProvider): Promise<void> {
    if (!isTauri()) return;
    await invoke("ai_clear_key", { provider });
  }

  async listModels(provider: AiProvider): Promise<string[]> {
    if (!isTauri()) return [];
    return invoke<string[]>("ai_list_models", { provider });
  }
}
