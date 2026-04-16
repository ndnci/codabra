import { spawn, execSync } from "child_process";
import * as path from "path";
import { generateCommand, readProviderConfigs } from "./generate";
import { findConfigDir, findAppDir, logInfo, logError, logSuccess, logWarn } from "../utils";
import { hasDockerDevServices } from "../docker";

export interface DevOptions {
    /** Run the dev server for this specific provider (defaults to first in codabra.json) */
    providerFilter?: string;
    config?: string;
    appDir?: string;
    port?: string;
}

export async function devCommand(opts: DevOptions = {}): Promise<void> {
    const cwd = process.cwd();

    // Determine which provider to serve
    const allConfigs = readProviderConfigs(cwd);
    if (allConfigs.length === 0) {
        logError("No providers configured in codabra.json.");
        process.exit(1);
    }

    const cfg = opts.providerFilter ? allConfigs.find((c) => c.provider === opts.providerFilter) : allConfigs[0];

    if (!cfg) {
        logError(`Provider "${opts.providerFilter}" not found in codabra.json.`);
        process.exit(1);
    }

    if (!opts.providerFilter && allConfigs.length > 1) {
        logWarn(`Multiple providers configured. Starting "${cfg.provider}". Use --provider to pick a different one.`);
    }

    // 1. Start Docker DB services if needed (non-SQLite databases)
    const configDir = findConfigDir(cwd);
    if (configDir) {
        const projectRoot = path.dirname(configDir);
        if (hasDockerDevServices(projectRoot)) {
            logInfo("Starting Docker database services…");
            try {
                execSync("docker compose -f docker/docker-compose.dev.yml up -d", {
                    cwd: projectRoot,
                    stdio: "inherit",
                });
                logSuccess("Database services started");
            } catch {
                logWarn("Could not start Docker services — make sure Docker is running.");
                logWarn("Run 'make dev-up' manually if needed.");
            }
        }
    }

    // 2. Generate first
    logInfo("Generating files from config…");
    const ok = await generateCommand({
        providerFilter: cfg.provider,
        config: opts.config,
        appDir: opts.appDir,
    });

    if (!ok) {
        logError("Generation failed. Fix errors before starting dev server.");
        process.exit(1);
    }

    // 3. Start the dev server
    const appDir = opts.appDir ?? findAppDir(cwd, cfg.provider);
    const port = opts.port ?? "3000";

    logSuccess(`Starting ${cfg.provider} dev server on http://localhost:${port} …`);

    const child = spawn("npx", ["next", "dev", "--port", port], {
        cwd: appDir,
        stdio: "inherit",
        shell: true,
    });

    child.on("error", (err) => {
        logError(`Failed to start dev server: ${err.message}`);
        process.exit(1);
    });

    // Forward SIGINT / SIGTERM
    process.on("SIGINT", () => child.kill("SIGINT"));
    process.on("SIGTERM", () => child.kill("SIGTERM"));
}
