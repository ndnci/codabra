// Types
export type {
    ConfigSet,
    ModelDefinition,
    ModelField,
    FieldType,
    FieldShorthand,
    PrimitiveFieldType,
    RelationDef,
    RouteDefinition,
    RouteParam,
    ParamShorthand,
    HttpMethod,
    ValidationRule,
    ViewDefinition,
    ViewComponent,
    ViewComponentType,
    FlexProps,
    FunctionDefinition,
    FunctionStep,
    FunctionParam,
    EventDefinition,
    VoterDefinition,
    VoterRule,
    VoterCondition,
} from "./types";

// Loader
export type { ConfigLoader } from "./loader/ConfigLoader";
export { JSONLoader } from "./loader/JSONLoader";

// Validators
export { validateModels } from "./validator/ModelValidator";
export type { ModelValidationError } from "./validator/ModelValidator";
export { validateRoutes } from "./validator/RouteValidator";
export type { RouteValidationError } from "./validator/RouteValidator";

// Parsers / generators
export { normaliseField, isPrimitive } from "./validator/ModelValidator";
export { generateModelInterface } from "./parser/ModelParser";
export { routePathToFileSegment, groupRoutesByPath, generateNextRouteFile } from "./parser/RouteParser";
export type { RouteGenContext } from "./parser/RouteParser";
export { generateNextPage } from "./parser/ViewParser";
export { generateFunctionFile } from "./parser/FunctionParser";
export { generateVoterFile, generateAuthFile } from "./parser/VoterParser";
export { parseTrigger, findMatchingEvents, methodToAction } from "./parser/EventParser";
export type { EventAction } from "./parser/EventParser";

// ORM abstraction
export type { OrmAdapter, OrmRegistryEntry } from "./orm";
export { ormRegistry, getOrmAdapter } from "./orm";
// ORM adapters (for advanced use / testing)
export { PrismaAdapter, generatePrismaSchema, generatePrismaModel } from "./orm/prisma";
export { DrizzleAdapter } from "./orm/drizzle";

// Compiler
export { Compiler } from "./compiler/Compiler";
export type { CompilerOptions, CompilerResult } from "./compiler/Compiler";

// Dynamic schema generators (written to .codabra/schemas/ on each generate run)
export { buildDynamicRouteSchema, buildDynamicModelSchema, buildDynamicViewSchema } from "./schemas/generator";
