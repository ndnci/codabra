import { Command } from "commander";
import { devCommand } from "./commands/dev";
import { buildCommand } from "./commands/build";
import { generateCommand } from "./commands/generate";
import { validateCommand } from "./commands/validate";

const program = new Command();

program.name("codabra").description("Configuration-driven application generator").version("0.1.0");

// ── codabra generate ──────────────────────────
program
    .command("generate")
    .alias("g")
    .description("Generate application files from your config")
    .option("-p, --provider <name>", "Provider to use (e.g. nextjs)", "nextjs")
    .option("-o, --orm <name>", "ORM to use (drizzle or prisma)")
    .option("-c, --config <path>", "Path to the config directory")
    .option("-a, --app-dir <path>", "Path to the target application directory")
    .action(async (opts) => {
        const ok = await generateCommand({
            provider: opts.provider as string,
            orm: opts.orm as string | undefined,
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
    .option("-p, --provider <name>", "Provider to use (e.g. nextjs)", "nextjs")
    .option("-c, --config <path>", "Path to the config directory")
    .option("-a, --app-dir <path>", "Path to the target application directory")
    .option("--port <port>", "Port for the dev server", "3000")
    .action(async (opts) => {
        await devCommand({
            provider: opts.provider as string,
            config: opts.config as string | undefined,
            appDir: opts.appDir as string | undefined,
            port: opts.port as string,
        });
    });

// ── codabra build ─────────────────────────────
program
    .command("build")
    .description("Generate files and run the production build")
    .option("-p, --provider <name>", "Provider to use (e.g. nextjs)", "nextjs")
    .option("-c, --config <path>", "Path to the config directory")
    .option("-a, --app-dir <path>", "Path to the target application directory")
    .action(async (opts) => {
        await buildCommand({
            provider: opts.provider as string,
            config: opts.config as string | undefined,
            appDir: opts.appDir as string | undefined,
        });
    });

program.parse(process.argv);
