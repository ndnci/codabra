import { execSync } from "child_process";
import * as path from "path";
import type { Provider } from "../../types";
import type { ConfigSet, CompilerResult } from "@codabra/core";
import { Compiler } from "@codabra/core";

/**
 * Next.js provider — v16 (App Router, Next.js 16.2.3).
 *
 * Responsibilities:
 *  - initCommand: bootstraps a new Next.js project
 *  - generate: uses @codabra/core Compiler to emit types, API routes, pages
 *  - startDev / runBuild: delegate to `next dev` / `next build`
 */
export class NextjsProviderV16 implements Provider {
    readonly name = "nextjs";
    readonly label = "Next.js 16 (App Router)";
    readonly initCommand =
        'npx create-next-app@16.2.3 . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --yes';

    async generate(config: ConfigSet, appDir: string, options?: { orm?: string }): Promise<CompilerResult> {
        const compiler = new Compiler({ appDir, strict: false, orm: options?.orm ?? "drizzle" });
        return compiler.compile(config);
    }

    async startDev(appDir: string): Promise<void> {
        // Run next dev in the app directory — inherits stdio so output is visible
        const cmd = `cd ${JSON.stringify(appDir)} && npx next dev`;
        execSync(cmd, { stdio: "inherit" });
    }

    async runBuild(appDir: string): Promise<void> {
        execSync(`npx next build`, { cwd: appDir, stdio: "inherit" });
    }
}

/** Versioned map — key is the Next.js major version targeted */
export const nextjsVersions: Record<string, () => NextjsProviderV16> = {
    v16: () => new NextjsProviderV16(),
};

/** Default version */
export function createNextjsProvider(version = "v16"): NextjsProviderV16 {
    const factory = nextjsVersions[version];
    if (!factory) {
        throw new Error(
            `Unknown Next.js provider version: "${version}". Available: ${Object.keys(nextjsVersions).join(", ")}`,
        );
    }
    return factory();
}
