import type { EventDefinition } from "../types";

export type EventAction = "Created" | "Updated" | "Deleted";

const KNOWN_ACTIONS: EventAction[] = ["Created", "Updated", "Deleted"];

/**
 * Parses a trigger name like "onUserCreated" into { model: "User", action: "Created" }.
 * Returns null if the trigger does not match the `on<Model><Action>` pattern.
 *
 * Matching is greedy on the action suffix: we scan from the right so that
 * model names containing action words still parse correctly.
 */
export function parseTrigger(trigger: string): { model: string; action: EventAction } | null {
    if (!trigger.startsWith("on")) return null;
    const body = trigger.slice(2); // strip "on"

    for (const action of KNOWN_ACTIONS) {
        if (body.endsWith(action)) {
            const model = body.slice(0, body.length - action.length);
            if (model.length > 0) {
                return { model, action };
            }
        }
    }
    return null;
}

/**
 * Returns all events whose trigger matches the given model + action pair.
 * Comparison is case-insensitive on the model name.
 */
export function findMatchingEvents(
    events: EventDefinition[],
    model: string,
    action: EventAction,
): EventDefinition[] {
    return events.filter((ev) => {
        const parsed = parseTrigger(ev.trigger);
        if (!parsed) return false;
        return parsed.model.toLowerCase() === model.toLowerCase() && parsed.action === action;
    });
}

/**
 * Maps an HTTP method to the lifecycle action it represents.
 * Returns null for GET (no lifecycle event).
 */
export function methodToAction(method: string): EventAction | null {
    switch (method.toUpperCase()) {
        case "POST":
            return "Created";
        case "PUT":
        case "PATCH":
            return "Updated";
        case "DELETE":
            return "Deleted";
        default:
            return null;
    }
}
