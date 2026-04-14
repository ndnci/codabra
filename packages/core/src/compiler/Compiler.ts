import * as fs from "fs";
import * as path from "path";
import type { ConfigSet } from "../types";
import { validateModels } from "../validator/ModelValidator";
import { validateRoutes } from "../validator/RouteValidator";
import { generateModelInterface } from "../parser/ModelParser";
import { groupRoutesByPath, generateNextRouteFile } from "../parser/RouteParser";
import type { RouteGenContext } from "../parser/RouteParser";
import { generateNextPage } from "../parser/ViewParser";
import { generateFunctionFile } from "../parser/FunctionParser";
import { generateVoterFile, generateAuthFile } from "../parser/VoterParser";
import type { OrmAdapter } from "../orm";
import { getOrmAdapter } from "../orm";

export interface CompilerOptions {
    /** Absolute path to the target app root (e.g. /my-project/apps/web) */
    appDir: string;
    /** Whether to throw on validation errors or just warn */
    strict?: boolean;
    /** ORM adapter to use (name string or pre-built adapter instance). */
    orm?: OrmAdapter | string;
    /** Database dialect to use (e.g. "sqlite", "postgresql", "mysql"). */
    database: string;
}

export interface CompilerResult {
    filesWritten: string[];
    warnings: string[];
    errors: string[];
}

function writeFile(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Compiles a ConfigSet into a Next.js App Router application.
 *
 * Generated output layout inside `appDir`:
 *   src/
 *     types/                  ← TypeScript interfaces
 *     lib/
 *       db.ts / prisma.ts     ← ORM client singleton (depends on chosen ORM)
 *       auth.ts               ← Auth utility (when needed)
 *       functions/<Name>.ts   ← Generated function files
 *       voters/<Name>.ts      ← Generated voter files
 *     app/
 *       api/...               ← API route handlers
 *       .../page.tsx          ← Page components
 *   drizzle/ or prisma/
 *     schema.ts / schema.prisma  ← ORM schema
 */
export class Compiler {
    private opts: Required<Omit<CompilerOptions, "orm">> & { orm: OrmAdapter };

    constructor(opts: CompilerOptions) {
        let orm: OrmAdapter;
        if (!opts.orm) {
            orm = getOrmAdapter("drizzle", opts.database);
        } else if (typeof opts.orm === "string") {
            orm = getOrmAdapter(opts.orm, opts.database);
        } else {
            orm = opts.orm;
        }
        this.opts = { strict: false, ...opts, orm };
    }

    compile(config: ConfigSet): CompilerResult {
        const result: CompilerResult = { filesWritten: [], warnings: [], errors: [] };
        const { orm } = this.opts;

        // ── Validate ─────────────────────────────────
        const modelErrors = validateModels(config.models);
        const routeErrors = validateRoutes(config.routes);
        const allErrors = [...modelErrors, ...routeErrors];

        for (const err of allErrors) {
            const msg =
                "model" in err
                    ? `[model:${err.model}${err.field ? `.${err.field}` : ""}] ${err.message}`
                    : `[route:${(err as { route: string }).route}] ${err.message}`;
            result.errors.push(msg);
        }

        if (this.opts.strict && result.errors.length > 0) {
            return result;
        }

        // ── Models → TypeScript interfaces ───────────
        for (const model of config.models) {
            const content = generateModelInterface(model);
            const filePath = path.join(this.opts.appDir, "src", "types", `${model.name}.ts`);
            writeFile(filePath, content);
            result.filesWritten.push(filePath);
        }

        // ── Models → ORM schema + client ─────────────
        if (config.models.length > 0) {
            const schema = orm.generateSchemaFile(config.models);
            const schemaPath = path.join(this.opts.appDir, orm.getSchemaFilePath());
            writeFile(schemaPath, schema);
            result.filesWritten.push(schemaPath);

            const clientPath = path.join(this.opts.appDir, orm.getClientFilePath());
            writeFile(clientPath, orm.generateClientFile());
            result.filesWritten.push(clientPath);
        }

        // ── Functions → src/lib/functions/<Name>.ts ──
        for (const fn of config.functions) {
            const content = generateFunctionFile(fn, orm);
            const filePath = path.join(this.opts.appDir, "src", "lib", "functions", `${fn.name}.ts`);
            writeFile(filePath, content);
            result.filesWritten.push(filePath);
        }

        // ── Voters → src/lib/voters/<Name>.ts ────────
        for (const voter of config.voters) {
            const content = generateVoterFile(voter);
            const filePath = path.join(this.opts.appDir, "src", "lib", "voters", `${voter.name}.ts`);
            writeFile(filePath, content);
            result.filesWritten.push(filePath);
        }

        // ── Auth utility (if auth or voters are used) ─
        const needsAuth = config.routes.some((r) => r.auth) || config.voters.length > 0;
        if (needsAuth) {
            const authPath = path.join(this.opts.appDir, "src", "lib", "auth.ts");
            writeFile(authPath, generateAuthFile());
            result.filesWritten.push(authPath);
        }

        // ── Routes → Next.js API routes ──────────────
        const routeContext: RouteGenContext = {
            models: config.models,
            functions: config.functions,
            events: config.events,
            voters: config.voters,
            orm,
        };

        const grouped = groupRoutesByPath(config.routes);
        for (const [segment, routes] of grouped) {
            const content = generateNextRouteFile(routes, routeContext);
            const filePath = path.join(this.opts.appDir, "src", "app", segment, "route.ts");
            writeFile(filePath, content);
            result.filesWritten.push(filePath);
        }

        // ── Views → Next.js pages ─────────────────────
        for (const view of config.views) {
            const content = generateNextPage(view);
            const viewPath = view.path ?? `/${view.name.toLowerCase()}`;
            const segment = viewPath.replace(/^\//, "");
            const filePath = path.join(this.opts.appDir, "src", "app", segment, "page.tsx");
            writeFile(filePath, content);
            result.filesWritten.push(filePath);
        }

        return result;
    }
}
