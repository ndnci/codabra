import type { RouteDefinition } from "../types";

export interface RouteValidationError {
    route: string;
    field?: string;
    message: string;
}

const VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

/**
 * Validates a list of RouteDefinitions, returning any errors found.
 */
export function validateRoutes(routes: RouteDefinition[]): RouteValidationError[] {
    const errors: RouteValidationError[] = [];

    for (const route of routes) {
        const label = `${route.method} ${route.path}`;

        if (!route.method || !VALID_METHODS.has(route.method)) {
            errors.push({
                route: label,
                message: `Invalid or missing HTTP method "${route.method}". Must be one of: GET, POST, PUT, PATCH, DELETE.`,
            });
        }

        if (!route.path || typeof route.path !== "string") {
            errors.push({ route: label, message: 'Route must have a "path" string.' });
            continue;
        }

        if (!route.path.startsWith("/")) {
            errors.push({
                route: label,
                message: `Path "${route.path}" must start with "/".`,
            });
        }

        // Body on GET routes is unusual — warn, not error
        if (route.method === "GET" && route.body && Object.keys(route.body).length > 0) {
            errors.push({
                route: label,
                message: "GET routes should not have a request body.",
            });
        }
    }

    return errors;
}
