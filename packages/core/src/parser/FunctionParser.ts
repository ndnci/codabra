import type { FunctionDefinition, FunctionStep, FunctionParam } from "../types";
import type { OrmAdapter } from "../orm";
import { getOrmAdapter } from "../orm";

// ─────────────────────────────────────────────
// Reference resolution
// ─────────────────────────────────────────────

/**
 * Resolves a step value reference to its TypeScript expression.
 *  "$email"  → "params.email"
 *  "$result" → "result"
 *  "hello"   → '"hello"'
 *  42        → "42"
 */
function resolveRef(val: unknown): string {
    if (typeof val !== "string") return JSON.stringify(val);
    if (val === "$result") return "result";
    if (val.startsWith("$")) return `params.${val.slice(1)}`;
    return JSON.stringify(val);
}

/**
 * Converts a model name to the ORM accessor (camelCase for Prisma compat).
 * "User" → "User" (PascalCase passed to OrmAdapter methods)
 */
function toModelName(model: string): string {
    return model.charAt(0).toUpperCase() + model.slice(1);
}

/**
 * Generates an object literal string from a data/where map,
 * resolving all `$ref` values.
 */
function buildObjectLiteral(obj: Record<string, unknown>): string {
    const entries = Object.entries(obj)
        .map(([k, v]) => `${k}: ${resolveRef(v)}`)
        .join(", ");
    return `{ ${entries} }`;
}

// ─────────────────────────────────────────────
// Step generation
// ─────────────────────────────────────────────

function generateStep(step: FunctionStep, indentLevel: number, orm: OrmAdapter): string[] {
    const pad = "  ".repeat(indentLevel);
    const lines: string[] = [];

    switch (step.type) {
        case "create": {
            const modelName = toModelName(step.model ?? "Unknown");
            const data = step.data ? buildObjectLiteral(step.data) : "{}";
            lines.push(`${pad}result = ${orm.fnCreate(modelName, data)};`);
            break;
        }

        case "update": {
            const modelName = toModelName(step.model ?? "Unknown");
            const where = step.where ? buildObjectLiteral(step.where) : "{}";
            const data = step.data ? buildObjectLiteral(step.data) : "{}";
            lines.push(`${pad}result = ${orm.fnUpdate(modelName, where, data)};`);
            break;
        }

        case "delete": {
            const modelName = toModelName(step.model ?? "Unknown");
            const where = step.where ? buildObjectLiteral(step.where) : "{}";
            lines.push(`${pad}result = ${orm.fnDelete(modelName, where)};`);
            break;
        }

        case "query": {
            const modelName = toModelName(step.model ?? "Unknown");
            if (step.where) {
                const where = buildObjectLiteral(step.where);
                lines.push(`${pad}result = ${orm.fnFindMany(modelName, where)};`);
            } else {
                lines.push(`${pad}result = ${orm.fnFindMany(modelName)};`);
            }
            break;
        }

        case "condition": {
            // Resolve $ref tokens in the condition expression
            const condExpr = (step.condition ?? "true").replace(/\$(\w+)/g, (_, name) =>
                name === "result" ? "result" : `params.${name}`,
            );
            lines.push(`${pad}if (${condExpr}) {`);
            for (const thenStep of step.then ?? []) {
                lines.push(...generateStep(thenStep, indentLevel + 1, orm));
            }
            if (step.else && step.else.length > 0) {
                lines.push(`${pad}} else {`);
                for (const elseStep of step.else) {
                    lines.push(...generateStep(elseStep, indentLevel + 1, orm));
                }
            }
            lines.push(`${pad}}`);
            break;
        }

        case "return": {
            lines.push(`${pad}return ${resolveRef(step.value)};`);
            break;
        }

        case "call": {
            const fnName = step.function ?? "unknown";
            lines.push(`${pad}result = await ${fnName}(params);`);
            break;
        }

        default:
            lines.push(`${pad}// Unknown step type: ${(step as FunctionStep).type}`);
    }

    return lines;
}

// ─────────────────────────────────────────────
// Parameter type generation
// ─────────────────────────────────────────────

function buildParamType(params: Record<string, string | FunctionParam> | undefined): string {
    if (!params || Object.keys(params).length === 0) return "Record<string, unknown>";
    const entries = Object.entries(params).map(([name, raw]) => {
        const type = typeof raw === "string" ? raw : ((raw as FunctionParam).type ?? "unknown");
        const required = typeof raw === "string" ? true : (raw as FunctionParam).required !== false;
        return `${name}${required ? "" : "?"}: ${type}`;
    });
    return `{ ${entries.join("; ")} }`;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Generates the content of a TypeScript function file for a FunctionDefinition.
 * Emitted to: src/lib/functions/<Name>.ts
 */
export function generateFunctionFile(fn: FunctionDefinition, orm?: OrmAdapter): string {
    const resolvedOrm = orm ?? getOrmAdapter("drizzle");
    const paramType = buildParamType(fn.params);

    const bodyLines: string[] = [];
    bodyLines.push(`  let result: unknown;`);
    bodyLines.push(``);
    for (const step of fn.steps) {
        bodyLines.push(...generateStep(step, 1, resolvedOrm));
    }

    const importLines = resolvedOrm.getFunctionImports().join("\n");

    return [
        `// Auto-generated by Codabra — do not edit manually`,
        importLines,
        ``,
        `export async function ${fn.name}(params: ${paramType}): Promise<unknown> {`,
        ...bodyLines,
        `}`,
        ``,
    ].join("\n");
}
