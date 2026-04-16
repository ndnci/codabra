import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getOrmAdapter } from "@codabra/core";
import { findConfigDir, findAppDir, logError, logInfo, logSuccess, logWarn } from "../utils";
import { readProviderConfigs } from "./generate";

export interface DbActionOptions {
    appDir: string;
    ormName: string;
    database: string;
    projectName?: string;
    migrationName?: string;
}

/**
 * Resolves DATABASE_URL from the environment or from an .env.local file in appDir.
 * Returns the URL string or null if not found.
 */
function resolveDatabaseUrl(appDir: string): string | null {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    const envFile = path.join(appDir, ".env.local");
    if (!fs.existsSync(envFile)) return null;

    const content = fs.readFileSync(envFile, "utf-8");
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    return match ? match[1].trim() : null;
}

/**
 * Runs a database lifecycle action (push, migrate-generate, migrate-apply) for a given ORM+database.
 * Shared between the `codabra db` command and `codabra generate` auto-push.
 */
export async function runDbAction(
    action: "push" | "migrate-generate" | "migrate-apply",
    opts: DbActionOptions,
): Promise<boolean> {
    const adapter = getOrmAdapter(opts.ormName, opts.database);

    if (adapter.requiresDatabaseUrl()) {
        const url = resolveDatabaseUrl(opts.appDir);
        if (!url) {
            logWarn(`DATABASE_URL is not set. Skipping schema push.`);
            logInfo(`Set DATABASE_URL in ${path.join(opts.appDir, ".env.local")} and run 'codabra db push'.`);
            return false;
        }
        // Expose it to the child process env so drizzle-kit/prisma picks it up
        process.env.DATABASE_URL = url;
    }

    let command: string;
    switch (action) {
        case "push":
            command = adapter.getPushCommand();
            break;
        case "migrate-generate":
            command = adapter.getMigrateGenerateCommand(opts.migrationName);
            break;
        case "migrate-apply":
            command = adapter.getMigrateApplyCommand();
            break;
    }

    try {
        execSync(command, { cwd: opts.appDir, stdio: "inherit" });
        return true;
    } catch {
        logError(`Command failed: ${command}`);
        return false;
    }
}

export interface DbCommandOptions {
    action: "push" | "generate" | "migrate";
    providerFilter?: string;
    migrationName?: string;
}

/** Entry point for `codabra db <action>` */
export async function dbCommand(opts: DbCommandOptions): Promise<boolean> {
    const cwd = process.cwd();

    const configDir = findConfigDir(cwd);
    if (!configDir) {
        logError("Could not find a /config directory. Run this command from your project root.");
        return false;
    }
    const projectRoot = path.dirname(configDir);
    const projectName = path.basename(projectRoot);

    let providerConfigs = readProviderConfigs(cwd);
    if (providerConfigs.length === 0) {
        logError("No providers configured in codabra.json.");
        return false;
    }

    if (opts.providerFilter) {
        providerConfigs = providerConfigs.filter((c) => c.provider === opts.providerFilter);
        if (providerConfigs.length === 0) {
            logError(`Provider "${opts.providerFilter}" not found in codabra.json.`);
            return false;
        }
    }

    const actionMap: Record<string, "push" | "migrate-generate" | "migrate-apply"> = {
        push: "push",
        generate: "migrate-generate",
        migrate: "migrate-apply",
    };
    const internalAction = actionMap[opts.action];

    let allOk = true;
    for (const cfg of providerConfigs) {
        const appDir = findAppDir(cwd, cfg.provider);
        logInfo(`Running db ${opts.action} for ${cfg.provider} (${cfg.orm} + ${cfg.database})…`);

        const ok = await runDbAction(internalAction, {
            appDir,
            ormName: cfg.orm,
            database: cfg.database,
            projectName,
            migrationName: opts.migrationName,
        });

        if (ok) {
            logSuccess(`db ${opts.action} completed for ${cfg.provider}`);
        } else {
            allOk = false;
        }
    }

    return allOk;
}
