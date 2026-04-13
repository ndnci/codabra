import type { ConfigSet } from "../types";

/**
 * Abstraction over config file formats.
 * New loaders (YAML, TypeScript) implement this interface.
 */
export interface ConfigLoader {
    /**
     * Load and return the full config set from the given directory.
     * @param configDir Absolute path to the /config folder
     */
    load(configDir: string): Promise<ConfigSet>;
}
