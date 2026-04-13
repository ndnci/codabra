import { spawn } from "child_process";
import { generateCommand } from "./generate";
import { findAppDir, logInfo, logError, logSuccess } from "../utils";

export interface BuildOptions {
    provider?: string;
    config?: string;
    appDir?: string;
}

export async function buildCommand(opts: BuildOptions = {}): Promise<void> {
    const providerName = opts.provider ?? "nextjs";

    logInfo("Generating files from config…");
    const ok = await generateCommand({
        provider: providerName,
        config: opts.config,
        appDir: opts.appDir,
    });

    if (!ok) {
        logError("Generation failed. Fix errors before building.");
        process.exit(1);
    }

    const appDir = opts.appDir ?? findAppDir(process.cwd(), providerName);
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
