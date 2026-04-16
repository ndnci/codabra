import * as fs from "fs";
import * as path from "path";
import type { ConfigLoader } from "./ConfigLoader";
import type {
    ConfigSet,
    ModelDefinition,
    RouteDefinition,
    ViewDefinition,
    FunctionDefinition,
    EventDefinition,
    VoterDefinition,
} from "../types";

/**
 * Recursively reads all *.json files inside a directory.
 * Returns an array of parsed objects with their file paths for error reporting.
 */
function readJsonFiles(dir: string): Array<{ filePath: string; data: unknown }> {
    if (!fs.existsSync(dir)) return [];

    const results: Array<{ filePath: string; data: unknown }> = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...readJsonFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".json")) {
            const raw = fs.readFileSync(fullPath, "utf-8");
            try {
                const data = JSON.parse(raw) as unknown;
                results.push({ filePath: fullPath, data });
            } catch (err) {
                throw new Error(`Failed to parse JSON at ${fullPath}: ${String(err)}`);
            }
        }
    }

    return results;
}

/**
 * Normalises items that may be a single object or an array of objects.
 */
function toArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    return [data as T];
}

/**
 * JSON implementation of ConfigLoader.
 * Reads the conventional sub-folders under /config:
 *   models/, routes/, views/, functions/, events/, voters/
 */
export class JSONLoader implements ConfigLoader {
    async load(configDir: string): Promise<ConfigSet> {
        const models: ModelDefinition[] = [];
        const routes: RouteDefinition[] = [];
        const views: ViewDefinition[] = [];
        const functions: FunctionDefinition[] = [];
        const events: EventDefinition[] = [];
        const voters: VoterDefinition[] = [];

        const modelsDir = path.join(configDir, "models");
        for (const { data } of readJsonFiles(modelsDir)) {
            models.push(...toArray<ModelDefinition>(data));
        }

        const routesDir = path.join(configDir, "routes");
        for (const { data } of readJsonFiles(routesDir)) {
            const d = data as Record<string, unknown>;
            if (Array.isArray(d.routes)) {
                routes.push(...(d.routes as RouteDefinition[]));
            } else {
                routes.push(...toArray<RouteDefinition>(data));
            }
        }

        const viewsDir = path.join(configDir, "views");
        for (const { data } of readJsonFiles(viewsDir)) {
            views.push(...toArray<ViewDefinition>(data));
        }

        const functionsDir = path.join(configDir, "functions");
        for (const { data } of readJsonFiles(functionsDir)) {
            functions.push(...toArray<FunctionDefinition>(data));
        }

        const eventsDir = path.join(configDir, "events");
        for (const { data } of readJsonFiles(eventsDir)) {
            events.push(...toArray<EventDefinition>(data));
        }

        const votersDir = path.join(configDir, "voters");
        for (const { data } of readJsonFiles(votersDir)) {
            voters.push(...toArray<VoterDefinition>(data));
        }

        return { models, routes, views, functions, events, voters };
    }
}
