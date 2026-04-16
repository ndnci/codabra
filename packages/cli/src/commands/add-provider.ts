import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";
import { select, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { providerRegistry } from "@codabra/providers";
import { ormRegistry, getOrmAdapter } from "@codabra/core";
import { findConfigDir, logError, logInfo, logSuccess, logWarn } from "../utils";
import { readProviderConfigs, generateCommand, type ProviderConfig } from "./generate";

function writeCodabraJson(cwd: string, providers: ProviderConfig[]): void {
    const filePath = path.join(cwd, "codabra.json");
    const existing = fs.existsSync(filePath)
        ? (JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>)
        : {};
    existing.providers = providers;
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
}

function injectOrmDeps(appDir: string, ormName: string, database: string): boolean {
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

function runInstall(projectRoot: string): Promise<boolean> {
    return new Promise((resolve) => {
        const child = spawn("pnpm", ["install"], { cwd: projectRoot, stdio: "inherit" });
        child.on("close", (code) => resolve(code === 0));
    });
}

export async function addProviderCommand(): Promise<void> {
    const cwd = process.cwd();

    const configDir = findConfigDir(cwd);
    if (!configDir) {
        logError("Could not find a /config directory. Run this command from your project root.");
        process.exit(1);
    }
    const projectRoot = path.dirname(configDir);

    // Read current providers
    const currentConfigs = readProviderConfigs(cwd);
    const currentProviderNames = new Set(currentConfigs.map((c) => c.provider));

    // Filter out already-configured providers
    const availableProviders = providerRegistry.filter((p) => !currentProviderNames.has(p.name));

    if (availableProviders.length === 0) {
        logWarn("All available providers are already configured in codabra.json.");
        logInfo(`Configured: ${[...currentProviderNames].join(", ")}`);
        process.exit(0);
    }

    if (currentConfigs.length > 0) {
        console.log("");
        console.log(chalk.dim(`Currently configured: ${[...currentProviderNames].join(", ")}`));
        console.log("");
    }

    // Choose provider
    const providerName = await select({
        message: "Choose a provider to add:",
        choices: availableProviders.map((p) => ({ name: p.label, value: p.name })),
    });

    const provider = providerRegistry.find((p) => p.name === providerName)!.create();

    // Choose ORM
    const ormChoices = ormRegistry.map((o, idx) => ({
        name: idx === 0 ? `${o.label} (recommended)` : o.label,
        value: o.name,
    }));
    const ormName = await select({
        message: "Choose an ORM:",
        choices: ormChoices,
        default: ormRegistry[0]?.name,
    });

    // Choose database
    const selectedOrm = ormRegistry.find((o) => o.name === ormName)!;
    const dbChoices = selectedOrm.supportedDatabases.map((d, idx) => ({
        name: idx === 0 ? `${d.label} (default)` : d.label,
        value: d.name,
    }));
    const database = await select({
        message: "Choose a database:",
        choices: dbChoices,
        default: selectedOrm.defaultDatabase,
    });

    // Confirm
    console.log("");
    console.log(chalk.bold("Summary:"));
    console.log(`  Provider: ${chalk.cyan(provider.label)}`);
    console.log(`  ORM:      ${chalk.cyan(selectedOrm.label)}`);
    console.log(
        `  Database: ${chalk.cyan(selectedOrm.supportedDatabases.find((d) => d.name === database)?.label ?? database)}`,
    );
    console.log("");

    const confirmed = await confirm({ message: "Add this provider?", default: true });
    if (!confirmed) {
        console.log(chalk.yellow("Aborted."));
        process.exit(0);
    }

    // ── Update codabra.json ────────────────────
    const newConfig: ProviderConfig = { provider: providerName, orm: ormName, database };
    const updatedConfigs = [...currentConfigs, newConfig];
    writeCodabraJson(cwd, updatedConfigs);
    logSuccess(`Updated codabra.json with provider "${providerName}"`);

    // ── Initialise the app ─────────────────────
    const appDir = path.join(projectRoot, "apps", providerName);
    fs.mkdirSync(appDir, { recursive: true });

    console.log("");
    console.log(chalk.bold(`Initialising ${provider.label} app…`));
    console.log(chalk.dim(`  Running: ${provider.initCommand}`));
    console.log("");

    try {
        execSync(provider.initCommand, { cwd: appDir, stdio: "inherit" });
    } catch {
        logWarn("App init command failed. You may need to run it manually:");
        console.log(chalk.dim(`  cd ${path.relative(cwd, appDir)}`));
        console.log(chalk.dim(`  ${provider.initCommand}`));
    }

    // ── Inject ORM deps ────────────────────────
    const depsAdded = injectOrmDeps(appDir, ormName, database);
    if (depsAdded) {
        logInfo("ORM dependencies injected into app package.json");
    }

    // ── pnpm install ───────────────────────────
    const installSpinner = ora("Running pnpm install…").start();
    const installOk = await runInstall(projectRoot);
    if (installOk) {
        installSpinner.succeed("Dependencies installed");
    } else {
        installSpinner.warn("pnpm install failed — run it manually from your project root");
    }

    // ── Generate files for new provider ───────
    const generateSpinner = ora(`Generating files for ${providerName}…`).start();
    generateSpinner.stop();
    const generateOk = await generateCommand({ providerFilter: providerName });
    if (!generateOk) {
        logWarn(`Generation had errors. Run "codabra generate --provider ${providerName}" after fixing them.`);
    }

    // ── Done ───────────────────────────────────
    console.log("");
    logSuccess(`Provider "${provider.label}" added successfully!`);
    console.log("");
    console.log(`Start the ${provider.label} dev server:`);
    console.log(`  ${chalk.cyan(`codabra dev --provider ${providerName}`)}`);
    console.log("");
}
