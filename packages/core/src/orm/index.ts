import type { ModelDefinition } from "../types";

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
}

// ─────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────

export interface OrmRegistryEntry {
    name: string;
    label: string;
    create(): OrmAdapter;
}

/** Import lazily to avoid circular deps */
function loadPrisma(): OrmAdapter {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return new (require("./prisma").PrismaAdapter)();
}

function loadDrizzle(): OrmAdapter {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return new (require("./drizzle").DrizzleAdapter)();
}

export const ormRegistry: OrmRegistryEntry[] = [
    { name: "drizzle", label: "Drizzle ORM (SQLite)", create: loadDrizzle },
    { name: "prisma", label: "Prisma (SQLite)", create: loadPrisma },
];

/**
 * Finds an ORM adapter by name. Throws if not found.
 */
export function getOrmAdapter(name: string): OrmAdapter {
    const entry = ormRegistry.find((o) => o.name === name);
    if (!entry) {
        throw new Error(`Unknown ORM: "${name}". Available: ${ormRegistry.map((o) => o.name).join(", ")}`);
    }
    return entry.create();
}
