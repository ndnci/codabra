import { spawn } from "child_process";
import * as path from "path";
import { generateCommand } from "./generate";
import { findConfigDir, findAppDir, logInfo, logError, logSuccess } from "../utils";

export interface DevOptions {
    provider?: string;
    config?: string;
    appDir?: string;
    port?: string;
}

export async function devCommand(opts: DevOptions = {}): Promise<void> {
    const providerName = opts.provider ?? "nextjs";

    // 1. Generate first
    logInfo("Generating files from config…");
    const ok = await generateCommand({
        provider: providerName,
        config: opts.config,
        appDir: opts.appDir,
    });

    if (!ok) {
        logError("Generation failed. Fix errors before starting dev server.");
        process.exit(1);
    }

    // 2. Start the dev server
    const appDir = opts.appDir ?? findAppDir(process.cwd(), providerName);
    const port = opts.port ?? "3000";

    logSuccess(`Starting ${providerName} dev server on http://localhost:${port} …`);

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
