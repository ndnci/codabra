import type { OrmAdapter } from "../index";
import type { ModelDefinition, FieldShorthand, ModelField, RelationDef } from "../../types";
import { normaliseField, isPrimitive } from "../../validator/ModelValidator";

// ─────────────────────────────────────────────
// Type maps
// ─────────────────────────────────────────────

const PRISMA_TYPE_MAP: Record<string, string> = {
    string: "String",
    number: "Int",
    boolean: "Boolean",
    date: "DateTime",
    date_now: "DateTime",
    uuid: "String",
};

// ─────────────────────────────────────────────
// Schema generation helpers
// ─────────────────────────────────────────────

function toPrismaDefault(rawType: string): string {
    if (rawType === "date_now") return " @default(now())";
    if (rawType === "uuid") return " @default(uuid())";
    return "";
}

function fieldAnnotations(field: ModelField): string {
    const parts: string[] = [];
    if (field.unique) parts.push("@unique");
    return parts.length ? ` ${parts.join(" ")}` : "";
}

interface BackrefEntry {
    sourceModel: string;
    sourceField: string;
    relationType: RelationDef["type"];
    relationName: string;
}

function collectBackrefs(models: ModelDefinition[]): Map<string, BackrefEntry[]> {
    const map = new Map<string, BackrefEntry[]>();

    for (const model of models) {
        for (const [fieldName, rawField] of Object.entries(model.fields)) {
            const field = normaliseField(rawField as FieldShorthand);
            if (!field.relation) continue;

            const target = field.relation.model;
            const entry: BackrefEntry = {
                sourceModel: model.name,
                sourceField: fieldName,
                relationType: field.relation.type,
                relationName: `${model.name}_${fieldName}`,
            };

            const existing = map.get(target) ?? [];
            existing.push(entry);
            map.set(target, existing);
        }
    }

    return map;
}

function declaredFieldNames(model: ModelDefinition): Set<string> {
    return new Set(Object.keys(model.fields));
}

function generatePrismaModel(model: ModelDefinition, backrefs: Map<string, BackrefEntry[]> = new Map()): string {
    const lines: string[] = [`model ${model.name} {`, `  id  String  @id @default(uuid())`];
    const existingFields = declaredFieldNames(model);

    for (const [name, rawField] of Object.entries(model.fields)) {
        const field = normaliseField(rawField as FieldShorthand);

        if (field.relation) {
            const relType = field.relation.type;
            const target = field.type;
            const relName = `${model.name}_${name}`;

            if (relType === "many-to-many") {
                lines.push(`  ${name}  ${target}[]  @relation("${relName}")`);
            } else if (relType === "one-to-many") {
                lines.push(`  ${name}  ${target}[]`);
            } else {
                lines.push(`  ${name}  ${target}?`);
            }
            continue;
        }

        const prismaType = PRISMA_TYPE_MAP[field.type] ?? field.type;
        const optional = field.required === false ? "?" : "";
        const defaultVal = toPrismaDefault(field.type);
        const annotations = fieldAnnotations(field);

        lines.push(`  ${name}  ${prismaType}${optional}${defaultVal}${annotations}`);
    }

    const inboundRefs = backrefs.get(model.name) ?? [];
    for (const ref of inboundRefs) {
        const wouldConflict = [...existingFields].some((fn) => {
            const raw = model.fields[fn];
            if (!raw) return false;
            const f = normaliseField(raw as FieldShorthand);
            return f.type === ref.sourceModel;
        });
        if (wouldConflict) continue;

        const backrefFieldName = ref.sourceModel.charAt(0).toLowerCase() + ref.sourceModel.slice(1);

        if (ref.relationType === "many-to-many") {
            lines.push(`  ${backrefFieldName}s  ${ref.sourceModel}[]  @relation("${ref.relationName}")`);
        } else if (ref.relationType === "one-to-many") {
            const fkField = `${backrefFieldName}Id`;
            lines.push(
                `  ${backrefFieldName}  ${ref.sourceModel}  @relation("${ref.relationName}", fields: [${fkField}], references: [id])`,
            );
            lines.push(`  ${fkField}  String`);
        } else {
            const fkField = `${backrefFieldName}Id`;
            lines.push(
                `  ${backrefFieldName}  ${ref.sourceModel}  @relation("${ref.relationName}", fields: [${fkField}], references: [id])`,
            );
            lines.push(`  ${fkField}  String  @unique`);
        }
    }

    lines.push(`}`);
    return lines.join("\n");
}

// ─────────────────────────────────────────────
// Prisma accessor helper
// ─────────────────────────────────────────────

