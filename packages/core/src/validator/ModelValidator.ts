import type { ModelDefinition, FieldShorthand, ModelField, PrimitiveFieldType } from "../types";

const PRIMITIVE_TYPES: Set<PrimitiveFieldType> = new Set(["string", "number", "boolean", "date", "date_now", "uuid"]);

export interface ModelValidationError {
    model: string;
    field?: string;
    message: string;
}

/**
 * Normalise a field shorthand into a full ModelField object.
 */
export function normaliseField(raw: FieldShorthand): ModelField {
    if (typeof raw === "string") return { type: raw };
    return raw;
}

/**
 * Returns true when a type string refers to a primitive (not a relation).
 */
export function isPrimitive(type: string): type is PrimitiveFieldType {
    return PRIMITIVE_TYPES.has(type as PrimitiveFieldType);
}

/**
 * Validates a list of ModelDefinitions, returning any errors found.
 */
export function validateModels(models: ModelDefinition[]): ModelValidationError[] {
    const errors: ModelValidationError[] = [];
    const names = new Set(models.map((m) => m.name));

    for (const model of models) {
        if (!model.name || typeof model.name !== "string") {
            errors.push({ model: "(unknown)", message: 'Model must have a "name" field.' });
            continue;
        }

        if (!model.fields || typeof model.fields !== "object") {
            errors.push({ model: model.name, message: 'Model must have a "fields" object.' });
            continue;
        }

        for (const [fieldName, rawField] of Object.entries(model.fields)) {
            const field = normaliseField(rawField);

            if (!field.type) {
                errors.push({ model: model.name, field: fieldName, message: 'Field must have a "type".' });
                continue;
            }

            // Unknown relation: references a model that doesn't exist
            if (!isPrimitive(field.type) && !names.has(field.type)) {
                errors.push({
                    model: model.name,
                    field: fieldName,
                    message: `Unknown type or relation "${field.type}". If it's a relation, make sure the model exists.`,
                });
            }
        }
    }

    return errors;
}
