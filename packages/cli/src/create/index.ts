import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// dist/create/index.js → ../../schemas/
const bundledSchemasDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../schemas");
import { select, input, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { providerRegistry } from "@codabra/providers";
import { ormRegistry } from "@codabra/core";
import { generateDockerConfig, ensureDockerIfNeeded } from "../docker";
import { injectOrmDeps } from "../utils";


declare const __CLI_VERSION__: string;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function writeInitialSchemas(projectDir: string): void {
    const dest = path.join(projectDir, ".codabra", "schemas");
    fs.mkdirSync(dest, { recursive: true });
    for (const file of ["codabra.schema.json", "model.schema.json", "route.schema.json", "view.schema.json"]) {
        const schema = JSON.parse(fs.readFileSync(path.join(bundledSchemasDir, file), "utf-8"));
        fs.writeFileSync(path.join(dest, file), JSON.stringify(schema));
    }
}

function cliDistTag(): string {
    const match = __CLI_VERSION__.match(/-(alpha|beta|rc)\.\d+$/);
    return match ? match[1] : "latest";
}

function run(cmd: string, cwd: string): void {
    execSync(cmd, { cwd, stdio: "inherit" });
}

function writeFile(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
}

function banner(): void {
    console.log("");
    console.log(chalk.bold.magenta("  ██████╗ ██████╗ ██████╗  █████╗ ██████╗ ██████╗  █████╗ "));
    console.log(chalk.bold.magenta(" ██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗"));
    console.log(chalk.bold.magenta(" ██║     ██║   ██║██║  ██║███████║██████╔╝██████╔╝███████║"));
    console.log(chalk.bold.magenta(" ██║     ██║   ██║██║  ██║██╔══██║██╔══██╗██╔══██╗██╔══██║"));
    console.log(chalk.bold.magenta(" ╚██████╗╚██████╔╝██████╔╝██║  ██║██████╔╝██║  ██║██║  ██║"));
    console.log(chalk.bold.magenta("  ╚═════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝"));
    console.log("");
    console.log(chalk.dim("  Configuration-driven application generator"));
    console.log("");
}

// ─────────────────────────────────────────────
// Monorepo scaffold
// ─────────────────────────────────────────────

function createRootPackageJson(projectDir: string, projectName: string): void {
    writeFile(
        path.join(projectDir, "package.json"),
        JSON.stringify(
            {
                name: projectName,
                version: "0.1.0",
                private: true,
                scripts: {
                    build: "turbo run build",
                    dev: "codabra dev",
                    generate: "codabra generate",
                    validate: "codabra validate",
                },
                devDependencies: {
                    turbo: "^2.0.0",
                    "@ndnci/codabra": cliDistTag(),
                },
                packageManager: "pnpm@9.0.0",
            },
            null,
            2,
        ) + "\n",
    );
}

function createTurboJson(projectDir: string): void {
    writeFile(
        path.join(projectDir, "turbo.json"),
        JSON.stringify(
            {
                $schema: "https://turbo.build/schema.json",
                tasks: {
                    build: { dependsOn: ["^build"], outputs: [".next/**", "dist/**"] },
                    dev: { persistent: true, cache: false },
                },
            },
            null,
            2,
        ) + "\n",
    );
}

function createPnpmWorkspace(projectDir: string): void {
    writeFile(path.join(projectDir, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n');
}

function createGitIgnore(projectDir: string): void {
    writeFile(
        path.join(projectDir, ".gitignore"),
        "node_modules/\n.next/\n.turbo/\ndist/\n*.log\n.env\n.env.local\n.codabra/\n",
    );
}

function createExampleConfig(projectDir: string): void {
    const schemaBase = "../../.codabra/schemas";

    // models/User.json
    writeFile(
        path.join(projectDir, "config", "models", "User.json"),
        JSON.stringify(
            {
                $schema: `${schemaBase}/model.schema.json`,
                name: "User",
                fields: {
                    email: "string",
                    name: "string",
                    createdAt: "date_now",
                },
            },
            null,
            2,
        ) + "\n",
    );

    // routes/Users.json
    writeFile(
        path.join(projectDir, "config", "routes", "Users.json"),
        JSON.stringify(
            {
                $schema: `${schemaBase}/route.schema.json`,
                routes: [
                    { method: "GET", path: "/api/users", response: "User[]" },
                    { method: "POST", path: "/api/users", body: { email: "string", name: "string" }, response: "User" },
                    { method: "GET", path: "/api/users/:id", params: { id: "uuid" }, response: "User" },
                    { method: "DELETE", path: "/api/users/:id", params: { id: "uuid" } },
                ],
            },
            null,
            2,
        ) + "\n",
    );

    // views/LoginPage.json
    writeFile(
        path.join(projectDir, "config", "views", "LoginPage.json"),
        JSON.stringify(
            {
                $schema: `${schemaBase}/view.schema.json`,
                name: "LoginPage",
                path: "/login",
                root: {
                    type: "form",
                    fields: [
                        { type: "heading", label: "Sign in to your account" },
                        { type: "email", id: "email", label: "Email" },
                        { type: "password", id: "password", label: "Password" },
                        { type: "button", label: "Login" },
                    ],
                },
            },
            null,
            2,
        ) + "\n",
    );

    // README snippet
    writeFile(
        path.join(projectDir, "config", "README.md"),
        `# Config\n\nPlace your Codabra configuration files here.\n\n## Structure\n\n\`\`\`\nconfig/\n├── models/    ← Data models\n├── routes/    ← API & page routes\n├── views/     ← Declarative UI\n├── functions/ ← Reusable logic\n├── events/    ← Lifecycle hooks\n└── voters/    ← Authorization rules\n\`\`\`\n`,
    );
}

function createCodabraJson(projectDir: string, providerName: string, ormName: string, database: string): void {
    writeFile(
        path.join(projectDir, "codabra.json"),
        JSON.stringify(
            {
                $schema: "./.codabra/schemas/codabra.schema.json",
                providers: [{ provider: providerName, orm: ormName, database }],
            },
            null,
            2,
        ) + "\n",
    );
}


function createVscodeSettings(projectDir: string): void {
    const schemaBase = "./.codabra/schemas";
    writeFile(
        path.join(projectDir, ".vscode", "settings.json"),
        JSON.stringify(
            {
                "json.schemas": [
                    {
                        fileMatch: ["config/models/*.json"],
                        url: `${schemaBase}/model.schema.json`,
                    },
                    {
                        fileMatch: ["config/routes/*.json"],
                        url: `${schemaBase}/route.schema.json`,
                    },
                    {
                        fileMatch: ["config/views/*.json"],
                        url: `${schemaBase}/view.schema.json`,
                    },
                    {
                        fileMatch: ["codabra.json"],
                        url: `${schemaBase}/codabra.schema.json`,
                    },
                ],
            },
            null,
            2,
        ) + "\n",
    );
}

// ─────────────────────────────────────────────
// Main create flow
// ─────────────────────────────────────────────

export async function main(projectName?: string): Promise<void> {
    banner();

    // Get project name from argument or prompt
    if (!projectName) {
        projectName = await input({
            message: "Project name:",
            default: "my-app",
            validate: (v) => /^[a-z0-9-_]+$/i.test(v) || "Use only letters, numbers, hyphens, underscores",
        });
    }

    // Choose provider
    const providerChoices = providerRegistry.map((p) => ({
        name: p.label,
        value: p.name,
    }));

    const providerName = await select({
        message: "Choose a provider:",
        choices: providerChoices,
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

    // Check Docker availability if the chosen database requires it
    await ensureDockerIfNeeded(database, confirm);

    // Confirm
    console.log("");
    console.log(chalk.bold("Project summary:"));
    console.log(`  Name:     ${chalk.cyan(projectName)}`);
    console.log(`  Provider: ${chalk.cyan(provider.label)}`);
    console.log(`  ORM:      ${chalk.cyan(selectedOrm.label)}`);
    console.log(
        `  Database: ${chalk.cyan(selectedOrm.supportedDatabases.find((d) => d.name === database)?.label ?? database)}`,
    );
    console.log("");

    const confirmed = await confirm({ message: "Create project?", default: true });
    if (!confirmed) {
        console.log(chalk.yellow("Aborted."));
        process.exit(0);
    }

    // ── Create directory ───────────────────────
    const projectDir = path.resolve(process.cwd(), projectName);
    if (fs.existsSync(projectDir)) {
        console.log(chalk.red(`Directory "${projectName}" already exists. Remove it or choose a different name.`));
        process.exit(1);
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // ── Scaffold monorepo root ─────────────────
    const spinner = ora("Scaffolding monorepo structure…").start();
    createRootPackageJson(projectDir, projectName);
    createTurboJson(projectDir);
    createPnpmWorkspace(projectDir);
    createGitIgnore(projectDir);
    writeInitialSchemas(projectDir);
    createCodabraJson(projectDir, providerName, ormName, database);
    createVscodeSettings(projectDir);
    generateDockerConfig(projectDir, projectName, [{ provider: providerName, orm: ormName, database }]);
    spinner.succeed("Monorepo structure created");

    // ── Create example config ──────────────────
    const configSpinner = ora("Creating example config files…").start();
    createExampleConfig(projectDir);
    configSpinner.succeed("Example config created in /config");

    // ── Init the app via provider ──────────────
    const appDir = path.join(projectDir, "apps", providerName);
    fs.mkdirSync(appDir, { recursive: true });

    console.log("");
    console.log(chalk.bold(`Initialising ${provider.label} app…`));
    console.log(chalk.dim(`  Running: ${provider.initCommand}`));
    console.log("");

    try {
        run(provider.initCommand, appDir);
    } catch {
        console.log(chalk.yellow("\nWarning: app init command failed. You may need to run it manually:"));
        console.log(chalk.dim(`  cd ${path.join(projectName, "apps", providerName)}`));
        console.log(chalk.dim(`  ${provider.initCommand}`));
    }

    // ── Inject ORM dependencies ────────────────
    injectOrmDeps(appDir, ormName, database);

    // ── Done ───────────────────────────────────
    const needsDocker = database !== "sqlite";

    console.log("");
    console.log(chalk.green.bold("✔ Project created!"));
    console.log("");
    console.log("Next steps:");
    console.log(`  ${chalk.cyan(`cd ${projectName}`)}`);
    console.log(`  ${chalk.cyan("pnpm install")}`);
    if (needsDocker) {
        console.log(`  ${chalk.cyan("make dev-up")}              ${chalk.dim(`# start ${database} container`)}`);
    }
    console.log(
        `  ${chalk.cyan("pnpm codabra generate")}   ${chalk.dim(
            needsDocker
                ? "# generate app + push schema (needs DB running)"
                : "# generate app + push schema to SQLite",
        )}`,
    );
    console.log(`  ${chalk.cyan("pnpm codabra dev")}         ${chalk.dim("# start dev server (also starts DB if needed)")}`);
    console.log("");
    console.log(`Edit config files in ${chalk.bold("./config")} to define your application.`);
    console.log("");
}
