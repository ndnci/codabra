import type { ModelDefinition } from "../types";
import type { DatabaseDialectEntry } from "./dialects";
import { sqlite, postgresql, mysql } from "./dialects";
import { DrizzleAdapter } from "./drizzle";
import { PrismaAdapter } from "./prisma";

export type { DatabaseDialectEntry };

// ─────────────────────────────────────────────
// ORM Adapter – Strategy Pattern
// ─────────────────────────────────────────────

/**
 * Every ORM integration must implement this interface.
 * The Compiler and parsers use it to generate ORM-specific code
 * without knowing anything about the underlying ORM.
 *
 * To add a new ORM:
 *  1. Create packages/core/src/orm/<name>/index.ts implementing OrmAdapter
 *  2. Add it to the ormRegistry below
 */
export interface OrmAdapter {
    readonly name: string;
    readonly label: string;

    // ── File paths (relative to appDir) ──────────────────────────────────────

    /** e.g. "prisma/schema.prisma" or "drizzle/schema.ts" */
    getSchemaFilePath(): string;
    /** e.g. "src/lib/prisma.ts" or "src/lib/db.ts" */
    getClientFilePath(): string;

    // ── File content generation ───────────────────────────────────────────────

    /** Full content of the ORM schema file */
    generateSchemaFile(models: ModelDefinition[]): string;
    /** Full content of the ORM client singleton file */
    generateClientFile(): string;

    // ── Import lines ──────────────────────────────────────────────────────────

    /**
     * Import lines to inject at the top of generated API route files.
     * These are relative to src/app/[segment]/route.ts
     */
    getRouteImports(modelName: string): string[];

    /**
     * Import lines to inject at the top of generated function files.
     * These are relative to src/lib/functions/<Name>.ts
     */
    getFunctionImports(): string[];

    // ── Route-level query generators ─────────────────────────────────────────
    // modelName: PascalCase e.g. "User"

    /** Full expression: db query returning array */
    routeFindMany(modelName: string): string;
    /** Full expression: db query returning single record by id */
    routeFindUnique(modelName: string): string;
    /** Full expression: db insert returning created record */
    routeCreate(modelName: string, dataExpr: string): string;
    /** Full expression: db update by id returning updated record */
    routeUpdate(modelName: string, whereExpr: string, dataExpr: string): string;
    /** Full expression: db delete by id */
    routeDelete(modelName: string, whereExpr: string): string;
    /** Full expression: load resource for voter check (findUnique by id) */
    routeLoadResource(modelName: string): string;

    /**
     * Fallback typecast expression for unknown body in create (no body fields declared).
     * e.g. "body as Parameters<typeof prisma.user.create>[0]['data']"
     */
    getCreateBodyTypecast(modelName: string): string;
    /**
     * Fallback typecast expression for unknown body in update.
     * e.g. "body as Parameters<typeof prisma.user.update>[0]['data']"
     */
    getUpdateBodyTypecast(modelName: string): string;

    // ── Function-step query generators ───────────────────────────────────────
    // Used by FunctionParser for declarative function steps

    fnCreate(modelName: string, dataExpr: string): string;
    fnUpdate(modelName: string, whereExpr: string, dataExpr: string): string;
    fnDelete(modelName: string, whereExpr: string): string;
    fnFindMany(modelName: string, whereExpr?: string): string;

    // ── Dependency information ─────────────────────────────────────────────

    /** Runtime npm dependencies this ORM needs */
    getDependencies(): Record<string, string>;
    /** Dev npm dependencies this ORM needs */
    getDevDependencies(): Record<string, string>;

    // ── Database lifecycle ────────────────────────────────────────────────

    /** Path to the ORM config file relative to appDir (e.g. "drizzle.config.ts"), or null if not needed */
    getOrmConfigFilePath(): string | null;
    /** Content of the ORM config file, or null if no separate config file is needed */
    generateOrmConfigFile(): string | null;
    /** Shell command to push the schema directly to the DB (safe for dev). Runs in appDir. */
    getPushCommand(): string;
    /** Shell command to generate versioned migration files. Runs in appDir. */
    getMigrateGenerateCommand(name?: string): string;
    /** Shell command to apply pending migration files. Runs in appDir. */
    getMigrateApplyCommand(): string;
    /** Whether this adapter+database requires DATABASE_URL to be set before pushing */
    requiresDatabaseUrl(): boolean;
    /** Content for .env.local — DATABASE_URL with a working default (matches Docker dev config) */
    getEnvTemplate(projectName: string): string;
}

// ─────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────

export interface OrmRegistryEntry {
    name: string;
    label: string;
    supportedDatabases: DatabaseDialectEntry[];
    defaultDatabase: string;
    create(database: string): OrmAdapter;
}

export const ormRegistry: OrmRegistryEntry[] = [
    {
        name: "drizzle",
        label: "Drizzle ORM",
        supportedDatabases: [sqlite, postgresql, mysql],
        defaultDatabase: "sqlite",
        create: (database) => new DrizzleAdapter(database),
    },
    {
        name: "prisma",
        label: "Prisma",
        supportedDatabases: [sqlite, postgresql, mysql],
        defaultDatabase: "sqlite",
        create: (database) => new PrismaAdapter(database),
    },
];

/**
 * Finds an ORM adapter by name and database. Throws if not found.
 */
export function getOrmAdapter(name: string, database: string): OrmAdapter {
    const entry = ormRegistry.find((o) => o.name === name);
    if (!entry) {
        throw new Error(`Unknown ORM: "${name}". Available: ${ormRegistry.map((o) => o.name).join(", ")}`);
    }
    return entry.create(database);
}
