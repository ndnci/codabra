import {
    JSONLoader,
    buildDynamicRouteSchema,
    buildDynamicModelSchema,
    buildDynamicViewSchema,
    getOrmAdapter,
} from "@codabra/core";
import { getProvider } from "@codabra/providers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const bundledSchemasDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../schemas");
import ora from "ora";
import { findConfigDir, findAppDir, logSuccess, logError, logWarn, logInfo } from "../utils";
import { runDbAction } from "./db";

export interface ProviderConfig {
    provider: string;
    orm: string;
    database: string;
}

export interface GenerateOptions {
    /** Only generate for this provider name (omit to generate all) */
    providerFilter?: string;
    config?: string;
    /** Override app directory (only useful when a single provider is targeted) */
    appDir?: string;
}

/** Reads the `providers` array from codabra.json */
export function readProviderConfigs(cwd: string): ProviderConfig[] {
    const filePath = path.join(cwd, "codabra.json");
    if (!fs.existsSync(filePath)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
        const providers = parsed.providers;
        if (!Array.isArray(providers)) return [];
        return providers
            .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
            .map((p) => ({
                provider: typeof p.provider === "string" ? p.provider : "nextjs",
                orm: typeof p.orm === "string" ? p.orm : "drizzle",
                database: typeof p.database === "string" ? p.database : "sqlite",
            }));
    } catch {
        return [];
    }
}

/**
 * Merges ORM runtime/dev deps into the app's package.json and runs
 * `pnpm install` from the project root if any package was added.
 */
async function syncOrmDeps(appDir: string, projectRoot: string, ormName: string, database: string): Promise<void> {
    const pkgPath = path.join(appDir, "package.json");
    if (!fs.existsSync(pkgPath)) return;

    let pkg: Record<string, unknown>;
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
    } catch {
        return;
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

    if (!changed) return;

    pkg.dependencies = deps;
    pkg.devDependencies = dev;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    logInfo(`Added ORM dependencies to ${path.relative(projectRoot, pkgPath)} — running pnpm install…`);

    await new Promise<void>((resolve) => {
        const child = spawn("pnpm", ["install"], { cwd: projectRoot, stdio: "inherit" });
        child.on("close", () => resolve());
    });
}

/**
 * Writes .codabra/schemas/ with model-name-aware schemas, then patches
 * .vscode/settings.json so VS Code picks them up for autocomplete.
 */
function writeDynamicSchemas(cwd: string, models: import("@codabra/core").ModelDefinition[]): void {
    const dynamicDir = path.join(cwd, ".codabra", "schemas");
    fs.mkdirSync(dynamicDir, { recursive: true });
    fs.writeFileSync(path.join(dynamicDir, "route.schema.json"), JSON.stringify(buildDynamicRouteSchema(models)));
    fs.writeFileSync(path.join(dynamicDir, "model.schema.json"), JSON.stringify(buildDynamicModelSchema(models)));
    fs.writeFileSync(path.join(dynamicDir, "view.schema.json"), JSON.stringify(buildDynamicViewSchema(models)));
    const codabraSchema = JSON.parse(fs.readFileSync(path.join(bundledSchemasDir, "codabra.schema.json"), "utf-8"));
    fs.writeFileSync(path.join(dynamicDir, "codabra.schema.json"), JSON.stringify(codabraSchema));
}

/**
 * Merges the Codabra json.schemas entries into .vscode/settings.json
 * without clobbering any other VS Code settings.
 */
function updateVscodeSchemaSettings(cwd: string): void {
    const vscodeDir = path.join(cwd, ".vscode");
    const settingsPath = path.join(vscodeDir, "settings.json");

    let existing: Record<string, unknown> = {};
    if (fs.existsSync(settingsPath)) {
        try {
            existing = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
        } catch {
            // If the file is malformed, start fresh rather than crashing.
        }
    }

    existing["json.schemas"] = [
        { fileMatch: ["config/models/*.json"], url: "./.codabra/schemas/model.schema.json" },
        { fileMatch: ["config/routes/*.json"], url: "./.codabra/schemas/route.schema.json" },
        { fileMatch: ["config/views/*.json"], url: "./.codabra/schemas/view.schema.json" },
        { fileMatch: ["codabra.json"], url: "./.codabra/schemas/codabra.schema.json" },
    ];

    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(existing, null, 4) + "\n", "utf-8");
}

