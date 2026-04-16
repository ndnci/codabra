import { spawn } from "child_process";
import { generateCommand, readProviderConfigs } from "./generate";
import { findAppDir, logInfo, logError, logSuccess, logWarn } from "../utils";

export interface BuildOptions {
    /** Build only this specific provider (defaults to first in codabra.json) */
    providerFilter?: string;
    config?: string;
    appDir?: string;
}

export async function buildCommand(opts: BuildOptions = {}): Promise<void> {
    const cwd = process.cwd();

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
        logWarn(`Multiple providers configured. Building "${cfg.provider}". Use --provider to pick a different one.`);
    }

    logInfo("Generating files from config…");
    const ok = await generateCommand({
        providerFilter: cfg.provider,
        config: opts.config,
        appDir: opts.appDir,
    });

    if (!ok) {
        logError("Generation failed. Fix errors before building.");
        process.exit(1);
    }

    const appDir = opts.appDir ?? findAppDir(cwd, cfg.provider);
    logInfo(`Running Next.js build in ${appDir} …`);

    const child = spawn("npx", ["next", "build"], {
        cwd: appDir,
        stdio: "inherit",
        shell: true,
    });

    child.on("close", (code) => {
        if (code === 0) {
            logSuccess("Build complete!");
        } else {
            logError(`Build failed with exit code ${code}`);
            process.exit(code ?? 1);
        }
    });

    child.on("error", (err) => {
        logError(`Failed to run build: ${err.message}`);
        process.exit(1);
    });
}
