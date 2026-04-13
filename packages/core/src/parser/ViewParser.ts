import type { ViewDefinition, ViewComponent } from "../types";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function indent(level: number): string {
    return "  ".repeat(level);
}

/**
 * Normalises a model ref to PascalCase.
 * "users" → "Users", "User" → "User"
 */
function capitaliseModelRef(name: string): string {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// ─────────────────────────────────────────────
// JSX generation helpers
// ─────────────────────────────────────────────

/**
 * Maps a ViewComponent tree into JSX string recursively.
 */
function componentToJsx(comp: ViewComponent, level: number): string {
    const pad = indent(level);

    switch (comp.type) {
        case "form": {
            const inner = (comp.fields ?? []).map((f) => componentToJsx(f, level + 1)).join("\n");
            return `${pad}<form>\n${inner}\n${pad}</form>`;
        }

        case "input": {
            const placeholder = comp.label ? ` placeholder="${comp.label}"` : "";
            const id = comp.id ? ` id="${comp.id}" name="${comp.id}"` : "";
            return `${pad}<input type="text"${id}${placeholder} />`;
        }

        case "email": {
            const placeholder = comp.label ? ` placeholder="${comp.label}"` : "";
            const id = comp.id ? ` id="${comp.id}" name="${comp.id}"` : "";
            return `${pad}<input type="email"${id}${placeholder} />`;
        }

        case "password": {
            const placeholder = comp.label ? ` placeholder="${comp.label}"` : "";
            const id = comp.id ? ` id="${comp.id}" name="${comp.id}"` : "";
            return `${pad}<input type="password"${id}${placeholder} />`;
        }

        case "button": {
            const label = comp.label ?? "Submit";
            return `${pad}<button type="submit">${label}</button>`;
        }

        case "text": {
            return `${pad}<p>${comp.label ?? ""}</p>`;
        }

        case "heading": {
            return `${pad}<h1>${comp.label ?? ""}</h1>`;
        }

        case "container": {
            const inner = (comp.children ?? []).map((c) => componentToJsx(c, level + 1)).join("\n");
            return `${pad}<div>\n${inner}\n${pad}</div>`;
        }

        case "list": {
            const modelRef = capitaliseModelRef(comp.model ?? "items");
            return [
                `${pad}{/* Render list of ${modelRef} */}`,
                `${pad}<ul>`,
                `${pad}  {${modelRef}.map((item, i) => (`,
                `${pad}    <li key={String(item['id'] ?? i)}>{JSON.stringify(item)}</li>`,
                `${pad}  ))}`,
                `${pad}</ul>`,
            ].join("\n");
        }

        case "table": {
            const modelRef = capitaliseModelRef(comp.model ?? "items");
            return [
                `${pad}{/* Render table of ${modelRef} */}`,
                `${pad}<table>`,
                `${pad}  <tbody>`,
                `${pad}    {${modelRef}.map((item, i) => (`,
                `${pad}      <tr key={String(item['id'] ?? i)}><td>{JSON.stringify(item)}</td></tr>`,
                `${pad}    ))}`,
                `${pad}  </tbody>`,
                `${pad}</table>`,
            ].join("\n");
        }

        case "select": {
            const id = comp.id ? ` id="${comp.id}" name="${comp.id}"` : "";
            return `${pad}<select${id}></select>`;
        }

        case "card": {
            const inner = (comp.children ?? comp.fields ?? []).map((c) => componentToJsx(c, level + 1)).join("\n");
            return `${pad}<div className="card">\n${inner}\n${pad}</div>`;
        }

        case "flex": {
            const p = (comp.props ?? {}) as Record<string, unknown>;
            const direction = (p.direction as string | undefined) ?? "row";
            const alignItems = (p.alignItems as string | undefined) ?? "stretch";
            const justifyContent = (p.justifyContent as string | undefined) ?? "flex-start";
            const rawGap = p.gap;
            const gap = rawGap === undefined ? "0" : typeof rawGap === "number" ? `${rawGap}px` : String(rawGap);
            const inner = (comp.children ?? comp.fields ?? []).map((c) => componentToJsx(c, level + 1)).join("\n");
            return (
                `${pad}<div style={{ display: 'flex', flexDirection: '${direction}', alignItems: '${alignItems}', justifyContent: '${justifyContent}', gap: '${gap}' }}>\n` +
                inner +
                `\n${pad}</div>`
            );
        }

        default:
            return `${pad}{/* Unknown component type: ${comp.type} */}`;
    }
}

/**
 * Collects all model variable names referenced (list/table components).
 * Auto-capitalises to PascalCase.
 */
function collectModelRefs(comp: ViewComponent): Set<string> {
    const refs = new Set<string>();
    if ((comp.type === "list" || comp.type === "table") && comp.model) {
        refs.add(capitaliseModelRef(comp.model));
    }
    for (const child of [...(comp.fields ?? []), ...(comp.children ?? [])]) {
        for (const r of collectModelRefs(child)) refs.add(r);
    }
    return refs;
}

/**
 * Generates a Next.js page component for a ViewDefinition.
 */
export function generateNextPage(view: ViewDefinition): string {
    const componentName = view.name.replace(/[^a-zA-Z0-9]/g, "");
    const jsxBody = componentToJsx(view.root, 1);
    const modelRefs = collectModelRefs(view.root);

    // Emit placeholder declarations for any model arrays referenced in the component
    const placeholders = [...modelRefs]
        .map((ref) => `  // TODO: replace with real data fetching\n  const ${ref}: Record<string, unknown>[] = [];`)
        .join("\n");

    return [
        `// Auto-generated by Codabra — do not edit manually`,
        `import React from 'react';`,
        ``,
        `export default function ${componentName}(): React.JSX.Element {`,
        ...(placeholders ? [placeholders] : []),
        `  return (`,
        jsxBody,
        `  );`,
        `}`,
        ``,
    ].join("\n");
}