export async function generateCommand(opts: GenerateOptions = {}): Promise<boolean> {
    const cwd = process.cwd();

    // ── Locate config dir ─────────────────────────
    const configDir = opts.config ?? findConfigDir();
    if (!configDir) {
        logError("Could not find a /config directory. Run this command from your project root.");
        return false;
    }
    const projectRoot = path.dirname(configDir);

    // ── Read provider configs from codabra.json ───
    let providerConfigs = readProviderConfigs(cwd);
    if (providerConfigs.length === 0) {
        logError("No providers configured in codabra.json. Run this command from your project root.");
        return false;
    }

    if (opts.providerFilter) {
        providerConfigs = providerConfigs.filter((c) => c.provider === opts.providerFilter);
        if (providerConfigs.length === 0) {
            logError(`Provider "${opts.providerFilter}" not found in codabra.json.`);
            return false;
        }
    }

    logInfo(`Config directory: ${configDir}`);

    // ── Load config (shared across all providers) ─
    const loader = new JSONLoader();
    let config;
    try {
        const spinner = ora("Loading config files…").start();
        config = await loader.load(configDir);
        spinner.succeed(
            `Loaded: ${config.models.length} models, ${config.routes.length} routes, ${config.views.length} views`,
        );
    } catch (err) {
        logError(`Failed to load config: ${String(err)}`);
        return false;
    }

    // ── Generate for each configured provider ─────
    let allOk = true;

    for (const cfg of providerConfigs) {
        logInfo(`\nProvider: ${cfg.provider} | ORM: ${cfg.orm} | Database: ${cfg.database}`);

        const appDir = opts.appDir ?? findAppDir(cwd, cfg.provider);
        logInfo(`Target app directory: ${appDir}`);

        let provider;
        try {
            provider = getProvider(cfg.provider).create();
        } catch (err) {
            logError(String(err));
            allOk = false;
            continue;
        }

        const spinner = ora("Generating application files…").start();
        const result = await provider.generate(config, appDir, { orm: cfg.orm, database: cfg.database });

        if (result.errors.length > 0) {
            spinner.warn("Generation completed with errors:");
            result.errors.forEach((e) => logError(e));
            allOk = false;
        } else {
            spinner.succeed("Generation complete!");
        }

        result.warnings.forEach((w) => logWarn(w));
        result.filesWritten.forEach((f) => logSuccess(`  ${f}`));

        // Ensure ORM runtime deps are present in the app's package.json
        await syncOrmDeps(appDir, projectRoot, cfg.orm, cfg.database);

        // ── ORM config file (e.g. drizzle.config.ts) ──────────────────────
        const adapter = getOrmAdapter(cfg.orm, cfg.database);
        const ormConfigPath = adapter.getOrmConfigFilePath();
        if (ormConfigPath) {
            const ormConfigContent = adapter.generateOrmConfigFile()!;
            fs.writeFileSync(path.join(appDir, ormConfigPath), ormConfigContent, "utf-8");
            logSuccess(`  ${ormConfigPath}`);
        }

        // ── .env.local (only create if missing — never overwrite user edits) ─
        const envPath = path.join(appDir, ".env.local");
        if (!fs.existsSync(envPath)) {
            const projectName = path.basename(projectRoot);
            fs.writeFileSync(envPath, adapter.getEnvTemplate(projectName), "utf-8");
            logInfo(`Created .env.local with DATABASE_URL template`);
        }

        // ── Schema push ────────────────────────────────────────────────────
        if (!adapter.requiresDatabaseUrl()) {
            // SQLite: push is safe and instant — always run automatically
            const pushSpinner = ora("Pushing schema to database…").start();
            const pushOk = await runDbAction("push", { appDir, ormName: cfg.orm, database: cfg.database });
            if (pushOk) {
                pushSpinner.succeed("Schema pushed to database");
            } else {
                pushSpinner.fail("Schema push failed — run 'codabra db push' manually");
                allOk = false;
            }
        } else {
            logWarn(`Schema generated. Run 'codabra db push' after starting your database.`);
            logWarn(`Make sure DATABASE_URL is set in ${path.relative(projectRoot, envPath)}`);
        }
    }

    // Write model-aware schemas for VS Code autocomplete.
    writeDynamicSchemas(cwd, config.models);
    updateVscodeSchemaSettings(cwd);

    return allOk;
}
