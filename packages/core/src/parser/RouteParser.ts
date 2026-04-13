import type {
    RouteDefinition,
    HttpMethod,
    ModelDefinition,
    FunctionDefinition,
    EventDefinition,
    VoterDefinition,
    RouteParam,
    ParamShorthand,
} from "../types";
import { findMatchingEvents, methodToAction } from "./EventParser";
import type { OrmAdapter } from "../orm";
import { getOrmAdapter } from "../orm";

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

export interface RouteGenContext {
    models: ModelDefinition[];
    functions: FunctionDefinition[];
    events: EventDefinition[];
    voters: VoterDefinition[];
    /** ORM adapter to use for query generation. Defaults to Drizzle. */
    orm?: OrmAdapter;
}

function resolveOrm(context: RouteGenContext): OrmAdapter {
    return context.orm ?? getOrmAdapter("drizzle");
}

const EMPTY_CONTEXT: RouteGenContext = { models: [], functions: [], events: [], voters: [] };

// ─────────────────────────────────────────────
// Path helpers
// ─────────────────────────────────────────────

/**
 * Converts a route path like /api/users/:id into a Next.js App Router segment.
 * e.g. /api/users/:id → src/app/api/users/[id]/route.ts
 */
export function routePathToFileSegment(routePath: string): string {
    return routePath
        .split("/")
        .filter(Boolean)
        .map((segment) => (segment.startsWith(":") ? `[${segment.slice(1)}]` : segment))
        .join("/");
}

/**
 * Groups routes by their file path segment.
 * Routes sharing the same path are placed in the same route.ts file.
 */
export function groupRoutesByPath(routes: RouteDefinition[]): Map<string, RouteDefinition[]> {
    const map = new Map<string, RouteDefinition[]>();

    for (const route of routes) {
        const segment = routePathToFileSegment(route.path);
        const existing = map.get(segment) ?? [];
        existing.push(route);
        map.set(segment, existing);
    }

    return map;
}

// ─────────────────────────────────────────────
// Model helpers
// ─────────────────────────────────────────────

/**
 * Extracts the PascalCase model name from a response string.
 * "User[]" → "User", "Article" → "Article", undefined → null
 */
function modelNameFromResponse(response: string | undefined): string | null {
    if (!response) return null;
    return response.replace(/\[\]$/, "").trim() || null;
}

/**
 * Returns true when the route returns a collection (response ends with []).
 */
function isCollectionResponse(response: string | undefined): boolean {
    return !!response?.endsWith("[]");
}

// ─────────────────────────────────────────────
// Param normalisation
// ─────────────────────────────────────────────

function normaliseParam(raw: ParamShorthand): RouteParam {
    if (typeof raw === "string") return { type: raw };
    return raw;
}

/**
 * Generates a type-safe body field expression so ORM adapters receive properly
 * typed values instead of `unknown` from `Record<string, unknown>`.
 *   string/uuid  → `body.field as string`
 *   number       → `Number(body.field)`
 *   boolean      → `Boolean(body.field)`
 *   date/date_now→ `body.field as string` (stored as ISO string or epoch)
 */
function typedBodyField(fieldName: string, rawParam: ParamShorthand): string {
    const param = normaliseParam(rawParam);
    if (param.type === "number") return `${fieldName}: Number(body.${fieldName})`;
    if (param.type === "boolean") return `${fieldName}: Boolean(body.${fieldName})`;
    return `${fieldName}: body.${fieldName} as string`;
}

// ─────────────────────────────────────────────
// Validation block generation
// ─────────────────────────────────────────────

function generateValidationLines(body: Record<string, ParamShorthand> | undefined): string[] {
    if (!body) return [];
    const lines: string[] = [];

    for (const [fieldName, rawParam] of Object.entries(body)) {
        const param = normaliseParam(rawParam);
        const rules = param.validation ?? [];

        for (const rule of rules) {
            const ruleName = typeof rule === "string" ? rule : rule.rule;
            const ruleValue = typeof rule === "string" ? undefined : rule.value;
            const fieldExpr = `body.${fieldName}`;

            switch (ruleName) {
                case "notEmpty":
                    lines.push(
                        `  if (!${fieldExpr} || String(${fieldExpr}).trim() === '') {`,
                        `    return NextResponse.json({ error: '${fieldName} is required' }, { status: 400 });`,
                        `  }`,
                    );
                    break;
                case "isEmail":
                    lines.push(
                        `  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(${fieldExpr}))) {`,
                        `    return NextResponse.json({ error: '${fieldName} must be a valid email' }, { status: 400 });`,
                        `  }`,
                    );
                    break;
                case "isUUID":
                    lines.push(
                        `  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(${fieldExpr}))) {`,
                        `    return NextResponse.json({ error: '${fieldName} must be a valid UUID' }, { status: 400 });`,
                        `  }`,
                    );
                    break;
                case "minLength":
                    if (ruleValue !== undefined) {
                        lines.push(
                            `  if (String(${fieldExpr}).length < ${ruleValue}) {`,
                            `    return NextResponse.json({ error: '${fieldName} must be at least ${ruleValue} characters' }, { status: 400 });`,
                            `  }`,
                        );
                    }
                    break;
                case "maxLength":
                    if (ruleValue !== undefined) {
                        lines.push(
                            `  if (String(${fieldExpr}).length > ${ruleValue}) {`,
                            `    return NextResponse.json({ error: '${fieldName} must be at most ${ruleValue} characters' }, { status: 400 });`,
                            `  }`,
                        );
                    }
                    break;
            }
        }
    }

    return lines;
}

