import { JSONLoader, buildDynamicRouteSchema, buildDynamicModelSchema, buildDynamicViewSchema } from "@codabra/core";
import { getProvider } from "@codabra/providers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const bundledSchemasDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../schemas");
import ora from "ora";
import { findConfigDir, findAppDir, logSuccess, logError, logWarn, logInfo } from "../utils";

export interface GenerateOptions {
    provider?: string;
    orm?: string;
    database?: string;
    config?: string;
    appDir?: string;
}

/** Reads codabra.json from the project root (cwd) if it exists */
function readCodabraJson(cwd: string): { provider?: string; orm?: string; database?: string } {
    const filePath = path.join(cwd, "codabra.json");
    if (!fs.existsSync(filePath)) return {};
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return {
            provider: typeof parsed.provider === "string" ? parsed.provider : undefined,
            orm: typeof parsed.orm === "string" ? parsed.orm : undefined,
            database: typeof parsed.database === "string" ? parsed.database : undefined,
        };
    } catch {
        return {};
    }
}

/**
 * Writes .codabra/schemas/ with model-name-aware schemas, then patches
 * .vscode/settings.json so VS Code picks them up for autocomplete.
 */
function writeDynamicSchemas(cwd: string, models: import("@codabra/core").ModelDefinition[]): void {
    const dynamicDir = path.join(cwd, ".codabra", "schemas");
    fs.mkdirSync(dynamicDir, { recursive: true });
    fs.writeFileSync(
        path.join(dynamicDir, "route.schema.json"),
        JSON.stringify(buildDynamicRouteSchema(models), null, 2) + "\n",
    );
    fs.writeFileSync(
        path.join(dynamicDir, "model.schema.json"),
        JSON.stringify(buildDynamicModelSchema(models), null, 2) + "\n",
    );
    fs.writeFileSync(
        path.join(dynamicDir, "view.schema.json"),
        JSON.stringify(buildDynamicViewSchema(models), null, 2) + "\n",
    );
    fs.copyFileSync(
        path.join(bundledSchemasDir, "codabra.schema.json"),
        path.join(dynamicDir, "codabra.schema.json"),
    );
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
    const codabraConfig = readCodabraJson(cwd);
    const providerName = opts.provider ?? codabraConfig.provider ?? "nextjs";
    const ormName = opts.orm ?? codabraConfig.orm ?? "drizzle";
    const database = opts.database ?? codabraConfig.database ?? "sqlite";

    // ── Locate config dir ─────────────────────────
    const configDir = opts.config ?? findConfigDir();
    if (!configDir) {
        logError("Could not find a /config directory. Run this command from your project root.");
        return false;
    }
    logInfo(`Config directory: ${configDir}`);

    // ── Locate app dir ────────────────────────────
    const appDir = opts.appDir ?? findAppDir(process.cwd(), providerName);
    logInfo(`Target app directory: ${appDir}`);
    logInfo(`ORM: ${ormName}`);
    logInfo(`Database: ${database}`);

    // ── Load config ───────────────────────────────
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

    // ── Generate via provider ─────────────────────
    let provider;
    try {
        provider = getProvider(providerName).create();
    } catch (err) {
        logError(String(err));
        return false;
    }

    const spinner = ora("Generating application files…").start();
    const result = await provider.generate(config, appDir, { orm: ormName, database });

    if (result.errors.length > 0) {
        spinner.warn("Generation completed with errors:");
        result.errors.forEach((e) => logError(e));
    } else {
        spinner.succeed("Generation complete!");
    }

    result.warnings.forEach((w) => logWarn(w));
    result.filesWritten.forEach((f) => logSuccess(`  ${f}`));

    // Write model-aware schemas for VS Code autocomplete.
    writeDynamicSchemas(cwd, config.models);
    updateVscodeSchemaSettings(cwd);

    return result.errors.length === 0;
}
