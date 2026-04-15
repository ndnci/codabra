import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/create/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    noExternal: ["@codabra/core", "@codabra/providers"],
});
