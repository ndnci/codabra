import type { ProviderRegistryEntry } from "../types";
import { createNextjsProvider } from "./v16";

export const nextjsRegistryEntry: ProviderRegistryEntry = {
    name: "nextjs",
    label: "Next.js 16 (App Router)",
    create() {
        return createNextjsProvider("v16");
    },
};
