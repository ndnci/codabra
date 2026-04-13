// ─────────────────────────────────────────────
// Field / Model types
// ─────────────────────────────────────────────

/**
 * Primitive field types understood by Codabra.
 * Anything else is treated as a relation (model name).
 */
export type PrimitiveFieldType =
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "date_now" // DateTime with @default(now())
    | "uuid"; // String with @default(uuid())

export type FieldType = PrimitiveFieldType | string; // string fallback = relation

export interface RelationDef {
    model: string;
    type: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface ModelField {
    type: FieldType;
    required?: boolean;
    default?: string | number | boolean;
    unique?: boolean;
    relation?: RelationDef;
}

/** Shorthand: field value can be just a type string or a full ModelField object. */
export type FieldShorthand = FieldType | ModelField;

export interface ModelDefinition {
    name: string;
    /** id field is always implicit (UUID) */
    fields: Record<string, FieldShorthand>;
}

// ─────────────────────────────────────────────
// Route types
// ─────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ValidationRule {
    rule: "notEmpty" | "isEmail" | "minLength" | "maxLength" | "isUUID" | string;
    value?: string | number;
    message?: string;
}

export interface RouteParam {
    type: string;
    required?: boolean;
    validation?: Array<string | ValidationRule>;
}

export type ParamShorthand = string | RouteParam;

export interface RouteDefinition {
    method: HttpMethod;
    path: string;
    /** URL path params e.g. { id: "uuid" } */
    params?: Record<string, ParamShorthand>;
    /** Request body (for POST/PUT/PATCH) */
    body?: Record<string, ParamShorthand>;
    /** Expected response model name or primitive */
    response?: string;
    /** Redirect to another route path */
    redirect?: string;
    /** Function to call */
    function?: string;
    /** Require authentication */
    auth?: boolean;
    /** Voter to check authorization */
    voter?: string;
}

// ─────────────────────────────────────────────
// View types
// ─────────────────────────────────────────────

export type ViewComponentType =
    | "form"
    | "list"
    | "card"
    | "table"
    | "input"
    | "email"
    | "password"
    | "select"
    | "button"
    | "text"
    | "container"
    | "heading"
    | "flex";

/**
 * Props specific to the `flex` component type.
 * Pass these inside the shared `props` field:
 * `{ "type": "flex", "props": { "direction": "row", "gap": 16 } }`
 */
export interface FlexProps {
    direction?: "row" | "row-reverse" | "column" | "column-reverse";
    alignItems?: "flex-start" | "flex-end" | "center" | "baseline" | "stretch";
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
    gap?: number | string;
}

export interface ViewComponent {
    type: ViewComponentType;
    id?: string;
    label?: string;
    /** Bind to a model (for list/table/card) */
    model?: string;
    /** Bind to a route */
    route?: string;
    /** Nested fields (form inputs, etc.) */
    fields?: ViewComponent[];
    /** Child components (container, card, flex, etc.) */
    children?: ViewComponent[];
    /**
     * Component-type-specific props.
     * For `flex`: see `FlexProps` (direction, alignItems, justifyContent, gap).
     * For other types: arbitrary extra HTML / component attributes.
     */
    props?: Record<string, unknown>;
}

export interface ViewDefinition {
    name: string;
    /** URL path this view is rendered at */
    path?: string;
    root: ViewComponent;
}

// ─────────────────────────────────────────────
// Function types
// ─────────────────────────────────────────────

export type FunctionStepType = "create" | "update" | "delete" | "query" | "condition" | "return" | "call";

export interface FunctionStep {
    type: FunctionStepType;
    model?: string;
    data?: Record<string, unknown>;
    where?: Record<string, unknown>;
    condition?: string;
    then?: FunctionStep[];
    else?: FunctionStep[];
    function?: string;
    value?: unknown;
}

export interface FunctionParam {
    type: string;
    required?: boolean;
}

export interface FunctionDefinition {
    name: string;
    params?: Record<string, string | FunctionParam>;
    steps: FunctionStep[];
}

// ─────────────────────────────────────────────
// Event types
// ─────────────────────────────────────────────

export interface EventDefinition {
    name: string;
    /** Trigger name e.g. "onUserCreated" */
    trigger: string;
    /** Function to invoke */
    function: string;
}

// ─────────────────────────────────────────────
// Voter (authorization) types
// ─────────────────────────────────────────────

export interface VoterCondition {
    field?: string;
    operator?: "==" | "!=" | ">" | "<" | ">=" | "<=";
    value?: unknown;
    /** True when the user is the owner of the resource */
    self?: boolean;
}

export interface VoterRule {
    methods: HttpMethod[];
    resource: string;
    condition?: VoterCondition;
}

export interface VoterDefinition {
    name: string;
    rules: VoterRule[];
}

// ─────────────────────────────────────────────
// Aggregate config set
// ─────────────────────────────────────────────

export interface ConfigSet {
    models: ModelDefinition[];
    routes: RouteDefinition[];
    views: ViewDefinition[];
    functions: FunctionDefinition[];
    events: EventDefinition[];
    voters: VoterDefinition[];
}
