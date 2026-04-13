---
sidebar_position: 1
---

# Providers Overview

Providers are framework adapters. They take a compiled config set and generate framework-specific code.

## Available providers

| Name     | Status     | Version                      |
| -------- | ---------- | ---------------------------- |
| `nextjs` | ✅ MVP     | v16 (App Router, Next.js 16+) |
| `remix`  | 🔜 Planned | —                            |
| `nuxt`   | 🔜 Planned | —                            |

## Provider contract

Every provider must implement:

```typescript
interface Provider {
    name: string; // "nextjs"
    label: string; // "Next.js (App Router)"
    initCommand: string; // "npx create-next-app@latest . ..."

    generate(config: ConfigSet, appDir: string): Promise<CompilerResult>;
    startDev(appDir: string): Promise<void>;
    runBuild(appDir: string): Promise<void>;
}
```

## Adding a custom provider

1. Create a class implementing `Provider` from `@codabra/providers`
2. Register it in the `providerRegistry` array
3. Use `--provider my-provider` in CLI commands
