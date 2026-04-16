import type { ModelDefinition } from "../types";

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
