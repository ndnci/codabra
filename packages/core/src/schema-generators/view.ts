import type { ModelDefinition } from "../types";

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
