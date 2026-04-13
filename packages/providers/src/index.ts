export type { Provider, ProviderRegistryEntry } from "./types";

// Next.js provider
export { NextjsProviderV16, createNextjsProvider, nextjsVersions } from "./nextjs/v16";
export { nextjsRegistryEntry } from "./nextjs";

// ─────────────────────────────────────────────
// Provider registry
// ─────────────────────────────────────────────
import { nextjsRegistryEntry } from "./nextjs";
import type { ProviderRegistryEntry } from "./types";

/**
 * All registered providers.
 * To add a new provider: create its package, implement the Provider interface,
 * register a ProviderRegistryEntry here.
 */
export const providerRegistry: ProviderRegistryEntry[] = [nextjsRegistryEntry];

/**
 * Look up a provider by name.
 */
export function getProvider(name: string): ProviderRegistryEntry {
    const entry = providerRegistry.find((p) => p.name === name);
    if (!entry) {
        const names = providerRegistry.map((p) => p.name).join(", ");
        throw new Error(`Unknown provider "${name}". Available: ${names}`);
    }
    return entry;
}
