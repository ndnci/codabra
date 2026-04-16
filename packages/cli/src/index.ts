import { Command } from "commander";
import { devCommand } from "./commands/dev";
import { buildCommand } from "./commands/build";
import { generateCommand } from "./commands/generate";
import { validateCommand } from "./commands/validate";
import { addProviderCommand } from "./commands/add-provider";
import { dbCommand } from "./commands/db";

const program = new Command();

program.name("codabra").description("Configuration-driven application generator").version("0.1.0");

// ── codabra generate ──────────────────────────
program
    .command("generate")
    .alias("g")
    .description("Generate application files from your config")
    .option("-p, --provider <name>", "Only generate for this provider (omit for all)")
    .option("-c, --config <path>", "Path to the config directory")
    .option("-a, --app-dir <path>", "Path to the target application directory")
    .action(async (opts) => {
        const ok = await generateCommand({
            providerFilter: opts.provider as string | undefined,
            config: opts.config as string | undefined,
            appDir: opts.appDir as string | undefined,
        });
        process.exit(ok ? 0 : 1);
    });

// ── codabra validate ─────────────────────────
program
    .command("validate")
    .alias("v")
    .description("Validate your config files without generating")
    .option("-c, --config <path>", "Path to the config directory")
    .action(async (opts) => {
        const ok = await validateCommand({
            config: opts.config as string | undefined,
        });
        process.exit(ok ? 0 : 1);
    });

// ── codabra dev ───────────────────────────────
program
    .command("dev")
    .description("Generate files and start the development server")
    .option("-p, --provider <name>", "Provider to start (defaults to first in codabra.json)")
    .option("-c, --config <path>", "Path to the config directory")
    .option("-a, --app-dir <path>", "Path to the target application directory")
    .option("--port <port>", "Port for the dev server", "3000")
    .action(async (opts) => {
        await devCommand({
            providerFilter: opts.provider as string | undefined,
            config: opts.config as string | undefined,
            appDir: opts.appDir as string | undefined,
            port: opts.port as string,
        });
    });

// ── codabra build ─────────────────────────────
program
    .command("build")
    .description("Generate files and run the production build")
    .option("-p, --provider <name>", "Provider to build (defaults to first in codabra.json)")
    .option("-c, --config <path>", "Path to the config directory")
    .option("-a, --app-dir <path>", "Path to the target application directory")
    .action(async (opts) => {
        await buildCommand({
            providerFilter: opts.provider as string | undefined,
            config: opts.config as string | undefined,
            appDir: opts.appDir as string | undefined,
        });
    });

// ── codabra upgrade ───────────────────────────
program
    .command("upgrade")
    .description("Upgrade @ndnci/codabra and regenerate application files")
    .option("-v, --version <version>", "Specific version to upgrade to")
    .action(async (opts) => {
        const { upgradeCommand } = await import("./commands/upgrade.js");
        const ok = await upgradeCommand({ version: opts.version as string | undefined });
        process.exit(ok ? 0 : 1);
    });

// ── codabra add-provider ──────────────────────
program
    .command("add-provider")
    .description("Add a new provider to an existing Codabra project")
    .action(async () => {
        await addProviderCommand().catch((err) => {
            console.error(err);
            process.exit(1);
        });
    });

// ── codabra db ────────────────────────────────
const dbProgram = new Command("db").description("Database lifecycle commands (push, generate, migrate)");

dbProgram
    .command("push")
    .description("Push the schema directly to the database (recommended for dev)")
    .option("-p, --provider <name>", "Only run for this provider")
    .action(async (opts) => {
        const ok = await dbCommand({ action: "push", providerFilter: opts.provider as string | undefined });
        process.exit(ok ? 0 : 1);
    });

dbProgram
    .command("generate")
    .description("Generate versioned migration files")
    .option("-p, --provider <name>", "Only run for this provider")
    .option("-n, --name <name>", "Migration name", "migration")
    .action(async (opts) => {
        const ok = await dbCommand({
            action: "generate",
            providerFilter: opts.provider as string | undefined,
            migrationName: opts.name as string | undefined,
        });
        process.exit(ok ? 0 : 1);
    });

dbProgram
    .command("migrate")
    .description("Apply pending migration files to the database")
    .option("-p, --provider <name>", "Only run for this provider")
    .action(async (opts) => {
        const ok = await dbCommand({ action: "migrate", providerFilter: opts.provider as string | undefined });
        process.exit(ok ? 0 : 1);
    });

program.addCommand(dbProgram);

// ── codabra create ────────────────────────────
program
    .command("create [name]")
    .description("Scaffold a new Codabra project")
    .action(async (name?: string) => {
        const { main } = await import("./create/index.js");
        await main(name).catch((err) => {
            console.error(err);
            process.exit(1);
        });
    });

program.parse(process.argv);