/** "User" → "user", "ArticleTag" → "articleTag" */
function prismaAccessor(modelName: string): string {
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

// ─────────────────────────────────────────────
// PrismaAdapter
// ─────────────────────────────────────────────

export class PrismaAdapter implements OrmAdapter {
    readonly name = "prisma";
    readonly label = "Prisma (SQLite)";

    getSchemaFilePath(): string {
        return "prisma/schema.prisma";
    }

    getClientFilePath(): string {
        return "src/lib/prisma.ts";
    }

    generateSchemaFile(models: ModelDefinition[]): string {
        const header = [
            `// Auto-generated by Codabra — do not edit manually`,
            ``,
            `generator client {`,
            `  provider = "prisma-client-js"`,
            `}`,
            ``,
            `datasource db {`,
            `  provider = "sqlite"`,
            `  url      = env("DATABASE_URL")`,
            `}`,
            ``,
        ].join("\n");

        const backrefs = collectBackrefs(models);
        const modelBlocks = models.map((m) => generatePrismaModel(m, backrefs)).join("\n\n");
        return header + modelBlocks + "\n";
    }

    generateClientFile(): string {
        return [
            `// Auto-generated by Codabra — do not edit manually`,
            `import { PrismaClient } from '@prisma/client';`,
            ``,
            `const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };`,
            ``,
            `export const prisma =`,
            `    globalForPrisma.prisma ??`,
            `    new PrismaClient({ log: ['error'] });`,
            ``,
            `if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;`,
            ``,
        ].join("\n");
    }

    getRouteImports(_modelName: string): string[] {
        return [`import { prisma } from '@/lib/prisma';`];
    }

    getFunctionImports(): string[] {
        return [`import { prisma } from '../prisma';`];
    }

    routeFindMany(modelName: string): string {
        return `await prisma.${prismaAccessor(modelName)}.findMany()`;
    }

    routeFindUnique(modelName: string): string {
        return `await prisma.${prismaAccessor(modelName)}.findUnique({ where: { id } })`;
    }

    routeCreate(modelName: string, dataExpr: string): string {
        return `await prisma.${prismaAccessor(modelName)}.create({ data: ${dataExpr} })`;
    }

    routeUpdate(modelName: string, whereExpr: string, dataExpr: string): string {
        return `await prisma.${prismaAccessor(modelName)}.update({ where: ${whereExpr}, data: ${dataExpr} })`;
    }

    routeDelete(modelName: string, whereExpr: string): string {
        return `await prisma.${prismaAccessor(modelName)}.delete({ where: ${whereExpr} })`;
    }

    routeLoadResource(modelName: string): string {
        return `await prisma.${prismaAccessor(modelName)}.findUnique({ where: { id } })`;
    }

    getCreateBodyTypecast(modelName: string): string {
        const acc = prismaAccessor(modelName);
        return `body as Parameters<typeof prisma.${acc}.create>[0]['data']`;
    }

    getUpdateBodyTypecast(modelName: string): string {
        const acc = prismaAccessor(modelName);
        return `body as Parameters<typeof prisma.${acc}.update>[0]['data']`;
    }

    fnCreate(modelName: string, dataExpr: string): string {
        return `await prisma.${prismaAccessor(modelName)}.create({ data: ${dataExpr} })`;
    }

    fnUpdate(modelName: string, whereExpr: string, dataExpr: string): string {
        return `await prisma.${prismaAccessor(modelName)}.update({ where: ${whereExpr}, data: ${dataExpr} })`;
    }

    fnDelete(modelName: string, whereExpr: string): string {
        return `await prisma.${prismaAccessor(modelName)}.delete({ where: ${whereExpr} })`;
    }

    fnFindMany(modelName: string, whereExpr?: string): string {
        const acc = prismaAccessor(modelName);
        if (whereExpr) {
            return `await prisma.${acc}.findMany({ where: ${whereExpr} })`;
        }
        return `await prisma.${acc}.findMany()`;
    }

    getDependencies(): Record<string, string> {
        return { "@prisma/client": "^5.0.0" };
    }

    getDevDependencies(): Record<string, string> {
        return { prisma: "^5.0.0" };
    }
}

// Re-export schema generation for backward compat (used by core/index.ts public API)
export { generatePrismaModel, collectBackrefs };

/** Generates the complete Prisma schema — kept as named export for public API */
export function generatePrismaSchema(models: ModelDefinition[]): string {
    return new PrismaAdapter().generateSchemaFile(models);
}

/** Checks if a field type is primitive */
function _isPrimitive(t: string): boolean {
    return isPrimitive(t);
}
void _isPrimitive;
