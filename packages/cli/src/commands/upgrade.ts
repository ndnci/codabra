import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import ora from "ora";
import { findConfigDir, logSuccess, logInfo, logWarn, logError } from "../utils.js";
import { generateCommand, readProviderConfigs } from "./generate.js";
import { generateDockerConfig } from "../docker.js";

export interface UpgradeOptions {
    version?: string;
}

const PACKAGE_NAME = "@ndnci/codabra";

function findProjectRoot(cwd: string): string | null {
    const configDir = findConfigDir(cwd);
    return configDir ? path.dirname(configDir) : null;
}

/** "alpha" | "beta" | "rc" | "latest" → itself. "0.1.3-alpha.1" → "alpha". else → "latest" */
function distTagFromSpec(spec: string): string {
    if (/^(alpha|beta|rc|latest)$/.test(spec)) return spec;
    const m = spec.match(/-(alpha|beta|rc)\.\d+$/);
    return m ? m[1] : "latest";
}

async function fetchLatestVersion(distTag: string): Promise<string | null> {
    try {
        const res = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}`);
        if (!res.ok) return null;
        const data = (await res.json()) as Record<string, unknown>;
        const tags = data["dist-tags"] as Record<string, string> | undefined;
        return tags?.[distTag] ?? null;
    } catch {
        return null;
    }
}

function getInstalledVersion(projectRoot: string): string | null {
    try {
        const pkgPath = path.join(projectRoot, "node_modules", PACKAGE_NAME, "package.json");
        const raw = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
        return typeof raw.version === "string" ? raw.version : null;
    } catch {
        return null;
    }
}

function runInstall(projectRoot: string): Promise<boolean> {
    return new Promise((resolve) => {
        const child = spawn("pnpm", ["install"], { cwd: projectRoot, stdio: "inherit" });
        child.on("close", (code) => resolve(code === 0));
    });
}

export async function upgradeCommand(opts: UpgradeOptions = {}): Promise<boolean> {
    const cwd = process.cwd();

    const projectRoot = findProjectRoot(cwd);
    if (!projectRoot) {
        logError("Could not find project root. Run this command from your Codabra project.");
        return false;
    }

    // Read package.json
    const pkgPath = path.join(projectRoot, "package.json");
    let pkg: Record<string, unknown>;
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
    } catch {
        logError("Could not read package.json.");
        return false;
    }

    const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const currentSpec = devDeps[PACKAGE_NAME] ?? deps[PACKAGE_NAME];
    const inDevDeps = PACKAGE_NAME in devDeps;

    if (!currentSpec) {
        logError(`${PACKAGE_NAME} not found in package.json. Is this a Codabra project?`);
        return false;
    }

    const distTag = distTagFromSpec(currentSpec);
    const installedVersion = getInstalledVersion(projectRoot);

    let targetVersion: string;

    if (opts.version) {
        targetVersion = opts.version;
    } else {
        const spinner = ora(`Checking latest ${distTag} version…`).start();
        const latest = await fetchLatestVersion(distTag);
        spinner.stop();
        if (!latest) {
            logWarn("Could not reach npm registry. Running generate with current version.");
            return generateCommand({});
        }
        targetVersion = latest;
    }

    if (installedVersion === targetVersion) {
        logSuccess(`Already on ${targetVersion} (${distTag}).`);
        logInfo("Re-running generate to ensure files are up to date…");
    } else {
        logInfo(`Upgrading ${PACKAGE_NAME}: ${installedVersion ?? "unknown"} → ${targetVersion}`);

        if (inDevDeps) {
            (pkg.devDependencies as Record<string, string>)[PACKAGE_NAME] = targetVersion;
        } else {
            (pkg.dependencies as Record<string, string>)[PACKAGE_NAME] = targetVersion;
        }
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n", "utf-8");

        const ok = await runInstall(projectRoot);
        if (!ok) {
            logError("pnpm install failed.");
            return false;
        }
    }

    const generateOk = await generateCommand({});

    // Regenerate Docker config to reflect any structural changes after upgrade
    const providerConfigs = readProviderConfigs(projectRoot);
    if (providerConfigs.length > 0) {
        const projectName = path.basename(projectRoot);
        generateDockerConfig(projectRoot, projectName, providerConfigs);
        logSuccess("Docker config updated");
    }

    return generateOk;
}