// ─────────────────────────────────────────────
// Import helpers
// ─────────────────────────────────────────────

/**
 * Converts a function name to its camelCase import alias.
 * "CreateUser" → "createUser"
 */
function fnImportAlias(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
}

// ─────────────────────────────────────────────
// Route handler generation
// ─────────────────────────────────────────────

/**
 * Generates a Next.js App Router route.ts file content for a group of routes
 * that share the same path segment.
 */
export function generateNextRouteFile(routes: RouteDefinition[], context: RouteGenContext = EMPTY_CONTEXT): string {
    const orm = resolveOrm(context);
    const path = routes[0]?.path ?? "";
    const dynamicParams = path
        .split("/")
        .filter((s) => s.startsWith(":"))
        .map((s) => s.slice(1));
    const hasDynamic = dynamicParams.length > 0;

    // Collect imports as we build handlers
    const imports = new Set<string>();
    imports.add(`import { NextRequest, NextResponse } from 'next/server';`);

    const handlerBlocks: string[] = [];

    for (const route of routes) {
        const method = route.method as HttpMethod;
        const modelName = modelNameFromResponse(route.response);
        const isCollection = isCollectionResponse(route.response);
        const needsOrm = !!modelName && !route.function;
        const needsAuth = !!route.auth;
        const voterName = route.voter;

        if (needsOrm && modelName) {
            for (const line of orm.getRouteImports(modelName)) {
                imports.add(line);
            }
        }
        if (needsAuth) {
            imports.add(`import { getAuthUser } from '@/lib/auth';`);
        }
        if (voterName) {
            imports.add(`import { check${voterName} } from '@/lib/voters/${voterName}';`);
            if (!needsAuth) {
                imports.add(`import { getAuthUser } from '@/lib/auth';`);
            }
        }

        // Determine event wiring
        const action = methodToAction(method);
        const matchedEvents = action && modelName ? findMatchingEvents(context.events, modelName, action) : [];
        for (const ev of matchedEvents) {
            const alias = fnImportAlias(ev.function);
            imports.add(`import { ${ev.function} as ${alias}Event } from '@/lib/functions/${ev.function}';`);
            if (needsOrm && modelName) {
                for (const line of orm.getRouteImports(modelName)) {
                    imports.add(line);
                }
            }
        }

        // Function import
        if (route.function) {
            const alias = fnImportAlias(route.function);
            imports.add(`import { ${route.function} as ${alias} } from '@/lib/functions/${route.function}';`);
        }

        const lines: string[] = [];

        // Function signature
        const paramArg = hasDynamic
            ? `{ params }: { params: { ${dynamicParams.map((p) => `${p}: string`).join("; ")} } }`
            : "";
        const fnArgs = hasDynamic ? `_req: NextRequest, ${paramArg}` : `_req: NextRequest`;
        lines.push(`export async function ${method}(${fnArgs}) {`);

        // Extract dynamic params
        if (hasDynamic) {
            for (const param of dynamicParams) {
                lines.push(`  const ${param} = params.${param};`);
            }
        }

        // Auth check
        if (needsAuth || voterName) {
            lines.push(`  const userId = getAuthUser(_req);`);
        }
        if (needsAuth) {
            lines.push(`  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`);
        }

        // Redirect
        if (route.redirect) {
            lines.push(`  return NextResponse.redirect(new URL('${route.redirect}', _req.url));`);
            lines.push(`}`);
            lines.push(``);
            handlerBlocks.push(lines.join("\n"));
            continue;
        }

        // Method-specific body
        if (method === "GET") {
            if (hasDynamic && modelName) {
                // Voter check (load resource first)
                if (voterName) {
                    lines.push(`  const resource = ${orm.routeLoadResource(modelName)};`);
                    lines.push(
                        `  if (!check${voterName}(_req, '${method}', resource, userId)) {`,
                        `    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });`,
                        `  }`,
                    );
                }
                // Single item
                lines.push(`  const data = ${orm.routeFindUnique(modelName)};`);
                lines.push(`  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });`);
                lines.push(`  return NextResponse.json(data);`);
            } else if (modelName) {
                // Collection
                if (voterName) {
                    lines.push(
                        `  if (!check${voterName}(_req, '${method}', null, userId)) {`,
                        `    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });`,
                        `  }`,
                    );
                }
                lines.push(`  const data = ${orm.routeFindMany(modelName)};`);
                lines.push(`  return NextResponse.json(data);`);
            } else {
                lines.push(`  return NextResponse.json(${hasDynamic ? "{}" : "[]"});`);
            }
        } else if (method === "POST" || method === "PUT" || method === "PATCH") {
            lines.push(`  const body = await _req.json() as Record<string, unknown>;`);

            // Validation
            const validationLines = generateValidationLines(route.body);
            lines.push(...validationLines);

            if (route.function) {
                const alias = fnImportAlias(route.function);
                lines.push(`  const data = await ${alias}(body);`);
                lines.push(`  return NextResponse.json(data, { status: ${method === "POST" ? 201 : 200} });`);
            } else if (modelName) {
                // Voter check (for PUT/PATCH, load existing resource)
                if (voterName && hasDynamic) {
                    lines.push(`  const existing = ${orm.routeLoadResource(modelName)};`);
                    lines.push(
                        `  if (!check${voterName}(_req, '${method}', existing, userId)) {`,
                        `    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });`,
                        `  }`,
                    );
                } else if (voterName) {
                    lines.push(
                        `  if (!check${voterName}(_req, '${method}', null, userId)) {`,
                        `    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });`,
                        `  }`,
                    );
                }

                if (method === "POST") {
                    const bodyFields = route.body ? Object.keys(route.body) : null;
                    const dataExpr = bodyFields
                        ? `{ ${bodyFields.map((f) => typedBodyField(f, route.body![f])).join(", ")} }`
                        : orm.getCreateBodyTypecast(modelName);
                    lines.push(`  const data = ${orm.routeCreate(modelName, dataExpr)};`);
                    for (const ev of matchedEvents) {
                        const alias = fnImportAlias(ev.function);
                        lines.push(`  await ${alias}Event({ ...data });`);
                    }
                    lines.push(`  return NextResponse.json(data, { status: 201 });`);
                } else {
                    // PUT / PATCH
                    const bodyFields = route.body ? Object.keys(route.body) : null;
                    const dataExpr = bodyFields
                        ? `{ ${bodyFields.map((f) => typedBodyField(f, route.body![f])).join(", ")} }`
                        : orm.getUpdateBodyTypecast(modelName);
                    const whereExpr = hasDynamic ? `{ id }` : `{}`;
                    lines.push(`  const data = ${orm.routeUpdate(modelName, whereExpr, dataExpr)};`);
                    for (const ev of matchedEvents) {
                        const alias = fnImportAlias(ev.function);
                        lines.push(`  await ${alias}Event({ ...data });`);
                    }
                    lines.push(`  return NextResponse.json(data);`);
                }
            } else {
                lines.push(`  return NextResponse.json({ success: true }, { status: 201 });`);
            }
        } else if (method === "DELETE") {
            if (modelName) {
                // Voter check
                if (voterName && hasDynamic) {
                    lines.push(`  const resource = ${orm.routeLoadResource(modelName)};`);
                    lines.push(
                        `  if (!check${voterName}(_req, '${method}', resource, userId)) {`,
                        `    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });`,
                        `  }`,
                    );
                }
                const whereExpr = hasDynamic ? `{ id }` : `{}`;
                lines.push(`  const data = ${orm.routeDelete(modelName, whereExpr)};`);
                for (const ev of matchedEvents) {
                    const alias = fnImportAlias(ev.function);
                    lines.push(`  await ${alias}Event({ ...data });`);
                }
                lines.push(`  return NextResponse.json({ success: true });`);
            } else {
                lines.push(`  return NextResponse.json({ success: true });`);
            }
        }

        lines.push(`}`);
        lines.push(``);
        handlerBlocks.push(lines.join("\n"));
    }

    // Assemble file: imports first, then handlers
    const importLines = [...imports].join("\n");
    return [importLines, ``, ...handlerBlocks].join("\n");
}
