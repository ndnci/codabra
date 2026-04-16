import type { ModelDefinition } from "../types";

export function buildDynamicModelSchema(models: ModelDefinition[]): object {
    const names = models.map((m) => m.name);

    const modelNameDef =
        names.length > 0
            ? { type: "string", enum: names, description: "Target model name." }
            : { type: "string", pattern: "^[A-Z][a-zA-Z0-9]*$", description: "Target model name (PascalCase)." };

    return {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "codabra://dynamic/model.schema.json",
        title: "Codabra Model Definition",
        description: "Defines a data model in Codabra.",
        type: "object",
        required: ["name", "fields"],
        additionalProperties: false,
        properties: {
            $schema: { type: "string" },
            name: {
                type: "string",
                description: "Model name in PascalCase.",
                pattern: "^[A-Z][a-zA-Z0-9]*$",
            },
            fields: {
                type: "object",
                description: "Map of field names to their type definitions.",
                additionalProperties: { $ref: "#/definitions/FieldShorthand" },
            },
        },
        definitions: {
            PrimitiveFieldType: {
                type: "string",
                enum: ["string", "number", "boolean", "date", "date_now", "uuid"],
                description: "A primitive Codabra field type.",
            },
            FieldShorthand: {
                oneOf: [{ $ref: "#/definitions/PrimitiveFieldType" }, { $ref: "#/definitions/ModelField" }],
            },
            ValidationRule: {
                oneOf: [
                    { type: "string", enum: ["notEmpty", "isEmail", "isUUID"] },
                    {
                        type: "object",
                        required: ["rule"],
                        properties: {
                            rule: { type: "string", enum: ["notEmpty", "isEmail", "isUUID", "minLength", "maxLength"] },
                            value: { oneOf: [{ type: "string" }, { type: "number" }] },
                            message: { type: "string" },
                        },
                        additionalProperties: false,
                    },
                ],
            },
            RelationDef: {
                type: "object",
                required: ["model", "type"],
                additionalProperties: false,
                properties: {
                    model: modelNameDef,
                    type: {
                        type: "string",
                        enum: ["one-to-one", "one-to-many", "many-to-many"],
                        description: "The relation type.",
                    },
                },
            },
            ModelField: {
                type: "object",
                required: ["type"],
                additionalProperties: false,
                properties: {
                    type: {
                        oneOf: [
                            { $ref: "#/definitions/PrimitiveFieldType" },
                            names.length
                                ? { type: "string", enum: names, description: "Reference to another model." }
                                : {
                                      type: "string",
                                      pattern: "^[A-Z][a-zA-Z0-9]*$",
                                      description: "Reference to another model (PascalCase).",
                                  },
                        ],
                    },
                    required: { type: "boolean", default: true },
                    default: {
                        oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
                    },
                    unique: { type: "boolean", default: false },
                    relation: { $ref: "#/definitions/RelationDef" },
                    validation: {
                        type: "array",
                        items: { $ref: "#/definitions/ValidationRule" },
                    },
                },
            },
        },
    };
}
