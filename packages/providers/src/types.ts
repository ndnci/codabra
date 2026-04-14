import type { ConfigSet, CompilerResult } from "@codabra/core";

/**
 * Every framework provider must implement this interface.
 * This keeps the CLI and core decoupled from any specific framework.
 */
export interface Provider {
    /** Provider identifier, e.g. "nextjs" */
    readonly name: string;

    /** Human-readable label shown in the interactive create CLI */
    readonly label: string;

    /** Command used to initialise a fresh app, e.g. "npx create-next-app@latest ." */
    readonly initCommand: string;

    /**
     * Generate / update the target application from the config set.
     * @param config   The parsed and validated config set
     * @param appDir   Absolute path to the target app directory
     * @param options  Optional generation options (e.g. ORM choice)
     */
    generate(config: ConfigSet, appDir: string, options?: { orm?: string; database?: string }): Promise<CompilerResult>;

    /**
     * Start the framework dev server inside the target app directory.
     * Returns the child process (so the CLI can forward SIGINT, etc.).
     */
    startDev(appDir: string): Promise<void>;

    /**
     * Run the framework build inside the target app directory.
     */
    runBuild(appDir: string): Promise<void>;
}

/** Registry entry — lets the CLI enumerate available providers. */
export interface ProviderRegistryEntry {
    name: string;
    label: string;
    /** Factory function — lazy-loads the provider implementation */
    create(): Provider;
}
