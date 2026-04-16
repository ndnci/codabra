import * as path from "path";
import * as fs from "fs";
import chalk from "chalk";
import { getOrmAdapter } from "@codabra/core";

/** Locate the nearest /config directory, walking up from cwd. */
export function findConfigDir(startDir: string = process.cwd()): string | null {
    let current = startDir;
    // Walk up max 5 levels to find a config/ directory
    for (let i = 0; i < 6; i++) {
        const candidate = path.join(current, "config");
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate;
        }
        const parent = path.dirname(current);
        if (parent === current) break; // reached filesystem root
        current = parent;
    }
    return null;
}

/** Locate the target app directory for a given provider. */
export function findAppDir(startDir: string = process.cwd(), provider = "nextjs"): string {
    // Convention: apps/<provider> relative to project root (parent of config/)
    const configDir = findConfigDir(startDir);
    if (configDir) {
        const projectRoot = path.dirname(configDir);
        const appsDir = path.join(projectRoot, "apps", provider);
        if (fs.existsSync(appsDir)) return appsDir;
        // Fallback: apps/web
        const webDir = path.join(projectRoot, "apps", "web");
        if (fs.existsSync(webDir)) return webDir;
    }
    // Last resort: cwd
    return startDir;
}

export function logSuccess(msg: string): void {
    console.log(chalk.green("✔"), msg);
}

export function logInfo(msg: string): void {
    console.log(chalk.cyan("ℹ"), msg);
}

export function logWarn(msg: string): void {
    console.log(chalk.yellow("⚠"), msg);
}

export function logError(msg: string): void {
    console.error(chalk.red("✖"), msg);
}

/**
 * Injects ORM runtime/dev deps into the app's package.json.
 * Returns true if the file was modified (new deps were added).
 */
export function injectOrmDeps(appDir: string, ormName: string, database: string): boolean {
    const pkgPath = path.join(appDir, "package.json");
    if (!fs.existsSync(pkgPath)) return false;

    let pkg: Record<string, unknown>;
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
    } catch {
        return false;
    }

    const adapter = getOrmAdapter(ormName, database);
    const runtimeDeps = adapter.getDependencies();
    const devDeps = adapter.getDevDependencies();

    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const dev = (pkg.devDependencies ?? {}) as Record<string, string>;

    let changed = false;
    for (const [name, version] of Object.entries(runtimeDeps)) {
        if (!deps[name]) {
            deps[name] = version;
            changed = true;
        }
    }
    for (const [name, version] of Object.entries(devDeps)) {
        if (!dev[name]) {
            dev[name] = version;
            changed = true;
        }
    }

    if (!changed) return false;

    pkg.dependencies = deps;
    pkg.devDependencies = dev;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    return true;
}
