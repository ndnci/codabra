import type { ModelDefinition } from "../types";

/**
 * Builds a project-scoped route schema with the current model names embedded as an enum.
 * Written to `.codabra/schemas/route.schema.json` on every `codabra generate` run.
 */
export function buildDynamicRouteSchema(models: ModelDefinition[]): object {
    const names = models.map((m) => m.name);
    const arrayPatterns = names.map((n) => `${n}[]`);
    const allResponseValues = [...names, ...arrayPatterns];

    return {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "codabra://dynamic/route.schema.json",
        title: "Codabra Route Definitions",
        description: "Defines API routes in Codabra.",
        oneOf: [
            {
                type: "array",
                items: { $ref: "#/definitions/RouteDefinition" },
                description: "Array of route definitions.",
            },
            {
                type: "object",
                properties: {
                    $schema: { type: "string" },
                    routes: {
                        type: "array",
                        items: { $ref: "#/definitions/RouteDefinition" },
                    },
                },
                required: ["routes"],
                additionalProperties: false,
            },
        ],
        definitions: {
            HttpMethod: {
                type: "string",
                enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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
            RouteParam: {
                oneOf: [
                    { type: "string", description: "Shorthand type (e.g. 'string', 'uuid')." },
                    {
                        type: "object",
                        required: ["type"],
                        additionalProperties: false,
                        properties: {
                            type: { type: "string" },
                            required: { type: "boolean", default: true },
                            validation: { type: "array", items: { $ref: "#/definitions/ValidationRule" } },
                        },
                    },
                ],
            },
            RouteDefinition: {
                type: "object",
                required: ["method", "path"],
                additionalProperties: false,
                properties: {
                    method: { $ref: "#/definitions/HttpMethod" },
                    path: { type: "string", pattern: "^/" },
                    params: {
                        type: "object",
                        additionalProperties: { $ref: "#/definitions/RouteParam" },
                    },
                    body: {
                        type: "object",
                        additionalProperties: { $ref: "#/definitions/RouteParam" },
                    },
                    // If we have model names, enumerate them; otherwise fall back to plain string.
                    response: allResponseValues.length
                        ? {
                              type: "string",
                              enum: allResponseValues,
                              description: "Expected response model. Use 'Model[]' for arrays.",
                          }
                        : {
                              type: "string",
                              description: "Model name or 'Model[]' for the expected response.",
                          },
                    redirect: { type: "string" },
                    function: { type: "string" },
                    auth: { type: "boolean", default: false },
                    voter: { type: "string" },
                },
            },
        },
    };
}

/**
 * Builds a project-scoped model schema with the current model names as an enum
 * for relation targets, so VS Code autocompletes `"model": "Category"`.
 */
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
                    // Key improvement: model is now an enum of known model names.
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

/**
 * Builds a project-scoped view schema with the current model names as an enum
 * for the `model` field on list/table/card components.
 */
export function buildDynamicViewSchema(models: ModelDefinition[]): object {
    const names = models.map((m) => m.name);

    const modelProp =
        names.length > 0
            ? {
                  type: "string",
                  enum: names,
                  description: "Model name to bind this component to. Used with list/table/card.",
              }
            : {
                  type: "string",
                  pattern: "^[A-Za-z][a-zA-Z0-9]*$",
                  description: "Model name to bind this component to (PascalCase). Used with list/table/card.",
              };

    return {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: "codabra://dynamic/view.schema.json",
        title: "Codabra View Definition",
        description: "Defines a declarative UI view in Codabra.",
        type: "object",
        required: ["name", "root"],
        additionalProperties: false,
        properties: {
            $schema: { type: "string" },
            name: {
                type: "string",
                description: "View name in PascalCase.",
                pattern: "^[A-Z][a-zA-Z0-9]*$",
            },
            path: {
                type: "string",
                description: "URL path for this view (e.g. '/login').",
                pattern: "^/",
            },
            root: { $ref: "#/definitions/ViewComponent" },
        },
        definitions: {
            ViewComponent: {
                type: "object",
                required: ["type"],
                additionalProperties: true,
                properties: {
                    type: {
                        type: "string",
                        enum: [
                            "form",
                            "list",
                            "card",
                            "table",
                            "input",
                            "email",
                            "password",
                            "select",
                            "button",
                            "text",
                            "container",
                            "heading",
                            "flex",
                        ],
                    },
                    id: { type: "string" },
                    label: { type: "string" },
                    // Key improvement: model is now an enum of known model names.
                    model: modelProp,
                    route: { type: "string" },
                    fields: {
                        type: "array",
                        items: { $ref: "#/definitions/ViewComponent" },
                    },
                    children: {
                        type: "array",
                        items: { $ref: "#/definitions/ViewComponent" },
                    },
                    props: {
                        type: "object",
                        description:
                            "Component-type-specific props. For 'flex': direction, alignItems, justifyContent, gap.",
                        additionalProperties: true,
                    },
                },
                if: {
                    properties: { type: { const: "flex" } },
                    required: ["type"],
                },
                then: {
                    properties: {
                        props: {
                            type: "object",
                            description: "Flex layout props.",
                            additionalProperties: false,
                            properties: {
                                direction: {
                                    type: "string",
                                    enum: ["row", "row-reverse", "column", "column-reverse"],
                                    default: "row",
                                },
                                alignItems: {
                                    type: "string",
                                    enum: ["flex-start", "flex-end", "center", "baseline", "stretch"],
                                    default: "stretch",
                                },
                                justifyContent: {
                                    type: "string",
                                    enum: [
                                        "flex-start",
                                        "flex-end",
                                        "center",
                                        "space-between",
                                        "space-around",
                                        "space-evenly",
                                    ],
                                    default: "flex-start",
                                },
                                gap: {
                                    oneOf: [{ type: "number" }, { type: "string" }],
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}
